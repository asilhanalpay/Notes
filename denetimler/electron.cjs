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
  assert.equal((await sayfa.locator('.sidebar').boundingBox()).width, 230);
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
  await expect(sayfa.locator('#yedekle')).toBeFocused();
  await sayfa.keyboard.press('Escape');
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();
  await expect(sayfa.locator('#digerIslemler')).toBeFocused();
  await sayfa.locator('#digerIslemler').click();
  await expect(sayfa.locator('#dosyaMenusu')).toBeVisible();
  await sayfa.locator('#body').click();
  await expect(sayfa.locator('#dosyaMenusu')).not.toBeVisible();

  // Farklı bir gerçek webContents, geçerli kanal adını bilse de kayıt yapamaz.
  const onceki = fs.readFileSync(notDosyasi, 'utf8');
  const yetkisiz = await uygulama.evaluate(async ({ BrowserWindow }) => {
    const saldirgan = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
    try {
      await saldirgan.loadURL('about:blank');
      return await saldirgan.webContents.executeJavaScript("require('electron').ipcRenderer.invoke('notlar:kaydet', [])");
    } finally { saldirgan.destroy(); }
  });
  assert.equal(yetkisiz.basarili, false);
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
