// core/overlay.js
// Crée la fenêtre transparente Electron qui se superpose au logiciel hôtel.
// Injecte les boutons KeyPass à côté du bouton "Encoder carte" du logiciel.

const { BrowserWindow, screen } = require('electron');
const path = require('path');
const log  = require('electron-log');
const { getPositionFenetre } = require('./detector');

// ── Positions des boutons selon le logiciel ────────────────────────────────
// Ces coordonnées indiquent où positionner l'overlay par rapport à la fenêtre
// du logiciel hôtel. À ajuster après test sur site.
// Format : { offsetX, offsetY } — décalage depuis le coin supérieur droit de la fenêtre hôtel
const POSITIONS_OVERLAY = {
  visionline: { offsetX: -320, offsetY: 280 },  // À ajuster en production ASSA ABLOY
  ambiance:   { offsetX: -320, offsetY: 260 },  // À ajuster en production Dormakaba
  salto:      { offsetX: -320, offsetY: 300 },  // À ajuster en production Salto
  generic:    { offsetX: 20,   offsetY: 100 },  // Fallback — en dehors de la fenêtre
};

// ── Créer l'overlay ────────────────────────────────────────────────────────

/**
 * Crée la fenêtre Electron transparente superposée au logiciel hôtel.
 *
 * @param {Object} logiciel - { name, adapter, exe } depuis detector.js
 * @returns {BrowserWindow} La fenêtre overlay
 */
async function creerOverlay(logiciel) {
  log.info('[Overlay] Création overlay pour', logiciel.name);

  // Récupérer la position de la fenêtre du logiciel hôtel
  const fenetre = await getPositionFenetre(logiciel.exe);
  const position = POSITIONS_OVERLAY[logiciel.adapter] || POSITIONS_OVERLAY.generic;

  // Calculer la position de l'overlay
  let x = 100, y = 100;
  if (fenetre) {
    x = fenetre.x + fenetre.width + position.offsetX;
    y = fenetre.y + position.offsetY;

    // S'assurer que l'overlay reste dans l'écran
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    x = Math.max(0, Math.min(x, screenW - 300));
    y = Math.max(0, Math.min(y, screenH - 140));
  }

  const win = new BrowserWindow({
    x, y,
    width:  620,
    height: 200,
    transparent:    true,   // Fond transparent
    frame:          false,   // Pas de bordure Windows
    alwaysOnTop:    true,    // Toujours au-dessus du logiciel hôtel
    skipTaskbar:    true,    // Invisible dans la barre des tâches
    resizable:      false,
    movable:        true,    // Réceptionniste peut déplacer l'overlay
    hasShadow:      false,
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  // Charger l'interface des boutons
  win.loadFile(path.join(__dirname, '..', 'ui', 'overlay.html'));

  // En mode dev, ouvrir les devtools
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // Passer les infos du logiciel à la page
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('logiciel-info', logiciel);
  });

  log.info('[Overlay] Fenêtre créée à', x, y);
  return win;
}

/**
 * Affiche une fenêtre plein écran avec le QR code à scanner.
 * Apparaît quand le réceptionniste clique "Afficher QR Code".
 *
 * @param {string} qrBase64  - Image QR code en base64
 * @param {Object} key       - Données de la clé créée
 * @param {BrowserWindow} parent - Fenêtre parent (overlay)
 */
function afficherQR(qrBase64, key, parent) {
  const qrWin = new BrowserWindow({
    width:  600,
    height: 700,
    center: true,
    frame:  true,
    alwaysOnTop: true,
    title: `KeyPass — Chambre ${key?.room_id || ''}`,
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false,
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  qrWin.loadFile(path.join(__dirname, '..', 'ui', 'qrcode.html'));

  qrWin.webContents.on('did-finish-load', () => {
    qrWin.webContents.send('qr-data', { qrBase64, key });
  });
}

module.exports = { creerOverlay, afficherQR };
