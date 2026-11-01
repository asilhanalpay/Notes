'use strict';

// Gerçek Windows paketinin statik denetimi; EXE çalıştırmaz, paketi değiştirmez.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const asar = require('@electron/asar');
const { getCurrentFuseWire, FuseV1Options } = require('@electron/fuses');
const { NtExecutable, NtExecutableResource } = require('resedit');

async function denetle(klasor) {
  const exe = path.join(klasor, 'Notes.exe');
  const arsiv = path.join(klasor, 'resources', 'app.asar');
  const tel = await getCurrentFuseWire(exe);
  const beklenen = {
    RunAsNode: 48,
    EnableNodeOptionsEnvironmentVariable: 48,
    EnableNodeCliInspectArguments: 48,
    EnableEmbeddedAsarIntegrityValidation: 49,
    OnlyLoadAppFromAsar: 49
  };
  for (const [ad, deger] of Object.entries(beklenen)) {
    assert.equal(tel[FuseV1Options[ad]], deger, `Fuse beklenen durumda değil: ${ad}`);
  }
  const exeBaytlari = fs.readFileSync(exe);
  const kaynaklar = NtExecutableResource.from(NtExecutable.from(exeBaytlari));
  const girdiler = kaynaklar.entries.filter(e => e.type === 'INTEGRITY' && e.id === 'ELECTRONASAR');
  assert.equal(girdiler.length, 1, 'EXE içinde tek ASAR bütünlük kaydı bulunmalı.');
  const kayitlar = JSON.parse(Buffer.from(girdiler[0].bin).toString('utf8'));
  const kayit = kayitlar.find(e => e.file === 'resources\\app.asar');
  assert.ok(kayit, 'EXE app.asar bütünlük kaydını içermeli.');
  assert.equal(kayit.alg, 'SHA256');
  const { headerString } = asar.getRawHeader(arsiv);
  assert.equal(createHash('sha256').update(headerString).digest('hex'), kayit.value);
  const manifest = JSON.parse(asar.extractFile(arsiv, 'package.json'));
  const kaynakManifest = require('../package.json');
  assert.equal(manifest.version, kaynakManifest.version);
  assert.equal(manifest.main, kaynakManifest.main);

  const dosyalar = asar.listPackage(arsiv);
  let sayi = 0;
  for (const ad of dosyalar) {
    const goreli = ad.replace(/^[/\\]/, '').replaceAll('\\', '/');
    const bilgi = asar.statFile(arsiv, goreli);
    if (bilgi.files) continue;
    assert.ok(!bilgi.unpacked && !bilgi.link, `Beklenmeyen harici içerik: ${goreli}`);
    assert.ok(goreli === 'package.json' || /^(masaüstü|arayüz)\//u.test(goreli), `Paket kapsamı dışında: ${goreli}`);
    assert.equal(bilgi.integrity?.algorithm, 'SHA256', `Dosya bütünlüğü eksik: ${goreli}`);
    const icerik = asar.extractFile(arsiv, goreli);
    assert.equal(createHash('sha256').update(icerik).digest('hex'), bilgi.integrity.hash, goreli);
    // Builder paket manifestini sadeleştirebilir; çalışma kodu birebir aynı olmalı.
    if (goreli !== 'package.json') {
      assert.deepEqual(icerik, fs.readFileSync(path.join(__dirname, '..', goreli)), goreli);
    }
    sayi++;
  }
  const sonuc = {
    paket: path.resolve(klasor), dosyaSayisi: sayi, fuseVeAsarStatik: 'gecti',
    exeSha256: createHash('sha256').update(exeBaytlari).digest('hex'),
    asarBaslikSha256: kayit.value,
    windowsCalistirma: 'Bu komut çalıştırmaz; ayrıca Windows davranış denetimi gerekir.'
  };
  console.log(JSON.stringify(sonuc, null, 2));
  return sonuc;
}

if (require.main === module) {
  denetle(path.resolve(process.argv[2] || 'kurulum/güçlendirme-adayı/win-unpacked')).catch(hata => {
    console.error(hata.message);
    process.exitCode = 1;
  });
}
module.exports = { denetle };
