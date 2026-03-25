// core/monitor.js
// Surveille les événements du logiciel hôtel (création réservation, checkout).
// Quand une action pertinente est détectée, informe l'overlay.

const log = require('electron-log');

// ── Surveillance ───────────────────────────────────────────────────────────

/**
 * Démarre la surveillance du logiciel hôtel.
 * Délègue à l'adapter approprié selon le logiciel détecté.
 *
 * @param {Object} logiciel - { name, adapter, exe }
 * @param {BrowserWindow} overlayWin - Fenêtre overlay à notifier
 */
function demarrerSurveillance(logiciel, overlayWin) {
  log.info('[Monitor] Démarrage surveillance pour', logiciel.name);

  try {
    const adapter = chargerAdapter(logiciel.adapter);
    adapter.demarrer(overlayWin);
    log.info('[Monitor] Surveillance active via adapter', logiciel.adapter);
  } catch (err) {
    log.warn('[Monitor] Impossible de charger l\'adapter', logiciel.adapter, '— fallback générique');
    log.warn('[Monitor] Erreur :', err.message);

    // Fallback : adapter générique
    const generic = require('../adapters/generic');
    generic.demarrer(overlayWin);
  }
}

/**
 * Charge dynamiquement l'adapter selon son nom.
 * @param {string} nom - 'visionline' | 'ambiance' | 'salto' | 'generic'
 * @returns {Object} L'adapter chargé
 */
function chargerAdapter(nom) {
  const adaptersDisponibles = ['visionline', 'ambiance', 'salto', 'generic'];
  const adapterNom = adaptersDisponibles.includes(nom) ? nom : 'generic';
  return require(`../adapters/${adapterNom}`);
}

module.exports = { demarrerSurveillance };
