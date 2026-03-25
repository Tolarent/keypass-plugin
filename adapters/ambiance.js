// adapters/ambiance.js
// Adapter pour Dormakaba Ambiance / D-Key.
//
// API disponible : Dormakaba B-COMM (documentation sous NDA Dormakaba)
// Contact : https://www.dormakaba.com/fr-fr/contact
//
// TODO : Implémenter quand un hôtel Dormakaba est client.

const log = require('electron-log');
const AdapterBase = require('./base');

class AdapterAmbiance extends AdapterBase {
  constructor() {
    super('Dormakaba Ambiance');

    // TODO : Configurer les credentials API B-COMM Dormakaba
    // Obtenus via le programme partenaire Dormakaba
    this._bcommUrl   = process.env.DORMAKABA_BCOMM_URL   || null;  // TODO : URL API B-COMM
    this._bcommToken = process.env.DORMAKABA_BCOMM_TOKEN || null;  // TODO : Token B-COMM
  }

  _demarrerSurveillance() {
    if (process.platform !== 'win32') {
      log.info('[Ambiance] Hors Windows — overlay en mode saisie manuelle');
      this.notifierNouvelleCle({ roomId: '', guestName: '', checkin: '', checkout: '', zones: ['Chambre'], source: 'ambiance' });
      return;
    }

    if (this._bcommUrl) {
      log.info('[Ambiance] API B-COMM configurée');
      this._surveillerViaBCOMM();
    } else {
      log.info('[Ambiance] Mode Win32 (API B-COMM non configurée)');
      this._surveillerViaWin32();
    }
  }

  // TODO : Implémenter _surveillerViaBCOMM() selon documentation Dormakaba
  _surveillerViaBCOMM() {
    log.warn('[Ambiance] _surveillerViaBCOMM() TODO — credentials B-COMM requis');
    this._surveillerViaWin32();
  }

  // TODO : Identifier les contrôles Win32 de Ambiance.exe avec Spy++
  _surveillerViaWin32() {
    log.warn('[Ambiance] _surveillerViaWin32() TODO — à implémenter lors du premier déploiement Dormakaba');
    // Fallback : overlay visible en permanence, données saisies manuellement
    this.notifierNouvelleCle({ roomId: '', guestName: '', checkin: '', checkout: '', zones: [], source: 'ambiance' });
  }

  _arreterSurveillance() {
    if (this._intervalle) clearInterval(this._intervalle);
  }
}

module.exports = new AdapterAmbiance();
