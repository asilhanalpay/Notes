'use strict';
// Başlatma adayı, yayımlanmış kurucular ve eski ASAR yardımcısıyla gerçek Electron'da sınanır.
// Üründe test kapısı, sahte ağ yanıtı veya kalıcı erişim anahtarı yoktur.
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
const cp = require('node:child_process');
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
  if (!process.versions.electron) throw new Error('Gerçek Electron ana süreci gerekir.');
  const kaynak = path.join(path.dirname(ayar.exe), 'resources', 'app.asar', 'masaüstü');
  const aday = path.join(ayar.gecici, 'baslatma-adayi');
  fs.mkdirSync(aday);
  fs.copyFileSync(path.join(__dirname, '../masaüstü/güncelleme.cjs'), path.join(aday, 'güncelleme.cjs'));
  fs.writeFileSync(path.join(aday, 'güncelleme-yardımcısı.ps1'), fs.readFileSync(path.join(kaynak, 'güncelleme-yardımcısı.ps1')));
  const { yayiniDogrula } = require(path.join(kaynak, 'sürüm-bildirimi.cjs'));
  const yayin = yayiniDogrula(JSON.parse(fs.readFileSync(ayar.yayin, 'utf8').replace(/^\uFEFF/, '')));
  if (yayin.surum !== '0.0.6') throw new Error('Beklenmeyen hedef sürüm.');
  // Çocuk sürecin komutu, ortamı ve stdio seçenekleri değiştirilmez.
  const kanit = path.resolve('denetim-çıktıları');
  const asilSpawn = cp.spawn;
  let alt;
  cp.spawn = (komut, args, secenekler) => {
    alt = asilSpawn(komut, args, secenekler);
    return alt;
  };
  try {
    const hazirlik = await require(path.join(aday, 'güncelleme.cjs')).kurulumHazirla({
      kok: ayar.kok, yayin, exe: ayar.exe, pid: ayar.pid
    });
    await hazirlik.baslat();
  } catch (hata) {
    const sonuc = path.join(ayar.kok, 'sonuc.json');
    if (fs.existsSync(sonuc)) fs.copyFileSync(sonuc, path.join(kanit, 'windows-yardimci-hata.json'));
    const probe = cp.spawnSync(path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(`$ErrorActionPreference='Stop'; Get-Process -Id ${ayar.pid} | Select-Object Id,Path | ConvertTo-Json`, 'utf16le').toString('base64')], { encoding: 'utf8' });
    fs.writeFileSync(path.join(kanit, 'windows-yardimci-tani.json'), JSON.stringify({ hata: hata.message, kod: alt?.exitCode, probeKod: probe.status, stdout: probe.stdout, stderr: probe.stderr }, null, 2));
    throw hata;
  } finally {
    cp.spawn = asilSpawn;
  }
  fs.writeFileSync(path.join(ayar.gecici, 'hazir.json'), JSON.stringify({ surum: yayin.surum, ozet: yayin.ozet, kimlik: yayin.kimlik, baslatmaKaynagi: 'calisma-dali-adayi-gercek-Electron' }));
}
if (process.versions.electron) {
  const { app } = require('electron');
  const ayar = JSON.parse(fs.readFileSync(process.argv[3], 'utf8').replace(/^\uFEFF/, ''));
  const profil = path.join(ayar.gecici, 'elektron-profili');
  fs.mkdirSync(profil, { recursive: true });
  app.setPath('userData', profil);
  app.whenReady().then(main).then(() => app.exit(0)).catch(hata => { console.error(hata.message); app.exit(1); });
} else {
  main().catch(hata => { console.error(hata.message); process.exitCode = 1; });
}
