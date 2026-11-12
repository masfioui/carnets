# Chiffre les carnets prives et ecrit trips/coffre.json, le seul fichier publie.
#
# Usage :  powershell -ExecutionPolicy Bypass -File tools\chiffrer.ps1
#          (le script demande le code ; il n'est ecrit nulle part)
#
# Entrees : prive/<voyage>.json           le carnet en clair (jamais publie : prive/ est dans .gitignore)
#           prive/images/<voyage>/*.jpg   ses photos
# Sortie  : trips/coffre.json             un bloc illisible par carnet
#
# Comment ca marche :
#  1. le code est transforme en deux cles par PBKDF2 (beaucoup de tours de SHA-256,
#     pour qu'essayer des millions de codes prenne des annees) ;
#  2. le carnet et ses photos sont chiffres en AES-256 avec la premiere cle ;
#  3. la seconde cle signe le resultat (HMAC) : l'appli sait ainsi tout de suite
#     si le code tape est le bon.
# Le dechiffrement est fait par js/coffre.js, dans le telephone.
# A relancer apres chaque modification d'un carnet prive, avec le MEME code.
# (Pas d'accents dans ce fichier : PowerShell 5 les lit mal sans BOM.)

param([string]$Code)

$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$dossier = Join-Path $racine 'prive'
$sortie = Join-Path $racine 'trips\coffre.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$tours = 310000

if (-not $Code) { $Code = Read-Host 'Code du coffre' }
$Code = $Code.Trim()
if ($Code.Length -lt 12) { throw 'Code trop court : au moins 12 caracteres (une phrase de quatre mots par exemple).' }

$hasard = [Security.Cryptography.RandomNumberGenerator]::Create()
function Octets([int]$n) { $o = New-Object byte[] $n; $hasard.GetBytes($o); return ,$o }
function B64([byte[]]$o) { return [Convert]::ToBase64String($o) }

$blocs = @()
$carnets = Get-ChildItem -Path $dossier -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
foreach ($carnet in $carnets) {
  $id = $carnet.BaseName

  # Le contenu chiffre : { "voyage": <le carnet>, "photos": { "idLieu": "data:image/jpeg;base64,..." } }
  # On assemble le texte a la main pour ne pas faire relire le carnet par PowerShell.
  $photos = @()
  $dossierPhotos = Join-Path $dossier "images\$id"
  if (Test-Path $dossierPhotos) {
    foreach ($photo in (Get-ChildItem -Path $dossierPhotos -Filter '*.jpg')) {
      $photos += '"' + $photo.BaseName + '":"data:image/jpeg;base64,' + (B64 ([IO.File]::ReadAllBytes($photo.FullName))) + '"'
    }
  }
  $clair = '{"voyage":' + [IO.File]::ReadAllText($carnet.FullName, $utf8) + ',"photos":{' + ($photos -join ',') + '}}'

  # 1. Du code vers 64 octets : 32 pour chiffrer, 32 pour signer.
  $sel = Octets 16
  $derivation = New-Object Security.Cryptography.Rfc2898DeriveBytes($utf8.GetBytes($Code), $sel, $tours, [Security.Cryptography.HashAlgorithmName]::SHA256)
  $cles = $derivation.GetBytes(64)
  $cleAes = $cles[0..31]
  $cleMac = $cles[32..63]

  # 2. Chiffrement AES-256 (mode CBC, remplissage PKCS7 : les memes reglages que le navigateur).
  $aes = [Security.Cryptography.Aes]::Create()
  $aes.KeySize = 256
  $aes.Mode = [Security.Cryptography.CipherMode]::CBC
  $aes.Padding = [Security.Cryptography.PaddingMode]::PKCS7
  $aes.Key = $cleAes
  $aes.IV = Octets 16
  $donnees = $utf8.GetBytes($clair)
  $chiffre = $aes.CreateEncryptor().TransformFinalBlock($donnees, 0, $donnees.Length)

  # 3. Signature de (iv + donnees chiffrees).
  $hmac = New-Object Security.Cryptography.HMACSHA256(, [byte[]]$cleMac)
  $mac = $hmac.ComputeHash([byte[]]($aes.IV + $chiffre))

  $blocs += '{"sel":"' + (B64 $sel) + '","iv":"' + (B64 $aes.IV) + '","mac":"' + (B64 $mac) + '","donnees":"' + (B64 $chiffre) + '"}'
  Write-Host "$id : chiffre ($($photos.Count) photo(s), $([math]::Round($chiffre.Length / 1024)) Ko)"
}

$json = '{"v":1,"tours":' + $tours + ',"blocs":[' + ($blocs -join ',') + ']}'
[IO.File]::WriteAllText($sortie, $json, $utf8)
Write-Host "Termine : trips\coffre.json ($($blocs.Count) carnet(s)). Garde ton code : sans lui, rien ne peut etre relu."
