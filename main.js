// main.js
// Processus principal Electron du greffon KeyPass.
// Lance l'overlay transparent sur le logiciel hôtel et gère le cycle de vie.

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path    = require('path');
const log     = require('electron-log');
const detector = require('./core/detector');
const overlay  = require('./core/overlay');
const monitor  = require('./core/monitor');
const apiClient = require('./api/client');

// ── Configuration ──────────────────────────────────────────────────────────
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'keypass.log');
log.info('[KeyPass] Démarrage du greffon v1.0.0');

let tray       = null;
let overlayWin = null;
let detectionInterval = null;

// ── Démarrage ──────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Icône dans la barre système (tray)
  creerTray();

  // Vérifier la connexion au serveur KeyPass
  const serverOk = await apiClient.checkHealth();
  if (!serverOk) {
    log.warn('[KeyPass] Serveur inaccessible — mode hors-ligne');
  }

  // Afficher l'overlay immédiatement en mode manuel (sans logiciel hôtel)
  // Il restera visible en permanence ; la détection automatique le complète si un logiciel est trouvé
  overlayWin = await overlay.creerOverlay({ name: 'Manuel', adapter: 'generic', exe: null });

  // Lancer la détection du logiciel hôtel (toutes les 3 secondes)
  demarrerDetection();
});

// ── Tray (icône barre système) ─────────────────────────────────────────────
function creerTray() {
  // Utiliser une icône vide si le fichier n'existe pas encore
  const iconPath = path.join(__dirname, 'ui', 'icon.ico');
  const icon     = nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('KeyPass — Clé digitale hôtel');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'KeyPass Plugin', enabled: false },
    { type: 'separator' },
    { label: '🔄 Relancer la détection', click: () => demarrerDetection() },
    { label: '📊 Ouvrir les logs',       click: () => log.openInEditor() },
    { type: 'separator' },
    { label: '✕ Quitter',               click: () => app.quit() },
  ]));
}

// ── Détection du logiciel hôtel ────────────────────────────────────────────
function demarrerDetection() {
  if (detectionInterval) clearInterval(detectionInterval);

  detectionInterval = setInterval(async () => {
    const logiciel = await detector.detecterLogiciel();

    if (logiciel && logiciel.adapter !== 'inconnu') {
      log.info('[KeyPass] Logiciel hôtel détecté :', logiciel.name, '(adapter:', logiciel.adapter, ')');

      // Créer l'overlay si pas encore actif
      if (!overlayWin || overlayWin.isDestroyed()) {
        overlayWin = overlay.creerOverlay(logiciel);
        monitor.demarrerSurveillance(logiciel, overlayWin);
      }

      // Mettre à jour le tray
      tray.setToolTip(`KeyPass — ${logiciel.name} détecté ✓`);
    } else {
      // Aucun logiciel connu — fermer l'overlay s'il est ouvert
      if (overlayWin && !overlayWin.isDestroyed()) {
        overlayWin.close();
        overlayWin = null;
        log.info('[KeyPass] Overlay fermé — logiciel hôtel non détecté');
      }
      tray.setToolTip('KeyPass — En attente du logiciel hôtel...');
    }
  }, 3000); // Vérification toutes les 3 secondes
}

// ── IPC — Communication entre processus ────────────────────────────────────

// Reçu depuis overlay.html quand le réceptionniste clique "Envoyer sur iPhone"
ipcMain.handle('envoyer-cle-iphone', async (event, reservation) => {
  log.info('[KeyPass] Envoi clé iPhone pour chambre', reservation.roomId);
  try {
    const result = await apiClient.creerCle(reservation);
    return { ok: true, ...result };
  } catch (err) {
    log.error('[KeyPass] Erreur envoi clé :', err.message);
    return { ok: false, error: err.message };
  }
});

// Reçu depuis overlay.html quand le réceptionniste clique "Afficher QR Code"
ipcMain.handle('afficher-qr', async (event, reservation) => {
  log.info('[KeyPass] Affichage QR pour chambre', reservation.roomId);
  try {
    const result = await apiClient.creerCle(reservation);
    if (result.ok) {
      overlay.afficherQR(result.qrImageBase64, result.key, overlayWin);
    }
    return result;
  } catch (err) {
    log.error('[KeyPass] Erreur QR :', err.message);
    return { ok: false, error: err.message };
  }
});

// Reçu depuis overlay.html au checkout
ipcMain.handle('revoquer-cle', async (event, token) => {
  log.info('[KeyPass] Révocation clé token', token);
  try {
    const result = await apiClient.revoquerCle(token);
    return result;
  } catch (err) {
    log.error('[KeyPass] Erreur révocation :', err.message);
    return { ok: false, error: err.message };
  }
});

// ── Gestion des fenêtres ───────────────────────────────────────────────────
app.on('window-all-closed', (e) => {
  // Sur Windows, on ne quitte PAS quand toutes les fenêtres sont fermées.
  // Le greffon continue de tourner en tâche de fond via le tray.
  e.preventDefault();
});

app.on('before-quit', () => {
  log.info('[KeyPass] Arrêt du greffon');
  if (detectionInterval) clearInterval(detectionInterval);
});
