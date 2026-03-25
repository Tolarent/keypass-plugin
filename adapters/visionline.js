// adapters/visionline.js
// Adapter pour ASSA ABLOY Visionline / Vostio — le logiciel le plus répandu en France.
//
// Fonctionnement :
//   Visionline est une application Win32 native (ou Vostio en version moderne REST).
//   Pour Vostio : on utilise l'API REST officielle (documentation sous NDA ASSA ABLOY).
//   Pour Visionline classique : on surveille les événements Windows (hooks WinAPI).
//
// Documentation API Vostio : https://developer.assaabloy.com (accès partenaire requis)

const { exec } = require('child_process');
const log = require('electron-log');
const AdapterBase = require('./base');

class AdapterVisionline extends AdapterBase {
  constructor() {
    super('Visionline/Vostio');
    this._intervalle = null;

    // TODO : Configurer les credentials API Vostio si disponibles.
    // Obtenus en devenant partenaire ASSA ABLOY Developer :
    //   → https://developer.assaabloy.com/en/partner-registration
    // Format : URL de l'API + token JWT
    this._vostioUrl   = process.env.VOSTIO_API_URL   || null;  // TODO : ex: "https://hotel.vostio.com/api/v2"
    this._vostioToken = process.env.VOSTIO_API_TOKEN || null;  // TODO : JWT partenaire ASSA ABLOY
  }

  _demarrerSurveillance() {
    if (this._vostioUrl && this._vostioToken) {
      // Mode Vostio REST API — le plus fiable
      log.info('[Visionline] Mode API Vostio activé');
      this._surveillerViaVostioAPI();
    } else {
      // Mode Win32 classique — surveillance des fenêtres Windows
      log.info('[Visionline] Mode Win32 classique (API Vostio non configurée)');
      this._surveillerViaWin32();
    }
  }

  _arreterSurveillance() {
    if (this._intervalle) {
      clearInterval(this._intervalle);
      this._intervalle = null;
    }
  }

  // ── Mode 1 : API Vostio REST ───────────────────────────────────────────────

  /**
   * Surveille les nouvelles réservations via l'API REST Vostio.
   * Poll toutes les 5 secondes pour les réservations en cours d'encodage.
   *
   * TODO : Implémenter quand les credentials Vostio sont disponibles.
   * Documentation : https://developer.assaabloy.com/vostio-api
   */
  async _surveillerViaVostioAPI() {
    // TODO : Implémenter la surveillance via l'API Vostio REST.
    // Endpoints probables :
    //   GET /api/v2/reservations?status=encoding — réservations en cours d'encodage
    //   GET /api/v2/reservations?status=checkout  — checkouts à traiter
    // Authentification : Bearer token JWT
    log.warn('[Visionline] _surveillerViaVostioAPI() TODO — credentials Vostio requis');

    // Fallback vers Win32 en attendant
    this._surveillerViaWin32();
  }

  // ── Mode 2 : Surveillance Win32 ───────────────────────────────────────────

  /**
   * Surveille les événements de la fenêtre Visionline via PowerShell.
   * Détecte quand l'écran "Encoder carte" est affiché.
   *
   * TODO : Ajuster les sélecteurs de fenêtres lors du premier déploiement.
   * Méthode : Spy++ ou AccessibilityInsights sur le PC de l'hôtel.
   */
  _surveillerViaWin32() {
    if (process.platform !== 'win32') {
      // Sur macOS — afficher l'overlay en mode saisie manuelle (champs vides)
      log.info('[Visionline] Hors Windows — overlay en mode saisie manuelle');
      this.notifierNouvelleCle({ roomId: '', guestName: '', checkin: '', checkout: '', zones: ['Chambre'], source: 'visionline' });
      return;
    }

    this._intervalle = setInterval(() => {
      this._detecterEcranEncodage();
    }, 2000);
  }

  /**
   * Détecte si l'écran "Encoder carte" de Visionline est actif.
   * Utilise PowerShell + UIAutomation pour lire les contrôles de la fenêtre.
   *
   * TODO : Les sélecteurs AutomationId et ClassName sont des placeholders.
   *        À identifier avec Accessibility Insights for Windows sur le site.
   */
  _detecterEcranEncodage() {
    // TODO : Identifier les vrais AutomationId de Visionline avec Spy++ ou UIAVerify
    const cmd = `powershell -Command "
      Add-Type -AssemblyName UIAutomationClient
      $proc = Get-Process visionline -ErrorAction SilentlyContinue
      if (-not $proc) { exit 1 }
      # TODO : Remplacer 'EncoderCartePanel' par le vrai AutomationId de Visionline
      $root = [System.Windows.Automation.AutomationElement]::RootElement
      $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'EncoderCartePanel')
      $panel = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
      if ($panel) {
        # Lire les champs de réservation
        # TODO : Adapter selon les vrais champs Visionline
        Write-Output 'ENCODING_SCREEN_ACTIVE'
      }
    "`;

    exec(cmd, { timeout: 2000 }, (err, stdout) => {
      if (err || !stdout.includes('ENCODING_SCREEN_ACTIVE')) return;

      log.info('[Visionline] Écran encodage détecté');

      // TODO : Extraire les vraies données depuis les champs Visionline
      // Pour l'instant, retourner des données vides que le réceptionniste peut compléter
      this.notifierNouvelleCle({
        roomId:    '', // TODO : Lire depuis le champ "Chambre" de Visionline
        guestName: '', // TODO : Lire depuis le champ "Nom client" de Visionline
        checkin:   '', // TODO : Lire depuis le champ "Arrivée" de Visionline
        checkout:  '', // TODO : Lire depuis le champ "Départ" de Visionline
        zones:     [], // TODO : Lire depuis les cases à cocher Visionline
        source:    'visionline',
      });
    });
  }

}


module.exports = new AdapterVisionline();
