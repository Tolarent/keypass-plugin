# KeyPass — Installateur automatique du greffon (Windows)
# =========================================================
# Commande d'installation en une ligne :
#
#   powershell -ExecutionPolicy Bypass -c "irm https://raw.githubusercontent.com/Tolarent/keypass-plugin/main/install.ps1 | iex"
#
# Ce script :
#   1. Vérifie / installe Node.js 20 LTS si absent
#   2. Télécharge et décompresse le greffon depuis GitHub
#   3. Lance npm install
#   4. Lance le configurateur interactif (.env)
#   5. Crée un raccourci sur le Bureau et dans le Démarrage Windows

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# ── Couleurs ──────────────────────────────────────────────────────────────────
function Write-Gold  ($t) { Write-Host $t -ForegroundColor Yellow }
function Write-Ok    ($t) { Write-Host "  ✓ $t" -ForegroundColor Green }
function Write-Err   ($t) { Write-Host "  ✗ $t" -ForegroundColor Red }
function Write-Info  ($t) { Write-Host "  · $t" -ForegroundColor Cyan }

# ── Bannière ──────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Gold  "  ██╗  ██╗███████╗██╗   ██╗██████╗  █████╗ ███████╗███████╗"
Write-Gold  "  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝"
Write-Gold  "  █████╔╝ █████╗   ╚████╔╝ ██████╔╝███████║███████╗███████╗"
Write-Gold  "  ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔═══╝ ██╔══██║╚════██║╚════██║"
Write-Gold  "  ██║  ██╗███████╗   ██║   ██║     ██║  ██║███████║███████║"
Write-Gold  "  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝"
Write-Host ""
Write-Host  "  Installation du greffon KeyPass" -ForegroundColor White
Write-Host  "  ─────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Vérification droits admin ─────────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ""
    Write-Err "Ce script doit être exécuté en tant qu'Administrateur."
    Write-Host ""
    Write-Host "  → Fermer PowerShell, puis clic droit → 'Exécuter en tant qu'administrateur'" -ForegroundColor White
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# ── Répertoire d'installation ─────────────────────────────────────────────────
$installDir = "C:\KeyPass\greffon"
Write-Info "Répertoire d'installation : $installDir"

# ── Étape 1 : Node.js ─────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  [1/5] Vérification de Node.js..." -ForegroundColor White

$nodeOk = $false
try {
    $nodeVersion = (node --version 2>$null)
    if ($nodeVersion -match "v(\d+)" -and [int]$Matches[1] -ge 18) {
        Write-Ok "Node.js $nodeVersion déjà installé"
        $nodeOk = $true
    } else {
        Write-Info "Node.js $nodeVersion trouvé mais version < 18, mise à jour..."
    }
} catch {
    Write-Info "Node.js non trouvé, téléchargement en cours..."
}

