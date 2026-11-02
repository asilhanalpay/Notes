'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { atomikYaz } = require('./depolama.cjs');

function dosyaAdi(baslik) {
  let ad = Array.from(baslik.replace(/[<>:"/\\|?*\x00-\x1f]/gu, '_').trim()).slice(0, 80).join('').replace(/[. ]+$/u, '');
  if (!ad) ad = 'Başlıksız not';
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(ad)) ad = `Not-${ad}`;
  return `${ad}.txt`;
}
function metin(not) {
  const icerik = not.title.trim() ? `${not.title}\n\n${not.body}` : not.body;
  return icerik.replace(/\r\n?/gu, '\n').replace(/\n/gu, '\r\n');
}

class NotDosyalari {
  constructor({ depo, veriKlasoru, dialog, shell, pencere }) {
    Object.assign(this, { depo, dialog, shell, pencere });
    this.klasor = path.join(veriKlasoru, 'Kaydedilen notlar');
  }
  notuOku(kimlik) {
    if (typeof kimlik !== 'string' || !kimlik || kimlik.length > 100) throw new Error('Kaydedilecek not geçersiz.');
    const not = this.depo.oku().notlar.find(n => n.id === kimlik);
    if (!not) throw new Error('Kaydedilecek not bulunamadı.');
    return { ...not };
  }
  async farkliKaydet(kimlik) {
    const not = this.notuOku(kimlik);
    const sonuc = await this.dialog.showSaveDialog(this.pencere(), {
      title: 'Notu farklı kaydet', buttonLabel: 'Kaydet', defaultPath: dosyaAdi(not.title),
      filters: [{ name: 'Metin dosyası', extensions: ['txt'] }]
    });
    if (sonuc.canceled || !sonuc.filePath) return { iptal: true };
    // Başka uzantıya veya uygulamanın JSON/anahtar dosyalarına metin yazılmaz.
    // Kullanıcının onayladığı yola sonradan uzantı ekleyip başka dosya ezilmez.
    if (path.extname(sonuc.filePath).toLowerCase() !== '.txt') throw new Error('Dosya adını .txt uzantısıyla kaydet.');
    atomikYaz(sonuc.filePath, metin(not));
    return { iptal: false, ad: path.basename(sonuc.filePath) };
  }
  async uygulamayaKaydet(kimlik) {
    const not = this.notuOku(kimlik);
    fs.mkdirSync(this.klasor, { recursive: true });
    const ad = dosyaAdi(not.title);
    const kok = ad.slice(0, -4);
    let dosya;
    // Otomatik konumda aynı başlıklı not veya kullanıcının önceki TXT kopyası
    // ezilmez. wx denetimi aynı anda başlayan kayıtlarda da geçerlidir.
    for (let sayi = 1; sayi <= 10000; sayi++) {
      const aday = path.join(this.klasor, sayi === 1 ? ad : `${kok} (${sayi}).txt`);
      let fd;
      try { fd = fs.openSync(aday, 'wx', 0o600); }
      catch (hata) { if (hata.code === 'EEXIST') continue; throw hata; }
      try {
        fs.writeFileSync(fd, metin(not), 'utf8');
        fs.fsyncSync(fd);
        fs.closeSync(fd); fd = undefined;
        dosya = aday;
      } catch (hata) {
        if (fd !== undefined) fs.closeSync(fd);
        fs.rmSync(aday, { force: true });
        throw hata;
      }
      break;
    }
    if (!dosya) throw new Error('Bu adla çok fazla dosya var. Farklı kaydet seçeneğini kullan.');
    let klasorAcildi = false;
    try { klasorAcildi = !await this.shell.openPath(this.klasor); } catch { /* Dosya zaten kaydedildi. */ }
    return { iptal: false, ad: path.basename(dosya), klasorAcildi };
  }
}
module.exports = { NotDosyalari, dosyaAdi, metin };
