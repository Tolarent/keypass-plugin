// api/client.js
// Client HTTP pour les appels vers l'API keypasshotel.com depuis le greffon Electron.

const axios = require('axios');
const log   = require('electron-log');

// URL du backend — définie dans .env (BACKEND_URL) par l'installateur.
const BASE_URL = process.env.BACKEND_URL || process.env.KEYPASS_API_URL || 'https://www.keypasshotel.com/api';

// Clé API hôtel — définie dans .env (API_KEY) par l'installateur.
// Doit correspondre à la variable HOTEL_API_KEY définie sur Vercel.
const HOTEL_API_KEY = process.env.API_KEY || process.env.HOTEL_API_KEY || null;

if (!HOTEL_API_KEY) {
  log.warn('[API] API_KEY non configurée — les appels protégés seront refusés par le serveur');
  log.warn('[API] Relancer install.ps1 ou renseigner API_KEY dans le fichier .env du greffon');
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent':   'KeyPass-Plugin/1.0.0',
  },
});

// Injecter la clé API dans chaque requête protégée
api.interceptors.request.use((config) => {
  if (HOTEL_API_KEY) config.headers['X-API-Key'] = HOTEL_API_KEY;
  return config;
});

// Log des erreurs réseau
api.interceptors.response.use(
  (response) => response,
  (error) => {
    log.error('[API] Erreur :', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// ── Endpoints ──────────────────────────────────────────────────────────────

/**
 * Vérifie que le serveur KeyPass est accessible.
 * @returns {Promise<boolean>}
 */
async function checkHealth() {
  try {
    const response = await api.get('/api/health');
    log.info('[API] Serveur OK — version', response.data.version);
    return true;
  } catch {
    return false;
  }
}

/**
 * Crée une nouvelle clé digitale et génère le .pkpass.
 *
 * @param {Object} reservation - { roomId, guestName, guestEmail, checkin, checkout, zones }
 * @returns {Promise<Object>} - { ok, key, qrImageBase64, passGenerated, emailSent }
 */
async function creerCle(reservation) {
  const response = await api.post('/api/keys', {
    guest_phone: reservation.guestPhone || null,
    room_id:     reservation.roomId,
    checkin:     reservation.checkin,
    checkout:    reservation.checkout,
    zones:       reservation.zones || ['Chambre'],
  });
  log.info('[API] Clé créée :', response.data.key?.keyId);
  return response.data;
}

/**
 * Révoque une clé existante (appelé au checkout).
 * @param {string} token - Token unique de la clé
 * @returns {Promise<Object>} - { ok }
 */
async function revoquerCle(token) {
  const response = await api.delete(`/api/keys/${token}`);
  log.info('[API] Clé révoquée :', token);
  return response.data;
}

/**
 * Liste les clés actives pour cet hôtel.
 * @returns {Promise<Object[]>}
 */
async function listerCles() {
  const response = await api.get('/api/keys/active');
  return response.data.keys || [];
}

module.exports = { checkHealth, creerCle, revoquerCle, listerCles };
