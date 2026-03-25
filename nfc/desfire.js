// nfc/desfire.js
// Encodage/décodage MIFARE DESFire (EV1/EV2/EV3) pour le greffon Electron.
//
// TROU CENTRAL : La clé AES DESFire ne peut PAS être crackée par Proxmark3.
// Elle doit être fournie par l'hôtel ou le fabricant de serrures sous contrat.
//
// ═══════════════════════════════════════════════════════════════════════════
// TODO : HOTEL_MASTER_KEY (AES) — Clé AES-128 de l'hôtel (16 bytes)
// Format : Buffer 16 bytes ou string hex 32 chars
// Obtention : Demander contractuellement à l'hôtel ou au fabricant
//   ASSA ABLOY  : via Vostio Developer Portal
//   Dormakaba   : via B-COMM documentation partenaire
//   Salto       : via Salto KS Developer API
// ═══════════════════════════════════════════════════════════════════════════

const log = require('electron-log');

// TODO : HOTEL_MASTER_KEY (AES-128) — Clé maître DESFire de l'hôtel (16 bytes)
const HOTEL_MASTER_KEY_AES = null; // TODO : Fournie contractuellement par l'hôtel

/**
 * Encode les données de réservation au format DESFire EV1/EV2.
 * Utilise AES-128 pour le chiffrement.
 *
 * @param {Object} params - { roomId, checkin, checkout, zones }
 * @returns {Buffer|null}
 */
function encodeReservationDesfire(params) {
  if (!HOTEL_MASTER_KEY_AES) {
    log.warn('[DESFire] Clé AES manquante — encode impossible');
    return null;
  }

  // TODO : Implémenter AES-128 DESFire selon la documentation du fabricant.
  // La structure des fichiers DESFire dépend de l'application configurée par l'hôtel.
  // Exemple général DESFire EV1 :
  //   1. Sélectionner l'application (AID)
  //   2. S'authentifier avec la clé maître
  //   3. Écrire le fichier de données (roomId, checkin, checkout, zones)
  //   Tout cela dans un seul "message" pour le .pkpass
  throw new Error('TODO: encodeReservationDesfire — clé AES requise (fournie par l\'hôtel)');
}

module.exports = { encodeReservationDesfire };
