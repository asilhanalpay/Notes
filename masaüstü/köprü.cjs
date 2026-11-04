'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Arayüze dosya sistemi veya genel amaçlı iletişim yetkisi verilmez.
contextBridge.exposeInMainWorld('notDefterim', Object.freeze({
  temaSec: tema => ipcRenderer.invoke('tema:sec', tema),
  surumDurumu: () => ipcRenderer.invoke('surum:durum'),
  surumDenetle: () => ipcRenderer.invoke('surum:denetle'),
  surumIptal: () => ipcRenderer.invoke('surum:iptal'),
  surumIndir: () => ipcRenderer.invoke('surum:indir'),
  surumDinle: islem => {
    const dinleyici = (_olay, bilgi) => islem(bilgi);
    ipcRenderer.on('surum:durum', dinleyici);
    return () => ipcRenderer.removeListener('surum:durum', dinleyici);
  },
  oku: () => ipcRenderer.invoke('notlar:oku'),
  kaydet: notlar => ipcRenderer.invoke('notlar:kaydet', notlar),
  farkliKaydet: (kimlik, not) => ipcRenderer.invoke('notlar:farkli-kaydet', kimlik, not),
  dosyaAc: () => ipcRenderer.invoke('notlar:dosya-ac'),
  kapat: () => ipcRenderer.invoke('uygulama:kapat'),
  kapatmaIsteginiDinle: islem => {
    ipcRenderer.on('uygulama:kapatma-istegi', () => islem());
  }
}));
