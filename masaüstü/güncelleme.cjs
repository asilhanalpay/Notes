'use strict';
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');

const DEPO = 'asilhanalpay/Notes';
function paketiDogrula(yayin) {
  if (!Number.isSafeInteger(yayin?.kimlik) || yayin.kimlik < 1 ||
      !Number.isSafeInteger(yayin.boyut) || yayin.boyut < 1 || yayin.boyut > 500 * 1024 * 1024 ||
      !/^sha256:[a-f0-9]{64}$/.test(yayin.ozet)) {
    throw new Error('Bu yayının doğrulanabilir kurulum özeti yok. Uygulama içinden kurulamaz.');
  }
}
function veriAdresi(adres) {
  const u = new URL(adres);
  if (u.protocol !== 'https:' || u.port || u.username || u.password || u.hash ||
      !['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(u.hostname)) {
    throw new Error('Kurulum indirme adresi doğrulanamadı.');
  }
  return u;
}
function yanitAl(adres, headers, signal, istemci) {
  return new Promise((resolve, reject) => {
    const istek = istemci.get(adres, { headers, signal }, resolve);
    istek.setTimeout(30000, () => istek.destroy(new Error('Zaman aşımı.')));
    istek.on('error', reject);
  });
}
async function indir({ yayin, anahtar, dosya, signal, ilerle = () => {}, istemci = https }) {
  paketiDogrula(yayin);
  signal = AbortSignal.any([AbortSignal.timeout(5 * 60 * 1000), ...(signal ? [signal] : [])]);
  let yanit;
  let tutacak;
  try {
    const headers = { Authorization: `Bearer ${anahtar}`, Accept: 'application/octet-stream',
      'User-Agent': 'Notes', 'X-GitHub-Api-Version': '2022-11-28', 'Accept-Encoding': 'identity' };
    yanit = await yanitAl(new URL(`https://api.github.com/repos/${DEPO}/releases/assets/${yayin.kimlik}`), headers, signal, istemci);
    for (let sayi = 0; [301, 302, 303, 307, 308].includes(yanit.statusCode); sayi++) {
      const sonraki = yanit.headers.location;
      yanit.destroy();
      if (sayi >= 2) throw new Error('Çok sayıda yönlendirme.');
      const adres = veriAdresi(sonraki);
      // Özel depo anahtarı yalnız api.github.com'a gönderilir.
      yanit = await yanitAl(adres, { 'User-Agent': 'Notes', 'Accept-Encoding': 'identity' }, signal, istemci);
    }
    if (yanit.statusCode !== 200 || (yanit.headers['content-length'] && Number(yanit.headers['content-length']) !== yayin.boyut)) {
      throw new Error('Kurulum yanıtı doğrulanamadı.');
    }
    tutacak = await fs.promises.open(dosya, 'wx', 0o600);
    const hash = createHash('sha256');
    let toplam = 0, sonBildirim = 0;
    for await (const parca of yanit) {
      signal?.throwIfAborted();
      toplam += parca.length;
      if (toplam > yayin.boyut) throw new Error('Beklenenden büyük dosya.');
      hash.update(parca);
      // FileHandle.write kısmi yazabilir; tüm baytlar tamamlanır.
      let konum = 0;
      while (konum < parca.length) {
        const { bytesWritten } = await tutacak.write(parca, konum, parca.length - konum);
        if (!bytesWritten) throw new Error('Kurulum yazılamadı.');
        konum += bytesWritten;
      }
      if (Date.now() - sonBildirim >= 250) { ilerle(Math.floor(toplam * 100 / yayin.boyut)); sonBildirim = Date.now(); }
    }
    signal?.throwIfAborted();
    if (toplam !== yayin.boyut || `sha256:${hash.digest('hex')}` !== yayin.ozet) throw new Error('Kurulum bütünlüğü doğrulanamadı.');
    await tutacak.sync();
    await tutacak.close(); tutacak = null;
    ilerle(100);
  } catch {
    yanit?.destroy();
    await tutacak?.close().catch(() => {});
    await fs.promises.rm(dosya, { force: true }).catch(() => {});
    throw new Error('Güncelleme indirilemedi veya bütünlüğü doğrulanamadı. Notların korunuyor; yeniden deneyebilirsin.');
  }
}
const psMetni = s => "'" + s.replaceAll("'", "''") + "'";
function yardimciMetni({ dosya, hedef, ozet, pid, sonuc, hazir }) {
  if (!Number.isSafeInteger(pid) || pid < 1 || !/^[a-f0-9]{64}$/.test(ozet)) throw new Error('Güncelleme bilgileri geçersiz.');
  // Yalnız ana işlemin ürettiği sabit dosya/yol değerleri; IPC argümanı yoktur.
  return `$Kurulum = ${psMetni(dosya)}\n$Hedef = ${psMetni(hedef)}\n$Ozet = ${psMetni(ozet)}\n$NotesPid = ${pid}\n$Sonuc = ${psMetni(sonuc)}\n$Hazir = ${psMetni(hazir)}\n` +
    fs.readFileSync(path.join(__dirname, 'güncelleme-yardımcısı.ps1'), 'utf8');
}
async function kurulumHazirla({ kok, yayin, anahtar, signal, ilerle, exe = process.execPath, pid = process.pid }) {
  paketiDogrula(yayin);
  fs.mkdirSync(kok, { recursive: true });
  const klasor = fs.mkdtempSync(path.join(kok, 'paket-'));
  const dosya = path.join(klasor, 'Kurulum.exe');
  const sonuc = path.join(kok, 'sonuc.json');
  const hazir = path.join(klasor, 'hazir');
  const temizle = () => fs.rmSync(klasor, { recursive: true, force: true });
  try { await indir({ yayin, anahtar, dosya, signal, ilerle }); }
  catch (hata) { temizle(); throw hata; }
  return {
    temizle,
    async baslat() {
      const metin = yardimciMetni({ dosya, hedef: path.dirname(exe), pid, ozet: yayin.ozet.slice(7), sonuc, hazir });
      const ps = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const surec = spawn(ps, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(metin, 'utf16le').toString('base64')], {
        detached: true, windowsHide: true, stdio: 'ignore', cwd: klasor
      });
      let hata;
      surec.on('error', () => { hata = true; });
      surec.unref();
      for (let i = 0; i < 100; i++) {
        if (hata || surec.exitCode !== null) throw new Error('Güncelleme yardımcısı başlatılamadı.');
        if (fs.existsSync(hazir)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Hazır işareti olmadan uygulama kapanmaz; yardımcı da kurulum yapmaz.
      surec.kill();
      throw new Error('Güncelleme yardımcısı zamanında hazırlanamadı.');
    }
  };
}
module.exports = { indir, paketiDogrula, veriAdresi, yardimciMetni, kurulumHazirla };
