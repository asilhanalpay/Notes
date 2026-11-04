'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, session, powerMonitor, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { SurumBildirimi } = require('./sürüm-bildirimi.cjs');
const { kurulumHazirla } = require('./güncelleme.cjs');
const { NotDosyalari } = require('./not-dosyaları.cjs');
const { NotDeposu } = require('./depolama.cjs');

app.setName('Notes');
// Görünen ad değişse de önceki notlar ve şifreli sürüm bağlantısı aynı yerde kalır.
let baslangicHatasi = false;
try {
  const oncekiVeriYolu = path.join(app.getPath('appData'), 'Not Defterim');
  fs.mkdirSync(oncekiVeriYolu, { recursive: true });
  app.setPath('userData', oncekiVeriYolu);
} catch { baslangicHatasi = true; }
let pencere;
let depo;
let kapanabilir = false;
let surumBildirimleri;
let bekleyenGuncelleme;
let guncellemeKapanisi = false;
const arayuz = path.join(__dirname, '..', 'arayüz', 'pencere.html');
const arayuzAdresi = pathToFileURL(arayuz).href;

function yetkiliMi(olay) {
  return pencere && olay.sender === pencere.webContents &&
    olay.senderFrame === pencere.webContents.mainFrame && olay.senderFrame.url === arayuzAdresi;
}

function islemTanimla(kanal, islem) {
  ipcMain.handle(kanal, async (olay, ...veriler) => {
    if (!yetkiliMi(olay)) return { basarili: false, hata: 'Bu işleme izin verilmiyor.' };
    try {
      return { basarili: true, veri: await islem(...veriler) };
    } catch (hata) {
      console.error(`${kanal}:`, hata.message);
      return { basarili: false, hata: hata.message };
    }
  });
}

