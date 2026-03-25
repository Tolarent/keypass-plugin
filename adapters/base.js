// adapters/base.js
// Classe de base pour tous les adapters de logiciels hôteliers.
// Chaque adapter étend cette classe et implémente les méthodes abstraites.

const log = require('electron-log');

class AdapterBase {
  constructor(nom) {
    this.nom    = nom;
    this.actif  = false;
    this.overlayWin = null;
  }

  /**
   * Démarre la surveillance du logiciel hôtel.
   * @param {BrowserWindow} overlayWin - Fenêtre overlay à notifier
   */
  demarrer(overlayWin) {
    this.overlayWin = overlayWin;
    this.actif      = true;
    log.info(`[${this.nom}] Adapter démarré`);
    this._demarrerSurveillance();
  }

  /**
   * Arrête la surveillance.
   */
  arreter() {
    this.actif = false;
    log.info(`[${this.nom}] Adapter arrêté`);
    this._arreterSurveillance();
  }

  /**
   * Notifie l'overlay qu'une nouvelle réservation est détectée.
   * L'overlay affiche alors les boutons KeyPass.
   *
   * @param {Object} reservation - { roomId, guestName, checkin, checkout, zones }
   */
  notifierNouvelleCle(reservation) {
    if (this.overlayWin && !this.overlayWin.isDestroyed()) {
      log.info(`[${this.nom}] Nouvelle réservation détectée :`, reservation);
      this.overlayWin.webContents.send('nouvelle-reservation', reservation);
      this.overlayWin.show();
    }
  }

  /**
   * Notifie l'overlay d'un checkout (pour révoquer la clé).
   * @param {string} token - Token de la clé à révoquer
   */
  notifierCheckout(token) {
    if (this.overlayWin && !this.overlayWin.isDestroyed()) {
      log.info(`[${this.nom}] Checkout détecté, token :`, token);
      this.overlayWin.webContents.send('checkout', { token });
    }
  }

  // ── Méthodes à surcharger dans chaque adapter ────────────────────────────

  /**
   * Démarre la surveillance spécifique au logiciel.
   * À implémenter dans chaque adapter.
   */
  _demarrerSurveillance() {
    throw new Error(`${this.nom}._demarrerSurveillance() non implémenté`);
  }

  /**
   * Arrête la surveillance spécifique.
   * À implémenter dans chaque adapter.
   */
  _arreterSurveillance() {
    // Par défaut : rien à faire
  }
}

module.exports = AdapterBase;
