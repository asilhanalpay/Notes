'use strict';
// Yayımlanmış eski ASAR'daki gerçek indirici ve yardımcı çalıştırılır.
// Üründe test kapısı, sahte ağ yanıtı veya kalıcı erişim anahtarı yoktur.
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
async function main() {
  if (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
    throw new Error('Yalnız geçici hosted Windows ortamında çalıştırılabilir.');
  }
  const [islem, dosya] = process.argv.slice(2);
  if (islem === 'surum') {
    process.stdout.write(JSON.parse(asar.extractFile(dosya, 'package.json').toString()).version);
    return;
  }
  if (islem !== 'hazirla') throw new Error('Bilinmeyen denetim.');
  const ayar = JSON.parse(fs.readFileSync(dosya, 'utf8').replace(/^\uFEFF/, ''));
  const kaynak = path.join(ayar.gecici, 'yayin-kaynagi');
  fs.mkdirSync(kaynak);
  const paket = path.join(path.dirname(ayar.exe), 'resources', 'app.asar');
  for (const ad of ['güncelleme.cjs', 'güncelleme-yardımcısı.ps1', 'sürüm-bildirimi.cjs', 'depolama.cjs']) {
    fs.writeFileSync(path.join(kaynak, ad), asar.extractFile(paket, `masaüstü/${ad}`));
  }
  const { yayiniDogrula } = require(path.join(kaynak, 'sürüm-bildirimi.cjs'));
  const yayin = yayiniDogrula(JSON.parse(fs.readFileSync(ayar.yayin, 'utf8').replace(/^\uFEFF/, '')));
  if (yayin.surum !== '0.0.6') throw new Error('Beklenmeyen hedef sürüm.');
  const hazirlik = await require(path.join(kaynak, 'güncelleme.cjs')).kurulumHazirla({
    kok: ayar.kok, yayin, exe: ayar.exe, pid: ayar.pid, anahtar: process.env.GH_TOKEN
  });
  await hazirlik.baslat();
  fs.writeFileSync(path.join(ayar.gecici, 'hazir.json'), JSON.stringify({ surum: yayin.surum, ozet: yayin.ozet }));
}
main().catch(hata => { console.error(hata.message); process.exitCode = 1; });
