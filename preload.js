// preload.js
// Bridge sécurisé entre le processus renderer (HTML) et le processus principal (Node.js).
// Expose uniquement les fonctions nécessaires à l'interface overlay.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('keypass', {
  // Envoyer une clé par iPhone (SMS/email)
  envoyerCleIphone: (reservation) => ipcRenderer.invoke('envoyer-cle-iphone', reservation),

  // Afficher le QR code plein écran
  afficherQR: (reservation) => ipcRenderer.invoke('afficher-qr', reservation),

  // Révoquer une clé au checkout
  revoquerCle: (token) => ipcRenderer.invoke('revoquer-cle', token),

  // Écouter les événements du processus principal
  on: (channel, callback) => {
    const canaux = ['nouvelle-reservation', 'logiciel-info', 'checkout', 'qr-data'];
    if (canaux.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),
});
