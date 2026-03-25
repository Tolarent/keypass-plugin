// installer/setup.js
// Service Windows pour le greffon KeyPass.
// Appelé automatiquement par install.ps1 après la configuration du .env.
//
// Utilisation directe : node installer/setup.js [--uninstall]
// Nécessite des droits administrateur.

const path = require('path');
const log  = require('electron-log');

/**
 * Installe le greffon comme service Windows.
 * Le greffon se lance automatiquement au démarrage de Windows.
 */
async function installer() {
  if (process.platform !== 'win32') {
    console.log('Installation Windows uniquement. Sur macOS/Linux, lancer manuellement avec : npm start');
    return;
  }

  try {
    const { Service } = require('node-windows');
    const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron.cmd');
    const appPath      = path.join(__dirname, '..');

    const svc = new Service({
      name:        'KeyPass Plugin',
      description: 'Greffon KeyPass — Clé digitale hôtel via Apple Wallet',
      script:      appPath,
      execPath:    electronPath,
      nodeOptions: [],
    });

    svc.on('install', () => {
      svc.start();
      console.log('✅ KeyPass Plugin installé et démarré');
      console.log('   Le greffon se lancera automatiquement au démarrage de Windows.');
    });

    svc.on('error', (err) => {
      console.error('❌ Erreur installation :', err.message);
      console.log('   Alternative : Ajouter un raccourci dans le dossier Démarrage Windows.');
    });

    svc.install();
  } catch (err) {
    console.error('❌ node-windows non disponible :', err.message);
    console.log('   Installation manuelle : Ajouter un raccourci vers electron.exe dans');
    console.log('   C:\\Users\\[Utilisateur]\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup');
  }
}

/**
 * Désinstalle le service Windows.
 */
async function desinstaller() {
  if (process.platform !== 'win32') return;

  try {
    const { Service } = require('node-windows');
    const appPath = path.join(__dirname, '..');

    const svc = new Service({
      name:   'KeyPass Plugin',
      script: appPath,
    });

    svc.on('uninstall', () => {
      console.log('✅ KeyPass Plugin désinstallé');
    });

    svc.uninstall();
  } catch (err) {
    console.error('Erreur désinstallation :', err.message);
  }
}

// Lancer l'installation si exécuté directement
if (require.main === module) {
  const action = process.argv[2];
  if (action === '--uninstall') {
    desinstaller();
  } else {
    installer();
  }
}

module.exports = { installer, desinstaller };
