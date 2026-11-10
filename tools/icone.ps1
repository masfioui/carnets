# Dessine l'icone de l'appli (une rose des vents doree sur fond sombre)
# et l'enregistre en 3 tailles dans icons/.
# Lancer : powershell -ExecutionPolicy Bypass -File tools\icone.ps1
# (Pas d'accents dans ce fichier : PowerShell 5 les lit mal.)

Add-Type -AssemblyName System.Drawing
$dossier = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons'

# On dessine en grand (1024 px) puis on reduit : le resultat est plus net.
$T = 1024
$grand = New-Object System.Drawing.Bitmap $T, $T
$g = [System.Drawing.Graphics]::FromImage($grand)
$g.SmoothingMode = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'

function Couleur($hex, $alpha = 255) {
  $c = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $c.R, $c.G, $c.B)
}

# 1. Fond : degrade sombre en diagonale.
$cadre = New-Object System.Drawing.Rectangle 0, 0, $T, $T
$fond = New-Object System.Drawing.Drawing2D.LinearGradientBrush $cadre, (Couleur '#23262E'), (Couleur '#07080A'), 55
$g.FillRectangle($fond, $cadre)

# 2. Halo dore tres leger derriere l'etoile.
$halo = New-Object System.Drawing.Drawing2D.GraphicsPath
$halo.AddEllipse(62, 62, 900, 900)
$pinceauHalo = New-Object System.Drawing.Drawing2D.PathGradientBrush $halo
$pinceauHalo.CenterColor = Couleur '#E0A458' 70
$pinceauHalo.SurroundColors = @((Couleur '#E0A458' 0))
$g.FillPath($pinceauHalo, $halo)

# 3. Anneau fin.
$stylo = New-Object System.Drawing.Pen (Couleur '#E0A458' 95), 12
$g.DrawEllipse($stylo, 152, 152, 720, 720)

# 4. Rose des vents : 4 branches, chacune faite de 2 triangles (un clair, un fonce)
#    pour donner un effet de relief.
$c = 512
$long = 372    # branches nord et sud
$court = 250   # branches est et ouest
$creux = 66    # distance du centre aux creux entre deux branches
$clair = New-Object System.Drawing.SolidBrush (Couleur '#F6D29A')
$fonce = New-Object System.Drawing.SolidBrush (Couleur '#C4853A')

function Point($x, $y) { return New-Object System.Drawing.PointF $x, $y }
$centre = Point $c $c
$pointes = @(
  (Point $c ($c - $long)),   # nord
  (Point ($c + $court) $c),  # est
  (Point $c ($c + $long)),   # sud
  (Point ($c - $court) $c)   # ouest
)
$creuxPts = @(
  (Point ($c + $creux) ($c - $creux)),  # nord-est
  (Point ($c + $creux) ($c + $creux)),  # sud-est
  (Point ($c - $creux) ($c + $creux)),  # sud-ouest
  (Point ($c - $creux) ($c - $creux))   # nord-ouest
)
for ($i = 0; $i -lt 4; $i++) {
  $avant = $creuxPts[($i + 3) % 4]   # creux a gauche de la branche
  $apres = $creuxPts[$i]             # creux a droite de la branche
  $g.FillPolygon($clair, [System.Drawing.PointF[]]@($centre, $avant, $pointes[$i]))
  $g.FillPolygon($fonce, [System.Drawing.PointF[]]@($centre, $pointes[$i], $apres))
}

# 5. Petit point sombre au centre.
$g.FillEllipse((New-Object System.Drawing.SolidBrush (Couleur '#0E0F12')), ($c - 20), ($c - 20), 40, 40)
$g.Dispose()

# 6. Reduction dans les 3 tailles utilisees par le manifeste et par l'iPhone.
foreach ($taille in 512, 192, 180) {
  $petit = New-Object System.Drawing.Bitmap $taille, $taille
  $gp = [System.Drawing.Graphics]::FromImage($petit)
  $gp.InterpolationMode = 'HighQualityBicubic'
  $gp.PixelOffsetMode = 'HighQuality'
  $gp.DrawImage($grand, 0, 0, $taille, $taille)
  $gp.Dispose()
  $petit.Save((Join-Path $dossier "icon-$taille.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $petit.Dispose()
  Write-Host "icon-$taille.png"
}
$grand.Dispose()
