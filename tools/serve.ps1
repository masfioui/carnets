# Petit serveur web local pour tester l'appli sans rien installer.
# Usage :  powershell -ExecutionPolicy Bypass -File tools\serve.ps1
# Puis ouvrir http://localhost:8123/  (Ctrl+C pour arreter)
# (Pas d'accents dans ce fichier : PowerShell 5 les lit mal sans BOM.)

param([int]$Port = 8123)

$racine = Split-Path -Parent $PSScriptRoot
$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
}

$ecoute = New-Object System.Net.HttpListener
$ecoute.Prefixes.Add("http://localhost:$Port/")
$ecoute.Start()
Write-Host "Carnets : http://localhost:$Port/"

while ($ecoute.IsListening) {
  $ctx = $ecoute.GetContext()
  try {
    $chemin = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($chemin -eq '' -or $chemin.EndsWith('/')) { $chemin += 'index.html' }
    $fichier = [IO.Path]::GetFullPath((Join-Path $racine $chemin))
    # Securite : on ne sert que des fichiers situes dans le dossier du projet.
    if ($fichier.StartsWith($racine) -and (Test-Path -LiteralPath $fichier -PathType Leaf)) {
      $octets = [IO.File]::ReadAllBytes($fichier)
      $type = $types[[IO.Path]::GetExtension($fichier).ToLower()]
      if (-not $type) { $type = 'application/octet-stream' }
      $ctx.Response.ContentType = $type
      $ctx.Response.Headers['Cache-Control'] = 'no-cache'
      $ctx.Response.ContentLength64 = $octets.Length
      $ctx.Response.OutputStream.Write($octets, 0, $octets.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    Write-Host "Erreur : $_"
  } finally {
    $ctx.Response.Close()
  }
}
