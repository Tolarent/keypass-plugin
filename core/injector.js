// core/injector.js
// Injecte les boutons KeyPass dans l'interface du logiciel hôtel.
// Deux méthodes selon le type d'interface : Win32 natif ou Electron/Web.

const { exec } = require('child_process');
const log = require('electron-log');

/**
 * Injecte un bouton KeyPass dans une fenêtre Win32 native.
 * Utilise l'API Windows (SendMessage/PostMessage) pour ajouter des boutons.
 *
 * NOTE : Cette approche est complexe car elle nécessite de connaître
 * les identifiants de contrôles Windows du logiciel hôtel.
 * À affiner lors du premier déploiement sur site.
 *
 * @param {number} hwnd       - Handle de la fenêtre cible
 * @param {string} texte      - Texte du bouton
 * @param {Function} callback - Fonction appelée au clic
 */
function injecterBoutonWin32(hwnd, texte, callback) {
  // TODO : Implémenter l'injection Win32 selon le logiciel hôtel.
  // Pour l'instant, on utilise l'overlay transparent (overlay.js) qui est plus fiable.
  log.warn('[Injector] injecterBoutonWin32 non implémenté — utiliser l\'overlay transparent');
}

/**
 * Vérifie si le logiciel hôtel est une application Electron ou web.
 * Si oui, l'injection JavaScript directe est possible.
 *
 * @param {string} exe - Nom de l'exécutable
 * @returns {Promise<boolean>}
 */
async function estApplicationElectron(exe) {
  if (process.platform !== 'win32') return false;

  return new Promise((resolve) => {
    // Les apps Electron ont souvent "electron" dans le répertoire d'installation
    exec(`wmic process where name="${exe}" get ExecutablePath`, { timeout: 3000 }, (err, stdout) => {
      if (err) { resolve(false); return; }
      resolve(stdout.toLowerCase().includes('electron'));
    });
  });
}

module.exports = { injecterBoutonWin32, estApplicationElectron };
