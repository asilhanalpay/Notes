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
  await sayfa.locator('#surumler').click();
  assert.equal(await sayfa.locator('#erisimFormu').count(), 0);
  assert.equal(await sayfa.locator('#erisimAnahtari').count(), 0);
  assert.equal(await sayfa.evaluate(() => typeof window.notDefterim.surumBagla), 'undefined');
  await sayfa.locator('#surumKapat').click();
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
  const tercihler = await uygulama.evaluate(({ BrowserWindow, app, systemPreferences }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const p = w.webContents.getLastWebPreferences();
    const kenar = w.getAccentColor();
    return { sandbox: p.sandbox, contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration, userData: app.getPath('userData'),
      kenar: kenar === true ? systemPreferences.getAccentColor() : kenar };
  });
  assert.equal(tercihler.userData, path.join(profil, 'Not Defterim'));
  assert.deepEqual([tercihler.sandbox, tercihler.contextIsolation, tercihler.nodeIntegration], [true, true, false]);
  assert.match(String(tercihler.kenar).replace(/^#/, ''), /^000000(?:ff)?$/i);
  assert.equal(await sayfa.evaluate(() => getComputedStyle(document.body).borderTopColor), 'rgb(0, 0, 0)');
  assert.equal(await sayfa.locator('.workspace').evaluate(e => getComputedStyle(e).boxShadow), 'none');
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
  await sayfa.keyboard.press('Tab');
  await expect(sayfa.locator('#dosyaAc')).toBeFocused();
  assert.equal(await sayfa.locator('#dosyaMenusu button').count(), 2);
  await sayfa.keyboard.press('Escape');
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();
  await expect(sayfa.locator('#digerIslemler')).toBeFocused();
  await sayfa.locator('#digerIslemler').click();
  await expect(sayfa.locator('#dosyaMenusu')).toBeVisible();
  await sayfa.locator('#body').click();
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();

  // Gerçek UI → IPC → disk; yalnız yerel dosya seçicileri sentetik yollar döndürür.
  const txtHedef = path.join(gecici, 'farklı.txt');
  const acilanTxt = path.join(gecici, 'açılan.txt');
  const kurtarilanTxt = path.join(gecici, 'kurtarılan.txt');
  fs.writeFileSync(acilanTxt, 'Dosyadaki bütün metin\r\nİğdır\r\n');
  await uygulama.evaluate(({ dialog }, hedefler) => {
    globalThis.__notesDosyaTesti = { save: dialog.showSaveDialog, open: dialog.showOpenDialog, hedef: hedefler.hedef };
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: globalThis.__notesDosyaTesti.hedef });
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [hedefler.acilan] });
  }, { hedef: txtHedef, acilan: acilanTxt });
  try {
    await sayfa.locator('#body').fill('Farklı kaydet için son metin\nİğdır');
    await sayfa.locator('#digerIslemler').click();
    await sayfa.locator('#farkliKaydet').click();
    await expect(sayfa.locator('#status')).toHaveText('farklı.txt kaydedildi');
    assert.equal(fs.readFileSync(txtHedef, 'utf8'), 'Farklı kaydet için son metin\r\nİğdır');
    await sayfa.locator('#digerIslemler').click();
    await sayfa.locator('#dosyaAc').click();
    await expect(sayfa.locator('#body')).toHaveValue('Dosyadaki bütün metin\nİğdır\n');
    await expect(sayfa.locator('#status')).toContainText('açılan.txt açıldı');
    await sayfa.locator('#body').fill('Aynı dosyaya son metin\nİğdır');
    await sayfa.keyboard.press('Control+s');
    await expect.poll(() => fs.readFileSync(acilanTxt, 'utf8')).toBe('Aynı dosyaya son metin\r\nİğdır');
    // Dış düzenleme ezilmez, yerel kopya saklanır ve kapanış engellenir.
    fs.writeFileSync(acilanTxt, 'Dışarıdaki düzenleme');
    await sayfa.locator('#body').fill('Notes içindeki kurtarılacak metin');
    await sayfa.keyboard.press('Control+s');
    await expect(sayfa.locator('#status')).toHaveText('Kaydedilemedi');
    assert.equal(fs.readFileSync(acilanTxt, 'utf8'), 'Dışarıdaki düzenleme');
    assert.equal(JSON.parse(fs.readFileSync(notDosyasi, 'utf8')).notlar[0].body, 'Notes içindeki kurtarılacak metin');
    await uygulama.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    await expect(sayfa.locator('#body')).toBeEnabled();
    await uygulama.evaluate((_, hedef) => { globalThis.__notesDosyaTesti.hedef = hedef; }, kurtarilanTxt);
    await sayfa.locator('#digerIslemler').click();
    await sayfa.locator('#farkliKaydet').click();
    await expect(sayfa.locator('#status')).toHaveText('kurtarılan.txt kaydedildi');
    assert.equal(fs.readFileSync(kurtarilanTxt, 'utf8'), 'Notes içindeki kurtarılacak metin');
    await sayfa.locator('#body').fill('Türkçe gerçek Electron notu');
    await sayfa.keyboard.press('Control+s');
    await expect.poll(() => fs.readFileSync(kurtarilanTxt, 'utf8')).toBe('Türkçe gerçek Electron notu');
  } finally {
    await uygulama.evaluate(({ dialog }) => {
      dialog.showSaveDialog = globalThis.__notesDosyaTesti.save;
      dialog.showOpenDialog = globalThis.__notesDosyaTesti.open;
      delete globalThis.__notesDosyaTesti;
    });
  }

  // Farklı bir gerçek webContents, geçerli kanal adını bilse de kayıt yapamaz.
  const onceki = fs.readFileSync(notDosyasi, 'utf8');
  const yetkisiz = await uygulama.evaluate(async ({ BrowserWindow }) => {
    const saldirgan = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
    try {
      await saldirgan.loadURL('about:blank');
      return await saldirgan.webContents.executeJavaScript("Promise.all([require('electron').ipcRenderer.invoke('notlar:kaydet', []),require('electron').ipcRenderer.invoke('notlar:farkli-kaydet','bir'),require('electron').ipcRenderer.invoke('notlar:dosya-ac')])");
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
  assert.equal(await sayfa.locator('.sidebar').evaluate(e => getComputedStyle(e).borderRightColor), 'rgb(102, 102, 102)');
  const odakSiniri = await sayfa.locator('#body').evaluate(e => {
    const stil = getComputedStyle(e), alan = e.getBoundingClientRect(), kapsayici = e.parentElement.getBoundingClientRect();
    return { alt: alan.bottom + parseFloat(stil.outlineWidth) + parseFloat(stil.outlineOffset), sinir: kapsayici.bottom };
  });
  assert.ok(odakSiniri.alt <= odakSiniri.sinir + 1, 'Yazı alanının odak çizgisi kırpılmamalı.');
  assert.equal(await sayfa.evaluate(() => getComputedStyle(document.body).borderTopColor), 'rgb(0, 0, 0)');
  const karanlikKenar = await uygulama.evaluate(({ BrowserWindow, systemPreferences }) => {
    const kenar = BrowserWindow.getAllWindows()[0].getAccentColor();
    return kenar === true ? systemPreferences.getAccentColor() : kenar;
  });
  assert.match(String(karanlikKenar).replace(/^#/, ''), /^000000(?:ff)?$/i);
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
  await expect(sayfa.locator('#date')).toContainText('kurtarılan.txt');
  await sayfa.locator('#body').fill('Yeniden açılışta bağlı TXT');
  await sayfa.keyboard.press('Control+s');
  await expect.poll(() => fs.readFileSync(kurtarilanTxt, 'utf8')).toBe('Yeniden açılışta bağlı TXT');
  await sayfa.locator('#body').fill('Kapanışta beklemeden saklanan son metin');
  await sayfa.keyboard.press('Control+s');
  await expect.poll(() => fs.readFileSync(kurtarilanTxt, 'utf8')).toBe('Kapanışta beklemeden saklanan son metin');

  // Yüksek yakınlaştırmada düzenleyiciye kaydırılarak ulaşılabilir; not değişmez.
  await uygulama.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(2));
  await sayfa.locator('#body').scrollIntoViewIfNeeded();
  const yakinlastirma = await sayfa.locator('#body').evaluate(e => {
    const r = e.getBoundingClientRect();
    return { ust: r.top, alt: r.bottom, yukseklik: innerHeight, tasma: getComputedStyle(document.body).overflowY };
  });
  assert.equal(yakinlastirma.tasma, 'auto');
  assert.ok(yakinlastirma.ust >= -1 && yakinlastirma.alt <= yakinlastirma.yukseklik + 1);
  await expect(sayfa.locator('#body')).toHaveValue('Kapanışta beklemeden saklanan son metin');
  await uygulama.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));

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
