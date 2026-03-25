// nfc/proxmark.js
// Interface avec le Proxmark3 branché en USB sur le PC de l'hôtel.
// Utilisé pour lire les clés secrètes des cartes MIFARE et pour les tests.
//
// Proxmark3 est un outil open-source de recherche NFC.
// Téléchargement : https://github.com/RfidResearchGroup/proxmark3
// Documentation : https://github.com/RfidResearchGroup/proxmark3/wiki

const { exec, spawn } = require('child_process');
const path = require('path');
const log  = require('electron-log');

// ── Chemin vers l'exécutable Proxmark3 ────────────────────────────────────
// TODO : Ajuster si le répertoire d'installation diffère
const PM3_PATH = process.env.PM3_PATH || 'C:\\Program Files\\Proxmark3\\pm3.exe';

/**
 * Vérifie si le Proxmark3 est connecté et accessible.
 * @returns {Promise<boolean>}
 */
async function estConnecte() {
  if (process.platform !== 'win32') return false;

  return new Promise((resolve) => {
    exec(`"${PM3_PATH}" --version`, { timeout: 3000 }, (err, stdout) => {
      resolve(!err && stdout.toLowerCase().includes('proxmark'));
    });
  });
}

/**
 * Lance une attaque automatique sur une carte MIFARE Classic pour extraire la clé.
 * Cette opération prend moins d'une minute sur une carte MIFARE Classic standard.
 *
 * ATTENTION : N'utiliser qu'avec la permission EXPLICITE de l'hôtel.
 *             La carte doit appartenir à l'hôtel et être utilisée dans le cadre
 *             d'un contrat KeyPass signé.
 *
 * @param {Function} onProgress - Callback appelé avec la progression (0-100)
 * @returns {Promise<{keyA: string, keyB: string} | null>}
 *   Les clés trouvées en hex, ou null si échec.
 */
async function crackerClesMifare(onProgress) {
  log.info('[Proxmark3] Démarrage attaque autopwn MIFARE...');

  // TODO : Tester sur la vraie carte le 3 avril.
  // Commande Proxmark3 : pm3 -c "hf mf autopwn"
  // Durée typique : 30-60 secondes sur MIFARE Classic 1K standard
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      log.warn('[Proxmark3] Non disponible sur', process.platform);
      resolve(null);
      return;
    }

    const pm3 = spawn(PM3_PATH, ['-c', 'hf mf autopwn'], { timeout: 120000 });
    let output = '';

    pm3.stdout.on('data', (data) => {
      output += data.toString();
      // Estimer la progression depuis les logs Proxmark3
      const match = output.match(/\[=\] (\d+)%/);
      if (match && onProgress) onProgress(parseInt(match[1]));
      log.debug('[Proxmark3]', data.toString().trim());
    });

    pm3.on('close', (code) => {
      if (code !== 0) {
        log.error('[Proxmark3] Échec autopwn, code', code);
        resolve(null);
        return;
      }

      // Parser les clés depuis la sortie
      // Format typique : "Found valid key:A [FFFFFFFFFFFF]"
      const keyAMatch = output.match(/key:A \[([0-9A-Fa-f]{12})\]/);
      const keyBMatch = output.match(/key:B \[([0-9A-Fa-f]{12})\]/);

      if (keyAMatch) {
        log.info('[Proxmark3] ✅ Clé A trouvée :', keyAMatch[1]);
        resolve({
          keyA: keyAMatch[1],
          keyB: keyBMatch ? keyBMatch[1] : null,
        });
      } else {
        log.warn('[Proxmark3] Aucune clé trouvée dans la sortie');
        resolve(null);
      }
    });
  });
}

/**
 * Dump tous les secteurs d'une carte MIFARE une fois la clé connue.
 * Nécessaire pour comprendre le format d'encodage des données de réservation.
 *
 * @param {string} keyA - Clé A en hex (12 chars)
 * @returns {Promise<Buffer[]>} - Array de Buffer de 16 bytes par secteur
 */
async function dumperCarteMifare(keyA) {
  // TODO : Implémenter après obtention de la clé le 3 avril.
  // Commande : pm3 -c "hf mf dump -k ${keyA}"
  log.warn('[Proxmark3] dumperCarteMifare() TODO — à exécuter le 3 avril avec la clé trouvée');
  return null;
}

module.exports = { estConnecte, crackerClesMifare, dumperCarteMifare };
