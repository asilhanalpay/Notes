'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Arayüze dosya sistemi veya genel amaçlı iletişim yetkisi verilmez.
contextBridge.exposeInMainWorld('notDefterim', Object.freeze({
  surumDurumu: () => ipcRenderer.invoke('surum:durum'),
  surumDenetle: () => ipcRenderer.invoke('surum:denetle'),
  surumBagla: anahtar => ipcRenderer.invoke('surum:bagla', anahtar),
  surumAyir: () => ipcRenderer.invoke('surum:ayir'),
  surumIndir: () => ipcRenderer.invoke('surum:indir'),
  surumIzinSayfasi: () => ipcRenderer.invoke('surum:izin'),
  surumDinle: islem => {
    const dinleyici = (_olay, bilgi) => islem(bilgi);
    ipcRenderer.on('surum:durum', dinleyici);
    return () => ipcRenderer.removeListener('surum:durum', dinleyici);
  },
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
