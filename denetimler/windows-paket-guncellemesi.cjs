'use strict';
// Gerçek paket ASAR'ındaki hazırlama/başlatma kodu gerçek Electron'da çalışır.
// Yalnız ağ cevabı yerel test kurucusudur; gerçek indirme ayrı canlı testte sınanır.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { createHash } = require('node:crypto');
const { app } = require('electron');
if (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
  throw new Error('Yalnız geçici hosted Windows ve gerçek Electron gerekir.');
}
const ayar = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
const profil = path.join(ayar.kok, 'elektron-profili');
fs.mkdirSync(profil);
app.setPath('userData', profil);
async function denetle() {
  const asar = path.join(path.dirname(ayar.exe), 'resources', 'app.asar');
  const { kurulumHazirla } = require(path.join(asar, 'masaüstü', 'güncelleme.cjs'));
  const ozet = createHash('sha256').update(fs.readFileSync(ayar.dosya)).digest('hex');
  const boyut = fs.statSync(ayar.dosya).size;
  const asilGet = https.get;
  let istekSayisi = 0;
  https.get = (adres, secenekler, cevapla) => {
    if (adres.href !== 'https://api.github.com/repos/asilhanalpay/Notes/releases/assets/42' ||
        secenekler.headers.Authorization !== 'Bearer sentetik-yerel-kurulum' || ++istekSayisi !== 1) {
      throw new Error('Yerel test dışında ağ isteği yasak.');
    }
    const istek = new EventEmitter();
    istek.setTimeout = () => istek;
    queueMicrotask(() => {
      const yanit = fs.createReadStream(ayar.dosya);
      yanit.statusCode = 200;
      yanit.headers = { 'content-length': String(boyut) };
      cevapla(yanit);
    });
    return istek;
  };
  try {
    const hazirlik = await kurulumHazirla({
      kok: ayar.kok, exe: ayar.exe, pid: ayar.pid, anahtar: 'sentetik-yerel-kurulum',
      yayin: { kimlik: 42, boyut, ozet: `sha256:${ozet}` }
    });
    await hazirlik.baslat();
    fs.writeFileSync(path.join(ayar.kok, 'surucu-hazir.json'), JSON.stringify({
      basarili: true, asarKaynak: asar, yerelAgFiksturu: true,
      surum: require(path.join(asar, 'package.json')).version, ozet, istekSayisi
    }));
  } finally { https.get = asilGet; }
}
app.whenReady().then(denetle).then(() => app.exit(0)).catch(hata => { console.error(hata.message); app.exit(1); });