if (-not $nodeOk) {
    $nodeUrl      = "https://nodejs.org/dist/v20.15.0/node-v20.15.0-x64.msi"
    $nodeInstaller = "$env:TEMP\node-installer.msi"

    Write-Info "Téléchargement Node.js 20 LTS (~30 Mo)..."
    try {
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller -UseBasicParsing
        Write-Info "Installation en cours (silencieuse)..."
        Start-Process msiexec.exe -Wait -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart"
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue

        # Recharger PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Ok "Node.js installé avec succès"
    } catch {
        Write-Err "Échec du téléchargement de Node.js : $_"
        Write-Host "  → Installez manuellement depuis https://nodejs.org et relancez ce script." -ForegroundColor White
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

# ── Étape 2 : Téléchargement du greffon ───────────────────────────────────────
Write-Host ""
Write-Host "  [2/5] Téléchargement du greffon KeyPass..." -ForegroundColor White

$zipUrl  = "https://github.com/Tolarent/keypass-plugin/archive/refs/heads/main.zip"
$zipPath = "$env:TEMP\keypass-plugin.zip"
$tmpDir  = "$env:TEMP\keypass-extract"

try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Write-Ok "Téléchargement terminé"
} catch {
    Write-Err "Impossible de télécharger le greffon : $_"
    Write-Host "  → Vérifiez la connexion Internet ou contactez le support KeyPass." -ForegroundColor White
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Décompression
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $tmpDir -Force
Remove-Item $zipPath -Force

# Déplacer vers le répertoire final
$extracted = Get-ChildItem $tmpDir | Select-Object -First 1
if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
New-Item -ItemType Directory -Path (Split-Path $installDir) -Force | Out-Null
Move-Item $extracted.FullName $installDir
Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Ok "Greffon extrait dans $installDir"

# ── Étape 3 : npm install ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "  [3/5] Installation des dépendances npm..." -ForegroundColor White

Set-Location $installDir
$npmProc = Start-Process "npm" -ArgumentList "install","--loglevel=silent" -WorkingDirectory $installDir -Wait -PassThru -NoNewWindow -RedirectStandardError "$env:TEMP\npm-stderr.txt"
if ($npmProc.ExitCode -ne 0) {
    Write-Err "npm install a échoué"
    Get-Content "$env:TEMP\npm-stderr.txt" -ErrorAction SilentlyContinue | Write-Host -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}
Write-Ok "Dépendances installées"

# ── Étape 4 : Configuration interactive ───────────────────────────────────────
Write-Host ""
Write-Host "  [4/5] Configuration du greffon..." -ForegroundColor White
Write-Host ""
Write-Host "  Répondez aux questions suivantes pour configurer votre installation." -ForegroundColor DarkGray
Write-Host "  Ces informations vous ont été fournies par KeyPass lors de l'installation." -ForegroundColor DarkGray
Write-Host ""

$backendUrl  = Read-Host "  URL du backend (ex: https://keypass-monhotel.vercel.app/api)"
$apiKey      = Read-Host "  Clé API hôtel (ex: kp_hotel_abc123...)"
$hotelName   = Read-Host "  Nom de l'hôtel (ex: Hôtel Le Grand Palais)"

# Valider les entrées
if (-not $backendUrl -or -not $apiKey -or -not $hotelName) {
    Write-Err "Tous les champs sont obligatoires. Relancez l'installation."
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

# Écrire le fichier .env
$envContent = @"
# KeyPass — Configuration greffon
# Généré automatiquement le $(Get-Date -Format "yyyy-MM-dd HH:mm")

BACKEND_URL=$backendUrl
API_KEY=$apiKey
HOTEL_NAME=$hotelName
"@

$envContent | Out-File -FilePath "$installDir\.env" -Encoding UTF8
Write-Ok "Fichier .env créé"

# ── Étape 5 : Raccourcis & démarrage automatique ──────────────────────────────
Write-Host ""
Write-Host "  [5/5] Création des raccourcis..." -ForegroundColor White

$electronExe = "$installDir\node_modules\.bin\electron.cmd"
$wsh = New-Object -ComObject WScript.Shell

# Raccourci Bureau
$desktopShortcut = "$env:PUBLIC\Desktop\KeyPass.lnk"
$shortcut = $wsh.CreateShortcut($desktopShortcut)
$shortcut.TargetPath       = "cmd.exe"
$shortcut.Arguments        = "/c `"$electronExe`" `"$installDir`""
$shortcut.WorkingDirectory = $installDir
$shortcut.Description      = "Greffon KeyPass — Clé digitale hôtel"
try {
    $iconPath = "$installDir\ui\icon.ico"
    if (Test-Path $iconPath) { $shortcut.IconLocation = $iconPath }
} catch {}
$shortcut.Save()
Write-Ok "Raccourci Bureau créé"

# Démarrage automatique Windows (dossier Startup)
$startupDir = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$startupShortcut = "$startupDir\KeyPass.lnk"
$shortcut2 = $wsh.CreateShortcut($startupShortcut)
$shortcut2.TargetPath       = "cmd.exe"
$shortcut2.Arguments        = "/c `"$electronExe`" `"$installDir`""
$shortcut2.WorkingDirectory = $installDir
$shortcut2.Description      = "Greffon KeyPass — Démarrage automatique"
try {
    $iconPath = "$installDir\ui\icon.ico"
    if (Test-Path $iconPath) { $shortcut2.IconLocation = $iconPath }
} catch {}
$shortcut2.Save()
Write-Ok "Démarrage automatique Windows configuré"

# ── Résumé ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host  "  ✅  KeyPass installé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Info  "Répertoire : $installDir"
Write-Info  "Hôtel      : $hotelName"
Write-Info  "Backend    : $backendUrl"
Write-Host ""
Write-Host  "  Le greffon se lance automatiquement au démarrage de Windows." -ForegroundColor White
Write-Host  "  Un raccourci 'KeyPass' a été créé sur le Bureau." -ForegroundColor White
Write-Host ""

# Lancer le greffon maintenant ?
$launch = Read-Host "  Lancer le greffon maintenant ? (O/N)"
if ($launch -match "^[Oo]") {
    Write-Info "Démarrage du greffon..."
    Start-Process "cmd.exe" -ArgumentList "/c `"$electronExe`" `"$installDir`"" -WorkingDirectory $installDir
}

Write-Host ""
Read-Host "Installation terminée. Appuyez sur Entrée pour fermer"
