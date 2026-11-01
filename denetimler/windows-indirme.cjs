'use strict';
// Canlı özel yayın indirmesi; kurulum çalıştırılmaz ve erişim anahtarı kaydedilmez.
const fs = require('node:fs');
const path = require('node:path');
const { githubOku, depoyuDogrula, yayiniDogrula } = require('../masaüstü/sürüm-bildirimi.cjs');
const { indir } = require('../masaüstü/güncelleme.cjs');
async function denetle() {
  if (process.platform !== 'win32' || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') {
    throw new Error('Geçici hosted Windows ortamı gerekir.');
  }
  const anahtar = process.env.GH_TOKEN;
  if (!anahtar) throw new Error('İşleme özel depo okuma izni yok.');
  const kok = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP, 'notes-canli-indirme-'));
  try {
    const signal = AbortSignal.timeout(300000);
    depoyuDogrula(await githubOku('/repos/asilhanalpay/Notes', anahtar, signal));
    const yayin = yayiniDogrula(await githubOku('/repos/asilhanalpay/Notes/releases/latest', anahtar, signal));
    const dosya = path.join(kok, 'Kurulum.exe');
    await indir({ yayin, anahtar, signal, dosya });
    fs.writeFileSync(path.join('denetim-çıktıları', 'windows-canli-indirme.json'), JSON.stringify({
      basarili: true, surum: yayin.surum, varlikKimligi: yayin.kimlik, bayt: fs.statSync(dosya).size, ozet: yayin.ozet,
      kurulumCalistirildi: false
    }, null, 2));
    console.log('Canlı özel yayın indirmesi ve SHA-256 doğrulaması geçti; kurulum çalıştırılmadı.');
  } finally { fs.rmSync(kok, { recursive: true, force: true }); }
}
denetle().catch(hata => { console.error(hata.message); process.exitCode = 1; });
