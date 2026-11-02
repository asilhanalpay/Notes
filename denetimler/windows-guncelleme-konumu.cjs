'use strict';
// Yayımlanmış eski ASAR'daki gerçek indirici ve yardımcı çalıştırılır.
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
  const kaynak = path.join(ayar.gecici, 'yayin-kaynagi');
  fs.mkdirSync(kaynak);
  const paket = path.join(path.dirname(ayar.exe), 'resources', 'app.asar');
  for (const ad of ['güncelleme.cjs', 'güncelleme-yardımcısı.ps1', 'sürüm-bildirimi.cjs', 'depolama.cjs']) {
    fs.writeFileSync(path.join(kaynak, ad), asar.extractFile(paket, `masaüstü/${ad}`));
  }
  // Eski yayındaki yardımcı/sürüm ayrıştırıcısı korunur; başlatma düzeltmesi adayı sınanır.
  fs.copyFileSync(path.join(__dirname, '../masaüstü/güncelleme.cjs'), path.join(kaynak, 'güncelleme.cjs'));
  const { yayiniDogrula } = require(path.join(kaynak, 'sürüm-bildirimi.cjs'));
  const yayin = yayiniDogrula(JSON.parse(fs.readFileSync(ayar.yayin, 'utf8').replace(/^\uFEFF/, '')));
  if (yayin.surum !== '0.0.6') throw new Error('Beklenmeyen hedef sürüm.');
  // Aynı komut/argüman/ortam korunur; yalnız normalde yutulan hata çıktısı kanıta gider.
  const kanit = path.resolve('denetim-çıktıları');
  const fd = fs.openSync(path.join(kanit, 'windows-yardimci-stderr.log'), 'a');
  const asilSpawn = cp.spawn;
  let alt;
  cp.spawn = (komut, args, secenekler) => {
    alt = asilSpawn(komut, args, { ...secenekler, stdio: ['ignore', fd, fd] });
    return alt;
  };
  try {
    const hazirlik = await require(path.join(kaynak, 'güncelleme.cjs')).kurulumHazirla({
      kok: ayar.kok, yayin, exe: ayar.exe, pid: ayar.pid, anahtar: process.env.GH_TOKEN
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
    fs.closeSync(fd);
  }
  fs.writeFileSync(path.join(ayar.gecici, 'hazir.json'), JSON.stringify({ surum: yayin.surum, ozet: yayin.ozet, baslatmaKaynagi: 'calisma-dali-adayi' }));
}
main().catch(hata => { console.error(hata.message); process.exitCode = 1; });
