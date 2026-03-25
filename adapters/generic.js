// adapters/generic.js
// Adapter générique — fallback quand le logiciel hôtel n'est pas reconnu.
// L'overlay s'affiche en permanence et le réceptionniste saisit manuellement les données.

const log = require('electron-log');
const AdapterBase = require('./base');

class AdapterGenerique extends AdapterBase {
  constructor() {
    super('Générique');
  }

  _demarrerSurveillance() {
    log.info('[Generic] Mode générique — overlay permanent, saisie manuelle');
    // L'overlay est toujours visible avec des champs vides.
    // Le réceptionniste saisit les données de la réservation manuellement.
    this.notifierNouvelleCle({
      roomId:    '',
      guestName: '',
      checkin:   new Date().toISOString().slice(0, 10),
      checkout:  new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      zones:     ['Chambre'],
      source:    'generic',
    });
  }
}

module.exports = new AdapterGenerique();
