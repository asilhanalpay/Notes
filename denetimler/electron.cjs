'use strict';
// Gerçek Electron ana işlemi ve ön yükleme köprüsü; yalnızca geçici bir profil.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { _electron: electron } = require('playwright');
const { expect } = require('@playwright/test');
const { ErisimKasasi } = require('../masaüstü/sürüm-bildirimi.cjs');

test('Gerçek Windows/Electron: yalıtım, yetkisiz iletişim, ağ engeli, temalar ve kapanışta kayıt', {
  skip: process.platform !== 'win32' ? 'Gerçek Windows oturumu gerekir.' : false,
  timeout: 120000
}, async t => {
  const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-electron-'));
  const profil = path.join(gecici, 'profil');
  fs.mkdirSync(profil);
  const proje = path.resolve(__dirname, '..');
  const baslatma = path.join(gecici, 'başlat.cjs');
  // Ürüne denetim anahtarı veya ayrıcalıklı denetim iletişimi eklenmez.
  fs.writeFileSync(baslatma, `const {app}=require('electron');app.setPath('appData',${JSON.stringify(profil)});require(${JSON.stringify(path.join(proje, 'masaüstü/ana.cjs'))});`);
  const notDosyasi = path.join(profil, 'Not Defterim/notlar.json');
  fs.mkdirSync(path.resolve('denetim-çıktıları'), { recursive: true });
  let uygulama;
  let istekSayisi = 0;
  const sunucu = http.createServer((_istek, yanit) => { istekSayisi++; yanit.end('izin verilmemeli'); });
  await new Promise(resolve => sunucu.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    if (uygulama) await uygulama.close();
    await new Promise(resolve => sunucu.close(resolve));
    fs.rmSync(gecici, { recursive: true, force: true });
  });
  const ac = async () => {
    const ortam = { ...process.env };
    delete ortam.ELECTRON_RUN_AS_NODE;
    uygulama = await electron.launch({ args: [baslatma], cwd: proje, env: ortam });
    const sayfa = await uygulama.firstWindow();
    await expect(sayfa.locator('#add')).toBeEnabled();
    return sayfa;
  };
  let sayfa = await ac();
  // Gerçek Windows sağlayıcısı: eski şifreli kayıt yeni API ile okunmalı.
  // Yalnızca geçici profildeki sentetik anahtar kullanılır; GitHub'a bağlanılmaz.
  const sentetikAnahtar = 'github_pat_' + 't'.repeat(30);
  const kasaDosyasi = path.join(profil, 'sentetik-erisim.bin');
  const eskiSifreli = Buffer.from(await uygulama.evaluate(({ safeStorage }, s) => Array.from(safeStorage.encryptString(s)), sentetikAnahtar));
  fs.writeFileSync(kasaDosyasi, eskiSifreli);
  // İşletim sistemi sağlayıcısı gerçek Electron ana işleminde çalışır.
  // evaluate callback'inde CommonJS require varlığına güvenilmez.
  const gercekSifreleme = {
    isAsyncEncryptionAvailable: () => uygulama.evaluate(({ safeStorage }) => safeStorage.isAsyncEncryptionAvailable()),
    decryptStringAsync: b => uygulama.evaluate(({ safeStorage }, d) => safeStorage.decryptStringAsync(Buffer.from(d)), Array.from(b)),
    encryptStringAsync: async s => Buffer.from(await uygulama.evaluate(async ({ safeStorage }, d) => Array.from(await safeStorage.encryptStringAsync(d)), s))
  };
  const kasa = new ErisimKasasi(kasaDosyasi, gercekSifreleme);
  assert.equal(await kasa.oku(), sentetikAnahtar);
  assert.deepEqual(fs.readFileSync(kasaDosyasi), eskiSifreli);
  await kasa.kaydet(sentetikAnahtar);
  assert.equal(await kasa.oku(), sentetikAnahtar);
  kasa.sil();
  const tercihler = await uygulama.evaluate(({ BrowserWindow, app }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const p = w.webContents.getLastWebPreferences();
    return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration, userData: app.getPath('userData') };
  });
  assert.equal(tercihler.userData, path.join(profil, 'Not Defterim'));
  assert.deepEqual([tercihler.sandbox, tercihler.contextIsolation, tercihler.nodeIntegration], [true, true, false]);
  assert.deepEqual(await sayfa.evaluate(() => [typeof require, typeof process, typeof Buffer, typeof window.notDefterim.oku]), ['undefined', 'undefined', 'undefined', 'function']);
  assert.equal(await sayfa.evaluate(() => 'ipcRenderer' in window.notDefterim), false);
  const temaReddi = await sayfa.evaluate(() => window.notDefterim.temaSec('izin-verilmeyen-deger'));
  assert.equal(temaReddi.basarili, false);
  assert.equal(await sayfa.evaluate(() => new Promise(resolve => navigator.geolocation.getCurrentPosition(() => resolve(false), () => resolve(true), { timeout: 5000 }))), true);

  await sayfa.locator('#add').click();
  await sayfa.locator('#title').fill('<img src=x onerror=alert(1)>');
  await sayfa.locator('#body').fill('Türkçe gerçek Electron notu');
  await expect.poll(() => fs.existsSync(notDosyasi) && JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0]?.body).toBe('Türkçe gerçek Electron notu');
  assert.equal(await sayfa.locator('.note img').count(), 0);
  await expect(sayfa.locator('.note strong')).toHaveText('<img src=x onerror=alert(1)>');
  // Chromium, ekran ölçeğine göre kesirli CSS pikseli döndürebilir.
  assert.ok(Math.abs((await sayfa.locator('.sidebar').boundingBox()).width - 230) <= 1);
  assert.equal(await sayfa.locator('.note time').count(), 0);
  await expect(sayfa.locator('#date')).not.toBeEmpty();
  await expect(sayfa.locator('#words')).toHaveText('4 kelime');
  // Yerleşik açılır menü: klavyeyle açma, Tab, Esc ve dışarı tıklama.
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();
  await sayfa.locator('#digerIslemler').focus();
  await sayfa.keyboard.press('Space');
  await expect(sayfa.locator('#dosyaMenusu')).toBeVisible();
  const menuKonumu = await sayfa.locator('#dosyaMenusu').boundingBox();
  const dugmeKonumu = await sayfa.locator('#digerIslemler').boundingBox();
  assert.ok(Math.abs(menuKonumu.x - dugmeKonumu.x) <= 1);
  assert.ok(menuKonumu.y >= 0 && menuKonumu.y + menuKonumu.height <= dugmeKonumu.y);
  await sayfa.keyboard.press('Tab');
  await expect(sayfa.locator('#farkliKaydet')).toBeFocused();
  await sayfa.keyboard.press('Escape');
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();
  await expect(sayfa.locator('#digerIslemler')).toBeFocused();
  await sayfa.locator('#digerIslemler').click();
  await expect(sayfa.locator('#dosyaMenusu')).toBeVisible();
  await sayfa.locator('#body').click();
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();

  // Gerçek UI → IPC → disk: yalnız yerel dosya seçici/Explorer çağrısı taklit
  // edilir. Ürüne test kapısı eklenmez; kişisel profil kullanılmaz.
  const txtHedef = path.join(gecici, 'farklı.txt');
  const txtKlasoru = path.join(profil, 'Not Defterim', 'Kaydedilen notlar');
  await uygulama.evaluate(({ dialog, shell }, hedef) => {
    globalThis.__notesDosyaTesti = { save: dialog.showSaveDialog, open: shell.openPath, acilan: null };
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: hedef });
    shell.openPath = async p => { globalThis.__notesDosyaTesti.acilan = p; return ''; };
  }, txtHedef);
  try {
    await sayfa.locator('#body').fill('Farklı kaydet için son metin\nİğdır');
    await sayfa.locator('#digerIslemler').click();
    await sayfa.locator('#farkliKaydet').click();
    await expect(sayfa.locator('#status')).toHaveText('farklı.txt kaydedildi');
    assert.equal(fs.readFileSync(txtHedef, 'utf8'), '<img src=x onerror=alert(1)>\r\n\r\nFarklı kaydet için son metin\r\nİğdır');
    await sayfa.locator('#body').fill('Uygulama klasörü için son metin');
    await sayfa.locator('#digerIslemler').click();
    await sayfa.locator('#uygulamayaKaydet').click();
    await expect.poll(() => uygulama.evaluate(() => globalThis.__notesDosyaTesti.acilan)).toBe(txtKlasoru);
    const dosyalar = fs.readdirSync(txtKlasoru);
    assert.equal(dosyalar.length, 1);
    assert.ok(dosyalar[0].endsWith('.txt'));
    assert.equal(fs.readFileSync(path.join(txtKlasoru, dosyalar[0]), 'utf8'), '<img src=x onerror=alert(1)>\r\n\r\nUygulama klasörü için son metin');
    assert.equal(JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0].body, 'Uygulama klasörü için son metin');
    await sayfa.locator('#body').fill('Türkçe gerçek Electron notu');
    await sayfa.keyboard.press('Control+s');
    await expect.poll(() => JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0].body).toBe('Türkçe gerçek Electron notu');
  } finally {
    await uygulama.evaluate(({ dialog, shell }) => {
      dialog.showSaveDialog = globalThis.__notesDosyaTesti.save;
      shell.openPath = globalThis.__notesDosyaTesti.open;
      delete globalThis.__notesDosyaTesti;
    });
  }

  // Farklı bir gerçek webContents, geçerli kanal adını bilse de kayıt yapamaz.
  const onceki = fs.readFileSync(notDosyasi, 'utf8');
  const yetkisiz = await uygulama.evaluate(async ({ BrowserWindow }) => {
    const saldirgan = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
    try {
      await saldirgan.loadURL('about:blank');
      return await saldirgan.webContents.executeJavaScript("Promise.all([require('electron').ipcRenderer.invoke('notlar:kaydet', []),require('electron').ipcRenderer.invoke('notlar:farkli-kaydet','bir'),require('electron').ipcRenderer.invoke('notlar:uygulamaya-kaydet','bir')])");
    } finally { saldirgan.destroy(); }
  });
  for (const sonuc of yetkisiz) {
    assert.equal(sonuc.basarili, false);
    assert.equal(sonuc.hata, 'Bu işleme izin verilmiyor.');
  }
  assert.equal(fs.readFileSync(notDosyasi, 'utf8'), onceki);
  const gecersiz = await sayfa.evaluate(() => window.notDefterim.kaydet([{ id: 'x', title: 'Hatalı veri' }]));
  assert.equal(gecersiz.basarili, false);
  assert.equal(fs.readFileSync(notDosyasi, 'utf8'), onceki);

  const adres = `http://127.0.0.1:${sunucu.address().port}/engelli`;
  assert.equal(await sayfa.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, adres), true);
  const anaIslemAgEngeli = await uygulama.evaluate(async ({ BrowserWindow }, url) => {
    const asil = BrowserWindow.getAllWindows()[0];
    const saldirgan = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false, session: asil.webContents.session } });
    try {
      await saldirgan.loadURL('about:blank');
      // CSP içermeyen başka sayfada bile aynı oturumun ağ süzgeci engeller.
      return await saldirgan.webContents.executeJavaScript(`fetch(${JSON.stringify(url)}).then(()=>false,()=>true)`);
    } finally { saldirgan.destroy(); }
  }, adres);
  assert.equal(anaIslemAgEngeli, true);
  assert.equal(istekSayisi, 0);

  await sayfa.locator('#tema').selectOption('karanlik');
  await expect.poll(() => uygulama.evaluate(({ nativeTheme }) => nativeTheme.shouldUseDarkColors)).toBe(true);
  assert.equal(await sayfa.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(9, 9, 9)');
  assert.equal(await sayfa.locator('.sidebar').evaluate(e => getComputedStyle(e).borderRightColor), 'rgb(94, 89, 78)');
  await sayfa.screenshot({ path: 'denetim-çıktıları/karanlık.png', animations: 'disabled' });
  await sayfa.locator('#tema').selectOption('acik');
  await expect.poll(() => uygulama.evaluate(({ nativeTheme }) => nativeTheme.shouldUseDarkColors)).toBe(false);
  assert.equal(await sayfa.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), 'rgb(255, 255, 255)');
  await sayfa.screenshot({ path: 'denetim-çıktıları/açık.png', animations: 'disabled' });
  await sayfa.locator('#digerIslemler').click();
  await sayfa.screenshot({ path: 'denetim-çıktıları/menü.png', animations: 'disabled' });
  await sayfa.keyboard.press('Escape');
  await sayfa.locator('#tema').selectOption('karanlik');
  await sayfa.locator('#body').fill('Ctrl+S ile kaydedilen metin');
  await sayfa.keyboard.press('Control+s');
  await expect.poll(() => JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0].body).toBe('Ctrl+S ile kaydedilen metin');
  await sayfa.locator('#body').fill('Kapanışta beklemeden saklanan son metin');
  const kapandi = uygulama.waitForEvent('close');
  await uygulama.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await kapandi;
  uygulama = null;
  assert.equal(JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0].body, 'Kapanışta beklemeden saklanan son metin');
  sayfa = await ac();
  await expect(sayfa.locator('#body')).toHaveValue('Kapanışta beklemeden saklanan son metin');
  await expect(sayfa.locator('#tema')).toHaveValue('karanlik');

  // Engellenen gezinti Playwright'ın gezinme bekleyicisini açık bırakabilir.
  // Gerçek Electron olayını ve kalan belgeyi doğrudan doğrula; zaman aşımına dayanma.
  const gezinti = await uygulama.evaluate(async ({ BrowserWindow }) => {
    const wc = BrowserWindow.getAllWindows()[0].webContents;
    const oncekiAdres = wc.getURL();
    const olay = new Promise(resolve => wc.once('will-navigate', () => resolve()));
    await wc.executeJavaScript("const a=document.createElement('a');a.href='file:///izin-verilmeyen.html';document.body.append(a);a.click();a.remove();window.open('about:blank');");
    await olay;
    return { oncekiAdres, adres: wc.getURL(), metin: await wc.executeJavaScript("document.getElementById('body').value"), pencereSayisi: BrowserWindow.getAllWindows().length };
  });
  assert.equal(gezinti.adres, gezinti.oncekiAdres);
  assert.equal(gezinti.metin, 'Kapanışta beklemeden saklanan son metin');
  assert.equal(gezinti.pencereSayisi, 1);

});
