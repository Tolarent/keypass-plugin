// nfc/mifare.js
// Encodage/décodage MIFARE Classic pour le greffon Electron.
// Module NFC côté greffon — miroir de services/nfc.js côté backend.
//
// TROU CENTRAL : la clé secrète HOTEL_MASTER_KEY manque.
// À obtenir via Proxmark3 le 3 avril ou fournie par l'hôtel.
//
// ═══════════════════════════════════════════════════════════════════════════
// TODO : HOTEL_MASTER_KEY — clé secrète MIFARE de l'hôtel
// Format : Buffer 6 bytes (MIFARE Classic) ou string hex 12 chars
// Obtention :
//   pm3 -c "hf mf autopwn"   → crack automatique (< 1 min sur MIFARE Classic)
//   pm3 -c "hf mf dump"      → dump tous les secteurs une fois la clé trouvée
// ═══════════════════════════════════════════════════════════════════════════

const log = require('electron-log');

// TODO : HOTEL_MASTER_KEY — Clé maître MIFARE de l'hôtel (6 bytes)
// Ne jamais hardcoder ici — lire depuis la config Electron sécurisée
const HOTEL_MASTER_KEY = null; // TODO : process.env.HOTEL_MASTER_KEY ou electron-store

/**
 * Encode les données de réservation au format MIFARE Classic.
 *
 * @param {Object} params - { roomId, checkin, checkout, zones }
 * @returns {Buffer|null} - Données encodées ou null si clé manquante
 */
function encodeReservationMifare(params) {
  const { roomId, checkin, checkout, zones } = params;

  if (!HOTEL_MASTER_KEY) {
    log.warn('[MIFARE] Clé manquante — encode impossible');
    return null;
  }

  // TODO : Implémenter l'encodage MIFARE Classic selon DATA_FORMAT Proxmark3
  // Structure à confirmer le 3 avril :
  //   const buf = Buffer.alloc(16);
  //   buf.writeUInt16BE(parseInt(roomId), 0);         // Chambre (2 bytes)
  //   buf.writeUInt32BE(unixTimestamp(checkin), 2);   // Check-in (4 bytes)
  //   buf.writeUInt32BE(unixTimestamp(checkout), 6);  // Check-out (4 bytes)
  //   buf[10] = zonesToBitmask(zones);                // Zones (1 byte)
  //   return buf;
  throw new Error('TODO: encodeReservationMifare — en attente des données Proxmark3 (3 avril)');
}

/**
 * Décode un secteur MIFARE pour vérifier les données.
 * Utile pour les tests post-Proxmark3.
 *
 * @param {Buffer} data - 16 bytes lus depuis un secteur MIFARE
 * @returns {Object} - { roomId, checkin, checkout, zones }
 */
function decodeReservationMifare(data) {
  if (!HOTEL_MASTER_KEY) return null;

  // TODO : Implémenter après reverse engineering avec Proxmark3
  throw new Error('TODO: decodeReservationMifare — en attente des données Proxmark3 (3 avril)');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function unixTimestamp(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function zonesToBitmask(zones) {
  const bits = { 'Chambre': 1, 'Spa': 2, 'Piscine': 4, 'Parking': 8, 'Salle de sport': 16 };
  let mask = 0;
  for (const z of (zones || [])) if (bits[z]) mask |= bits[z];
  return mask;
}

module.exports = { encodeReservationMifare, decodeReservationMifare };
