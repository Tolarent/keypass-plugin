#!/usr/bin/env bash
# KeyPass — Installateur automatique du greffon (macOS / Linux)
# ==============================================================
# Commande d'installation en une ligne :
#
#   curl -sSL https://raw.githubusercontent.com/Tolarent/keypass-plugin/main/install.sh | bash
#
# Ce script :
#   1. Vérifie / installe Node.js 20 LTS si absent
#   2. Télécharge et décompresse le greffon depuis GitHub
#   3. Lance npm install
#   4. Lance le configurateur interactif (.env)
#   5. Crée un alias de lancement

set -e

# ── Couleurs ──────────────────────────────────────────────────────────────────
GOLD='\033[0;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${CYAN}·${NC} $1"; }

# ── Bannière ──────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${GOLD}  ██╗  ██╗███████╗██╗   ██╗██████╗  █████╗ ███████╗███████╗${NC}"
echo -e "${GOLD}  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝${NC}"
echo -e "${GOLD}  █████╔╝ █████╗   ╚████╔╝ ██████╔╝███████║███████╗███████╗${NC}"
echo -e "${GOLD}  ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔═══╝ ██╔══██║╚════██║╚════██║${NC}"
echo -e "${GOLD}  ██║  ██╗███████╗   ██║   ██║     ██║  ██║███████║███████║${NC}"
echo -e "${GOLD}  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝${NC}"
echo ""
echo "  Installation du greffon KeyPass"
echo "  ─────────────────────────────────────────────────────────"
echo ""

# ── Répertoire d'installation ─────────────────────────────────────────────────
INSTALL_DIR="$HOME/keypass/greffon"
info "Répertoire d'installation : $INSTALL_DIR"

# ── Étape 1 : Node.js ─────────────────────────────────────────────────────────
echo ""
echo "  [1/5] Vérification de Node.js..."

NODE_MAJOR=$(node --version 2>/dev/null | grep -oP '(?<=v)\d+' || echo "0")
if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    ok "Node.js $(node --version) déjà installé"
else
    info "Node.js non trouvé ou version < 18, installation via nvm..."
    if ! command -v nvm &>/dev/null && ! [ -s "$HOME/.nvm/nvm.sh" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 20 --lts --silent
    nvm use 20
    ok "Node.js $(node --version) installé via nvm"
fi

# ── Étape 2 : Téléchargement du greffon ───────────────────────────────────────
echo ""
echo "  [2/5] Téléchargement du greffon KeyPass..."

ZIP_URL="https://github.com/Tolarent/keypass-plugin/archive/refs/heads/main.zip"
TMP_ZIP="/tmp/keypass-plugin.zip"

if command -v curl &>/dev/null; then
    curl -sSL "$ZIP_URL" -o "$TMP_ZIP"
elif command -v wget &>/dev/null; then
    wget -qO "$TMP_ZIP" "$ZIP_URL"
else
    err "curl ou wget requis. Installez l'un des deux et relancez."
    exit 1
fi

ok "Téléchargement terminé"

mkdir -p "$(dirname "$INSTALL_DIR")"
rm -rf "$INSTALL_DIR"
unzip -q "$TMP_ZIP" -d "/tmp/keypass-extract"
mv /tmp/keypass-extract/keypass-plugin-main "$INSTALL_DIR"
rm -rf "/tmp/keypass-extract" "$TMP_ZIP"
ok "Greffon extrait dans $INSTALL_DIR"

# ── Étape 3 : npm install ─────────────────────────────────────────────────────
echo ""
echo "  [3/5] Installation des dépendances npm..."

cd "$INSTALL_DIR"
npm install --omit=dev --silent
ok "Dépendances installées"

# ── Étape 4 : Configuration interactive ───────────────────────────────────────
echo ""
echo "  [4/5] Configuration du greffon..."
echo ""
echo "  Ces informations vous ont été fournies par KeyPass lors de l'installation."
echo ""

read -rp "  URL du backend (ex: https://keypass-monhotel.vercel.app/api) : " BACKEND_URL
read -rp "  Clé API hôtel (ex: kp_hotel_abc123...) : " API_KEY
read -rp "  Nom de l'hôtel (ex: Hôtel Le Grand Palais) : " HOTEL_NAME

if [ -z "$BACKEND_URL" ] || [ -z "$API_KEY" ] || [ -z "$HOTEL_NAME" ]; then
    err "Tous les champs sont obligatoires. Relancez l'installation."
    exit 1
fi

cat > "$INSTALL_DIR/.env" << EOF
# KeyPass — Configuration greffon
# Généré automatiquement le $(date "+%Y-%m-%d %H:%M")

BACKEND_URL=$BACKEND_URL
API_KEY=$API_KEY
HOTEL_NAME=$HOTEL_NAME
EOF

ok "Fichier .env créé"

# ── Étape 5 : Alias de lancement ──────────────────────────────────────────────
echo ""
echo "  [5/5] Création du lanceur..."

ELECTRON_BIN="$INSTALL_DIR/node_modules/.bin/electron"
LAUNCHER="$HOME/.local/bin/keypass"

mkdir -p "$HOME/.local/bin"
cat > "$LAUNCHER" << EOF
#!/usr/bin/env bash
cd "$INSTALL_DIR" && "$ELECTRON_BIN" .
EOF
chmod +x "$LAUNCHER"

# Ajouter ~/.local/bin au PATH si nécessaire
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
fi

ok "Lanceur créé : keypass"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────────────────────"
echo ""
echo -e "  ${GREEN}✅  KeyPass installé avec succès !${NC}"
echo ""
info "Répertoire : $INSTALL_DIR"
info "Hôtel      : $HOTEL_NAME"
info "Backend    : $BACKEND_URL"
echo ""
echo "  Pour lancer le greffon : keypass"
echo ""

read -rp "  Lancer le greffon maintenant ? (o/N) : " LAUNCH
if [[ "$LAUNCH" =~ ^[Oo]$ ]]; then
    info "Démarrage du greffon..."
    nohup "$ELECTRON_BIN" "$INSTALL_DIR" &>/dev/null &
fi

echo ""
echo "  Installation terminée."
echo ""
