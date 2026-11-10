# Recupere une photo libre de droits pour chaque lieu d'un voyage.
#
# Usage :  powershell -ExecutionPolicy Bypass -File tools\photos.ps1 -Voyage istanbul
#
# Entree  : images/<voyage>/sources.json  = { "idDuLieu": "Titre de l'article Wikipedia anglais" }
# Sorties : images/<voyage>/<idDuLieu>.jpg (960 px de large)
#           + une ligne "photo" (credit, licence, source) ajoutee au lieu dans trips/<voyage>.json
#
# Regles : on prend l'image principale de l'article (donc une vraie photo du lieu),
# uniquement si elle vient de Wikimedia Commons sous licence libre (CC BY, CC BY-SA, CC0, Art Libre,
# domaine public). Sinon le lieu reste sans photo : on n'en invente pas.
# (Pas d'accents dans ce fichier : PowerShell 5 les lit mal sans BOM.)

param([Parameter(Mandatory = $true)][string]$Voyage)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$racine = Split-Path -Parent $PSScriptRoot
$dossier = Join-Path $racine "images\$Voyage"
$fichierVoyage = Join-Path $racine "trips\$Voyage.json"
$agent = 'CarnetsPhotoFetcher/1.0 (static travel notebook; one-off script)'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$sources = [IO.File]::ReadAllText((Join-Path $dossier 'sources.json'), $utf8) | ConvertFrom-Json
$json = [IO.File]::ReadAllText($fichierVoyage, $utf8)

# Appel d'API poli : une pause avant chaque requete, et on reessaie si le
# serveur repond "trop de requetes" (erreur 429).
function Appeler([string]$url) {
  foreach ($attente in 2, 15, 45) {
    Start-Sleep -Seconds $attente
    try { return Invoke-RestMethod -Uri $url -UserAgent $agent }
    catch { if ($_.Exception.Message -notmatch '429') { throw } }
  }
  throw 'Trop de requetes : relance le script dans quelques minutes.'
}

function Echapper([string]$s) { return $s.Replace('\', '\\').Replace('"', '\"') }

function Nettoyer([string]$html) {
  $t = [regex]::Replace($html, '<[^>]+>', '')
  $t = [Net.WebUtility]::HtmlDecode($t)
  $t = [regex]::Replace($t, '\s+', ' ').Trim()
  if ($t.Length -gt 60) { $t = $t.Substring(0, 60).Trim() + '...' }
  return $t
}

foreach ($entree in $sources.PSObject.Properties) {
  $id = $entree.Name
  $titre = $entree.Value
  $cible = Join-Path $dossier "$id.jpg"
  try {
    # 1. Nom du fichier de l'image principale de l'article
    $u1 = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=' + [Uri]::EscapeDataString($titre)
    $page = (Appeler $u1).query.pages.PSObject.Properties.Value | Select-Object -First 1
    if (-not $page.pageimage) { Write-Host "$id : pas d'image principale pour '$titre'"; continue }

    # 2. Licence, auteur et miniature sur Wikimedia Commons
    $u2 = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=960&titles=' + [Uri]::EscapeDataString('File:' + $page.pageimage)
    $info = ((Appeler $u2).query.pages.PSObject.Properties.Value | Select-Object -First 1).imageinfo
    if (-not $info) { Write-Host "$id : image absente de Commons (probablement non libre)"; continue }
    $info = $info[0]
    $licence = [string]$info.extmetadata.LicenseShortName.value
    if ($licence -notmatch '^(CC BY|CC0|Public domain|PD|FAL)') { Write-Host "$id : licence non retenue ($licence)"; continue }
    if ($info.thumburl -notmatch '\.jpe?g') { Write-Host "$id : pas une photo JPEG ($($info.thumburl))"; continue }
    $auteur = Nettoyer ([string]$info.extmetadata.Artist.value)
    if (-not $auteur) { $auteur = 'Wikimedia Commons' }

    # 3. Telechargement
    if (-not (Test-Path $cible)) {
      Invoke-WebRequest -Uri $info.thumburl -UserAgent $agent -OutFile $cible
      Start-Sleep -Seconds 2
    }

    # 4. Ligne "photo" dans le JSON du voyage (si elle n'y est pas deja)
    $motif = '("id": "' + [regex]::Escape($id) + '",\r?\n)(\s+)("nom")'
    $ligne = '"photo": { "credit": "' + (Echapper $auteur) + '", "licence": "' + (Echapper $licence) + '", "source": "' + (Echapper $info.descriptionurl) + '" },'
    if ($json -match $motif) {
      $json = [regex]::Replace($json, $motif, { param($m) $m.Groups[1].Value + $m.Groups[2].Value + $ligne + "`n" + $m.Groups[2].Value + $m.Groups[3].Value })
    }
    Write-Host "$id : OK  [$licence]  $auteur  <-  $($page.pageimage)"
  } catch {
    Write-Host "$id : ECHEC  $($_.Exception.Message)"
  }
}

[IO.File]::WriteAllText($fichierVoyage, $json, $utf8)
Write-Host 'Termine. Verifie chaque photo a l''oeil avant de publier.'
