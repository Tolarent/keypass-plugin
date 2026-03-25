// adapters/salto.js
// Adapter pour Salto KS / Salto Space.
//
// API disponible : Salto KS API (REST, documentation publique avec inscription)
// Documentation : https://developers.saltosystems.com
// Authentification : OAuth 2.0

const log = require('electron-log');
const AdapterBase = require('./base');

class AdapterSalto extends AdapterBase {
  constructor() {
    super('Salto KS');

    // TODO : Configurer les credentials API Salto KS
    // Inscription gratuite sur https://developers.saltosystems.com
    this._saltoClientId     = process.env.SALTO_CLIENT_ID     || null;  // TODO : OAuth client_id
    this._saltoClientSecret = process.env.SALTO_CLIENT_SECRET || null;  // TODO : OAuth client_secret
    this._saltoSiteId       = process.env.SALTO_SITE_ID       || null;  // TODO : Identifiant du site hôtel
  }

  _demarrerSurveillance() {
    if (process.platform !== 'win32') {
      log.info('[Salto] Hors Windows — overlay en mode saisie manuelle');
      this.notifierNouvelleCle({ roomId: '', guestName: '', checkin: '', checkout: '', zones: ['Chambre'], source: 'salto' });
      return;
    }

    if (this._saltoClientId && this._saltoClientSecret) {
      log.info('[Salto] API Salto KS configurée');
      this._surveillerViaSaltoAPI();
    } else {
      log.warn('[Salto] Credentials API manquants — mode Win32 fallback');
      this._surveillerViaWin32();
    }
  }

  // TODO : Implémenter avec OAuth 2.0 Salto KS
  async _surveillerViaSaltoAPI() {
    log.warn('[Salto] _surveillerViaSaltoAPI() TODO — OAuth Salto KS requis');
    // Documentation : https://developers.saltosystems.com/api-reference
    // Endpoint probable : GET /v1.1/access_points?status=encoding
    this._surveillerViaWin32();
  }

  // TODO : Identifier les contrôles Win32 de saltoks.exe avec Spy++
  _surveillerViaWin32() {
    log.warn('[Salto] _surveillerViaWin32() TODO — à implémenter lors du premier déploiement Salto');
    this.notifierNouvelleCle({ roomId: '', guestName: '', checkin: '', checkout: '', zones: [], source: 'salto' });
  }

  _arreterSurveillance() {
    if (this._intervalle) clearInterval(this._intervalle);
  }
}

module.exports = new AdapterSalto();
