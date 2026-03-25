// core/detector.js
// Détecte quel logiciel de gestion hôtelière est en cours d'exécution sur le PC.
// Scan des processus Windows (tasklist) toutes les 3 secondes depuis main.js.

const { exec } = require('child_process');
const log = require('electron-log');

// ── Logiciels hôteliers connus ─────────────────────────────────────────────
// Ajouter ici tout nouveau logiciel rencontré chez un hôtel client.
// L'adapter correspond aux fichiers dans adapters/*.js
const LOGICIELS_CONNUS = {
  // ASSA ABLOY — le plus courant en France (hôtels 2-3 étoiles)
  'visionline.exe':  { name: 'ASSA ABLOY Visionline',  adapter: 'visionline',  editeur: 'ASSA ABLOY' },
  'vostio.exe':      { name: 'ASSA ABLOY Vostio',       adapter: 'visionline',  editeur: 'ASSA ABLOY' },

  // Dormakaba — second plus courant
  'ambiance.exe':    { name: 'Dormakaba Ambiance',      adapter: 'ambiance',    editeur: 'Dormakaba' },
  'dkey.exe':        { name: 'Dormakaba D-Key',         adapter: 'ambiance',    editeur: 'Dormakaba' },

  // Salto Systems
  'saltoks.exe':     { name: 'Salto KS',                adapter: 'salto',       editeur: 'Salto Systems' },
  'salto space.exe': { name: 'Salto Space',             adapter: 'salto',       editeur: 'Salto Systems' },
  'proaccesso.exe':  { name: 'Salto ProAcceso',         adapter: 'salto',       editeur: 'Salto Systems' },

  // Onity (Allegion)
  'onity.exe':       { name: 'Onity Suite',             adapter: 'generic',     editeur: 'Onity' },
  'engage.exe':      { name: 'Allegion Engage',         adapter: 'generic',     editeur: 'Allegion' },

  // VingCard (Assa Abloy haut de gamme)
  'vingcard.exe':    { name: 'VingCard Vision',         adapter: 'generic',     editeur: 'VingCard' },
  'vcmanager.exe':   { name: 'VingCard Manager',        adapter: 'generic',     editeur: 'VingCard' },

  // Miwa Lock (Japan / hôtels asiatiques en France)
  'miwakeycard.exe': { name: 'Miwa Key Card',           adapter: 'generic',     editeur: 'Miwa Lock' },
};

// ── Détection ──────────────────────────────────────────────────────────────

/**
 * Scanne la liste des processus Windows et retourne le logiciel hôtel trouvé.
 * @returns {Promise<{name, adapter, editeur, exe} | null>}
 *   - L'objet décrivant le logiciel trouvé, ou null si aucun n'est actif.
 */
async function detecterLogiciel() {
  // Sur macOS/Linux : pas de tasklist Windows — on retourne directement l'adapter générique
  // pour que l'overlay s'affiche immédiatement en mode saisie manuelle.
  if (process.platform !== 'win32') {
    return { name: 'Mode manuel', adapter: 'generic', editeur: 'KeyPass', exe: 'generic' };
  }

  return new Promise((resolve) => {
    exec('tasklist /FO CSV /NH', { timeout: 5000 }, (err, stdout) => {
      if (err) {
        log.warn('[Detector] Erreur tasklist :', err.message);
        // En cas d'erreur Windows, fallback vers l'adapter générique (overlay manuel)
        resolve({ name: 'Mode manuel', adapter: 'generic', editeur: 'KeyPass', exe: 'generic' });
        return;
      }

      const lignes = stdout.toLowerCase();

      for (const [exe, info] of Object.entries(LOGICIELS_CONNUS)) {
        if (lignes.includes(exe.toLowerCase())) {
          log.debug('[Detector] Trouvé :', exe);
          resolve({ ...info, exe });
          return;
        }
      }

      // Aucun logiciel connu — overlay en mode saisie manuelle
      log.info('[Detector] Aucun logiciel hôtel détecté — mode manuel');
      resolve({ name: 'Mode manuel', adapter: 'generic', editeur: 'KeyPass', exe: 'generic' });
    });
  });
}

/**
 * Récupère la position et la taille de la fenêtre du logiciel hôtel.
 * Utilisé par overlay.js pour positionner les boutons au bon endroit.
 *
 * @param {string} exe - Nom de l'exécutable (ex: "visionline.exe")
 * @returns {Promise<{x, y, width, height} | null>}
 */
async function getPositionFenetre(exe) {
  if (process.platform !== 'win32') return { x: 800, y: 300, width: 1024, height: 768 };

  return new Promise((resolve) => {
    // Utilise PowerShell pour obtenir la position de la fenêtre
    const cmd = `powershell -Command "
      Add-Type @'
        using System;
        using System.Runtime.InteropServices;
        public class WinAPI {
          [DllImport(\\"user32.dll\\")] public static extern IntPtr FindWindow(string c, string t);
          [DllImport(\\"user32.dll\\")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
          public struct RECT { public int Left, Top, Right, Bottom; }
        }
'@
      $proc = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Where-Object { $_.ProcessName -like '${exe.replace('.exe', '')}' } | Select-Object -First 1
      if ($proc) {
        $rect = New-Object WinAPI+RECT
        [WinAPI]::GetWindowRect($proc.MainWindowHandle, [ref]$rect) | Out-Null
        Write-Output ('$($rect.Left),$($rect.Top),$($rect.Right - $rect.Left),$($rect.Bottom - $rect.Top)')
      }
    "`;

    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve(null); return; }
      const [x, y, width, height] = stdout.trim().split(',').map(Number);
      resolve({ x, y, width, height });
    });
  });
}


module.exports = { detecterLogiciel, getPositionFenetre, LOGICIELS_CONNUS };