function pencereOlustur() {
  kapanabilir = false;
  pencere = new BrowserWindow({
    title: 'Notes', width: 1160, height: 800, minWidth: 800, minHeight: 600,
    backgroundColor: '#ffffff', show: false,
    ...(process.platform === 'win32' ? { accentColor: '#000000' } : {}),
    icon: path.join(__dirname, '..', 'arayüz', 'simge.png'),
    webPreferences: {
      preload: path.join(__dirname, 'köprü.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, spellcheck: false
    }
  });
  pencere.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pencere.webContents.on('will-navigate', olay => olay.preventDefault());
  pencere.webContents.on('will-attach-webview', olay => olay.preventDefault());
  pencere.webContents.on('render-process-gone', () => {
    kapanabilir = true;
    dialog.showErrorBox('Notes kapandı', 'Yazı alanı beklenmedik şekilde kapandı. Son kaydedilen notların korunuyor. Uygulamayı yeniden aç.');
    pencere.close();
  });
  pencere.once('ready-to-show', () => pencere.show());
  pencere.on('close', olay => {
    if (!kapanabilir) {
      olay.preventDefault();
      pencere.webContents.send('uygulama:kapatma-istegi');
    }
  });
  pencere.on('closed', () => { pencere = null; });
  pencere.loadFile(arayuz).catch(() => {
    dialog.showErrorBox('Uygulama açılamadı', 'Uygulama dosyaları eksik. Notes uygulamasını yeniden kur.');
    kapanabilir = true;
    app.quit();
  });
}

if (baslangicHatasi) {
  app.whenReady().then(() => {
    dialog.showErrorBox('Notes açılamadı', 'Not klasörüne erişilemiyor. Verilerin korunması için uygulama açılmadı.');
    app.quit();
  });
} else if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (pencere) { if (pencere.isMinimized()) pencere.restore(); pencere.focus(); }
  });
  app.whenReady().then(() => {
    app.setAppUserModelId('com.asilhanalpay.notdefterim');
    depo = new NotDeposu(app.getPath('userData'));
    const notDosyalari = new NotDosyalari({ depo, veriKlasoru: app.getPath('userData'), dialog, pencere: () => pencere });
    surumBildirimleri = new SurumBildirimi({
      surum: app.getVersion(), paketli: app.isPackaged, platform: process.platform
    });
    surumBildirimleri.on('durum', bilgi => pencere?.webContents.send('surum:durum', bilgi));
    // Yazı alanının ağ erişimi kapalı kalır. Yalnızca ana işlem,
    // sabit herkese açık depodan sürüm bilgisi okuyabilir.
    session.defaultSession.webRequest.onBeforeRequest((ayrinti, yanit) => {
      yanit({ cancel: !ayrinti.url.startsWith('file://') });
    });
    session.defaultSession.setPermissionRequestHandler((_icerik, _izin, yanit) => yanit(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Dosya', submenu: [
        { label: 'Çıkış', accelerator: 'Alt+F4', click: () => pencere?.close() }
      ] },
      { label: 'Düzenle', submenu: [
        { label: 'Geri al', role: 'undo' }, { label: 'Yinele', role: 'redo' },
        { type: 'separator' }, { label: 'Kes', role: 'cut' }, { label: 'Kopyala', role: 'copy' },
        { label: 'Yapıştır', role: 'paste' }, { label: 'Tümünü seç', role: 'selectAll' }
      ] },
      { label: 'Görünüm', submenu: [
        { label: 'Yakınlaştır', role: 'zoomIn' }, { label: 'Uzaklaştır', role: 'zoomOut' },
        { label: 'Gerçek boyut', role: 'resetZoom' }, { label: 'Tam ekran', role: 'togglefullscreen' }
      ] },
      { label: 'Yardım', submenu: [
        { label: 'Notes Hakkında', click: () => dialog.showMessageBox(pencere, {
          type: 'info', title: 'Notes', message: 'Notes',
          detail: `Sürüm: ${app.getVersion()}\nTürkçe ve çevrimdışı not defteri.\n\nİletişim: asilhan.alpay@agentmail.to`, buttons: ['Tamam']
        }) }
      ] }
    ]));
    islemTanimla('surum:durum', () => surumBildirimleri.gorunum());
    islemTanimla('surum:denetle', () => surumBildirimleri.denetle({ elle: true }));
    islemTanimla('surum:iptal', () => {
      if (guncellemeKapanisi) throw new Error('Güncelleme hazırlanıyor. Uygulamanın kapanmasını bekle.');
      return surumBildirimleri.iptalEt();
    });
    islemTanimla('surum:indir', async () => {
      bekleyenGuncelleme = await surumBildirimleri.guncelle(ayar => kurulumHazirla({
        ...ayar, kok: path.join(app.getPath('userData'), 'guncellemeler')
      }));
      // Normal kapanış not düzenleyicisinin son kaydı bitirmesini bekler.
      setImmediate(() => pencere?.close());
      return surumBildirimleri.gorunum();
    });
    islemTanimla('tema:sec', tema => {
      if (!['acik', 'karanlik'].includes(tema)) throw new Error('Tema seçimi geçersiz.');
      nativeTheme.themeSource = tema === 'karanlik' ? 'dark' : 'light';
      pencere.setBackgroundColor(tema === 'karanlik' ? '#090909' : '#ffffff');
    });
    islemTanimla('notlar:oku', () => notDosyalari.oku());
    islemTanimla('notlar:kaydet', notlar => notDosyalari.kaydet(notlar));
    islemTanimla('notlar:farkli-kaydet', (kimlik, not) => notDosyalari.farkliKaydet(kimlik, not));
    islemTanimla('notlar:dosya-ac', () => notDosyalari.dosyaAc());
    islemTanimla('uygulama:kapat', async () => {
      if (bekleyenGuncelleme) {
        if (guncellemeKapanisi) throw new Error('Güncelleme hazırlanıyor.');
        guncellemeKapanisi = true;
        try { await bekleyenGuncelleme.baslat(); }
        catch (hata) {
          guncellemeKapanisi = false;
          bekleyenGuncelleme.temizle(); bekleyenGuncelleme = null;
          surumBildirimleri.mesgul = false;
          surumBildirimleri.bildir('yeni-surum', hata.message, { yeniSurum: surumBildirimleri.yayin?.surum });
          throw hata;
        }
      }
      kapanabilir = true; pencere.close();
    });
    pencereOlustur();
    try {
      const sonucDosyasi = path.join(app.getPath('userData'), 'guncellemeler', 'sonuc.json');
      if (fs.existsSync(sonucDosyasi) && fs.statSync(sonucDosyasi).size < 4096) {
        const sonuc = JSON.parse(fs.readFileSync(sonucDosyasi, 'utf8').replace(/^\uFEFF/, ''));
        if (sonuc.basarili === false) {
          fs.rmSync(sonucDosyasi);
          dialog.showErrorBox('Güncelleme tamamlanamadı', 'Kurulum tamamlanamadı. Notların saklandığı klasör korunur. Yeniden kurmayı deneyebilirsin.');
        }
      }
    } catch { /* Eksik güncelleme günlüğü not düzenleyicisini engellemez. */ }
    void surumBildirimleri.baslat();
    powerMonitor.on('resume', () => { void surumBildirimleri.denetle(); });
    app.on('will-quit', () => surumBildirimleri.durdur());
    app.on('activate', () => { if (!pencere) pencereOlustur(); });
  }).catch(hata => {
    dialog.showErrorBox('Notes açılamadı', hata.message);
    app.quit();
  });
}
app.on('window-all-closed', () => app.quit());
