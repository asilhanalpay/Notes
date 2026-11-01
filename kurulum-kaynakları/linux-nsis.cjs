'use strict';

// Linux bulut ortamı için isteğe bağlı, sürüme bağlı derleme uyarlayıcısı.
// electron-builder aynı okuyucuyu macOS'ta NSIS kaldırıcısını çıkarmak için kullanır.
// Standart Windows komutunu ve uygulamaya paketlenen dosyaları değiştirmez.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function paketle() {
  if (process.platform !== 'linux') throw new Error('Bu komut yalnız Linux içindir; Windows üzerinde paketle:windows kullan.');
  assert.equal(require('electron-builder/package.json').version, '26.18.1', 'Linux NSIS uyarlayıcısı yeni builder sürümüyle tekrar doğrulanmalı.');
  assert.equal(require('app-builder-lib/package.json').version, '26.18.1');
  const argumanlar = process.argv.slice(2);
  if (argumanlar.some(a => a !== '--aday') || argumanlar.length > 1) throw new Error('Yalnız --aday seçeneği destekleniyor.');
  const { build, Platform, Arch } = require('electron-builder');
  const { WineVmManager } = require('app-builder-lib/out/vm/WineVm');
  const { UninstallerReader } = require('app-builder-lib/out/targets/nsis/nsisUtil');
  const proje = path.resolve(__dirname, '..');
  const ayarlar = argumanlar.includes('--aday') ? require('./güçlendirme-adayı.cjs') : require('../package.json').build;
  const cikti = path.resolve(proje, ayarlar.directories.output);
  const oncekiExec = WineVmManager.prototype.exec;
  let cikarildi = false;
  WineVmManager.prototype.exec = async function (dosya, args = [], secenekler = {}) {
    // Yalnız builder'ın iki aşamalı NSIS üretimindeki kendi geçici çıktısı.
    // Başka Wine çağrıları sessizce emüle edilmez veya çalıştırılmaz.
    assert.equal(path.resolve(dosya), path.join(cikti, 'Notes.exe'));
    assert.equal(fs.realpathSync(path.dirname(dosya)), fs.realpathSync(cikti));
    assert.equal(args.length, 0);
    assert.equal(secenekler.env?.__COMPAT_LAYER, 'RunAsInvoker');
    assert.equal(cikarildi, false, 'Beklenmeyen ikinci kaldırıcı çıkarma çağrısı.');
    const kaldirici = path.join(cikti, 'Notes.__uninstaller.exe');
    await UninstallerReader.exec(dosya, kaldirici);
    const baytlar = fs.readFileSync(kaldirici);
    assert.ok(baytlar.length > 1024 && baytlar.subarray(0, 2).toString() === 'MZ');
    const pe = baytlar.readUInt32LE(0x3c);
    assert.ok(pe + 4 <= baytlar.length && baytlar.subarray(pe, pe + 4).equals(Buffer.from([80, 69, 0, 0])));
    cikarildi = true;
    console.log('NSIS kaldırıcı, electron-builder yerel okuyucusuyla çıkarıldı.');
    return '';
  };
  try {
    const config = { ...ayarlar };
    if (process.env.NOTES_ELECTRON_CACHE) config.electronDownload = { cache: process.env.NOTES_ELECTRON_CACHE };
    await build({ projectDir: proje, config, targets: Platform.WINDOWS.createTarget('nsis', Arch.x64), publish: 'never' });
    assert.equal(cikarildi, true, 'Yerel NSIS yolu kullanılmadı.');
  } finally { WineVmManager.prototype.exec = oncekiExec; }
}

paketle().catch(hata => { console.error(hata.message); process.exitCode = 1; });
