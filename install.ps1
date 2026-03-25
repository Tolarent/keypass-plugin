# KeyPass - Installateur automatique du greffon (Windows)
# =========================================================
# Commande d'installation en une ligne :
#
#   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Tolarent/keypass-plugin/main/install.ps1 | iex"

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$installDir = "C:\KeyPass\greffon"

Clear-Host
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Yellow
Write-Host "       KeyPass - Installation du greffon      " -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Repertoire : $installDir"
Write-Host ""

# -- Droits admin --
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "  ERREUR : Executer PowerShell en tant qu'Administrateur." -ForegroundColor Red
    Write-Host "  -> Clic droit sur PowerShell > Executer en tant qu'administrateur" -ForegroundColor White
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

# -- Etape 1 : Node.js --
Write-Host "  [1/5] Verification de Node.js..." -ForegroundColor White
$nodeOk = $false
try {
    $nodeVersion = (node --version 2>$null)
    if ($nodeVersion -match "v(\d+)" -and [int]$Matches[1] -ge 18) {
        Write-Host "  OK Node.js $nodeVersion installe" -ForegroundColor Green
        $nodeOk = $true
    }
} catch {}

if (-not $nodeOk) {
    Write-Host "  Telechargement Node.js 20 LTS (~30 Mo)..." -ForegroundColor Cyan
    $nodeUrl = "https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Start-Process msiexec.exe -Wait -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart"
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "  OK Node.js installe" -ForegroundColor Green
    } catch {
        Write-Host "  ERREUR telechargement Node.js : $_" -ForegroundColor Red
        Read-Host "Appuyez sur Entree pour quitter"
        exit 1
    }
}

# -- Etape 2 : Telechargement --
Write-Host "  [2/5] Telechargement du greffon KeyPass..." -ForegroundColor White
$zipUrl  = "https://github.com/Tolarent/keypass-plugin/archive/refs/heads/main.zip"
$zipPath = "$env:TEMP\keypass-plugin.zip"
$tmpDir  = "$env:TEMP\keypass-extract"

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "  OK Telechargement termine" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR telechargement : $_" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force
Remove-Item $zipPath -Force

$extracted = Get-ChildItem $tmpDir | Select-Object -First 1

# Arreter le greffon s'il tourne encore (electron.exe verrouille les fichiers)
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path (Split-Path $installDir) -Force | Out-Null
Move-Item $extracted.FullName $installDir
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  OK Greffon extrait dans $installDir" -ForegroundColor Green

# -- Etape 3 : npm install --
Write-Host "  [3/5] Installation des dependances npm..." -ForegroundColor White
Write-Host "  (les avertissements npm warn sont normaux)" -ForegroundColor DarkGray
cmd /c "cd /d `"$installDir`" && npm install"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERREUR npm install (code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}
Write-Host "  OK Dependances installees" -ForegroundColor Green

# -- Etape 4 : Configuration --
Write-Host "  [4/5] Configuration du greffon..." -ForegroundColor White
Write-Host ""
Write-Host "  Ces informations vous ont ete fournies par KeyPass." -ForegroundColor DarkGray
Write-Host ""

$backendUrl = Read-Host "  URL du backend (ex: https://keypass-monhotel.vercel.app/api)"
$apiKey     = Read-Host "  Cle API hotel (ex: kp_hotel_abc123)"
$hotelName  = Read-Host "  Nom de l hotel"

if (-not $backendUrl -or -not $apiKey -or -not $hotelName) {
    Write-Host "  ERREUR : tous les champs sont obligatoires." -ForegroundColor Red
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

$envContent = "BACKEND_URL=$backendUrl`r`nAPI_KEY=$apiKey`r`nHOTEL_NAME=$hotelName`r`n"
[System.IO.File]::WriteAllText("$installDir\.env", $envContent, [System.Text.Encoding]::ASCII)
Write-Host "  OK Fichier .env cree" -ForegroundColor Green

# -- Etape 5 : Raccourcis --
Write-Host "  [5/5] Creation des raccourcis..." -ForegroundColor White

$wsh = New-Object -ComObject WScript.Shell

$desktopShortcut = "$env:PUBLIC\Desktop\KeyPass.lnk"
$sc = $wsh.CreateShortcut($desktopShortcut)
$sc.TargetPath       = "cmd.exe"
$sc.Arguments        = "/c cd /d `"$installDir`" && npm start"
$sc.WorkingDirectory = $installDir
$sc.Description      = "Greffon KeyPass"
$sc.Save()
Write-Host "  OK Raccourci Bureau cree" -ForegroundColor Green

$startupDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$sc2 = $wsh.CreateShortcut("$startupDir\KeyPass.lnk")
$sc2.TargetPath       = "cmd.exe"
$sc2.Arguments        = "/c cd /d `"$installDir`" && npm start"
$sc2.WorkingDirectory = $installDir
$sc2.Description      = "KeyPass demarrage automatique"
$sc2.Save()
Write-Host "  OK Demarrage automatique Windows configure" -ForegroundColor Green

# -- Resultat --
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "       KeyPass installe avec succes !         " -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Repertoire : $installDir"
Write-Host "  Hotel      : $hotelName"
Write-Host "  Backend    : $backendUrl"
Write-Host ""

$launch = Read-Host "  Lancer le greffon maintenant ? (O/N)"
if ($launch -match "^[Oo]") {
    Write-Host "  Demarrage..." -ForegroundColor Cyan
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$installDir`" && npm start" -WorkingDirectory $installDir
}

Write-Host ""
Read-Host "Installation terminee. Appuyez sur Entree pour fermer"
