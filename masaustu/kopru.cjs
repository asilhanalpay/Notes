'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Arayüze dosya sistemi veya genel amaçlı iletişim yetkisi verilmez.
contextBridge.exposeInMainWorld('notDefterim', Object.freeze({
  oku: () => ipcRenderer.invoke('notlar:oku'),
  kaydet: notlar => ipcRenderer.invoke('notlar:kaydet', notlar),
  yedekle: () => ipcRenderer.invoke('notlar:yedekle'),
  iceAktar: () => ipcRenderer.invoke('notlar:ice-aktar'),
  klasoruAc: () => ipcRenderer.invoke('notlar:klasor'),
  kapat: () => ipcRenderer.invoke('uygulama:kapat'),
  kapatmaIsteginiDinle: islem => {
    ipcRenderer.on('uygulama:kapatma-istegi', () => islem());
  }
}));
