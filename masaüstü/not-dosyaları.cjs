'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');
const { atomikYaz, kodla, notlariDogrula } = require('./depolama.cjs');

const ozet = veri => createHash('sha256').update(veri).digest('hex');
const satirlar = metin => metin.replace(/\r\n?/gu, '\n');
function dosyaAdi(baslik) {
  let ad = Array.from(baslik.replace(/[<>:"/\\|?*\x00-\x1f]/gu, '_').trim()).slice(0, 80).join('').replace(/[. ]+$/u, '');
  if (!ad) ad = 'Başlıksız not';
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/iu.test(ad)) ad = `Not-${ad}`;
  return `${ad}.txt`;
}
function txtOku(dosya) {
  if (!path.isAbsolute(dosya) || path.extname(dosya).toLowerCase() !== '.txt') throw new Error('Bir .txt dosyası seç.');
  const durum = fs.lstatSync(dosya);
  if (!durum.isFile() || durum.isSymbolicLink() || durum.size > 4 * 1024 * 1024) throw new Error('TXT dosyası normal bir dosya olmalı ve 4 MB sınırını aşmamalı.');
  const veri = fs.readFileSync(dosya);
  if (veri.length > 4 * 1024 * 1024) throw new Error('TXT dosyası çok büyük.');
  let kodlama = 'utf8', bom = 0;
  if (veri[0] === 0xff && veri[1] === 0xfe) { kodlama = 'utf16le'; bom = 2; }
  else if (veri[0] === 0xfe && veri[1] === 0xff) { kodlama = 'utf16be'; bom = 2; }
  else if (veri.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) bom = 3;
  let icerik;
  try { icerik = new TextDecoder(kodlama === 'utf8' ? 'utf-8' : kodlama === 'utf16le' ? 'utf-16le' : 'utf-16be', { fatal: true, ignoreBOM: true }).decode(veri.subarray(bom)); }
  catch { throw new Error('TXT kodlaması desteklenmiyor. Dosyayı UTF-8 veya BOM içeren UTF-16 olarak kaydet.'); }
  if (icerik.includes('\0') || satirlar(icerik).length > 1000000) throw new Error('TXT içeriği geçersiz veya bir milyon karakter sınırını aşıyor.');
  return { body: satirlar(icerik), hash: ozet(veri), kodlama, bom, satir: icerik.match(/\r\n|\r|\n/u)?.[0] ?? '\r\n' };
}
function txtKodla(body, bag) {
  let veri = Buffer.from(satirlar(body).replace(/\n/gu, bag.satir), bag.kodlama === 'utf8' ? 'utf8' : 'utf16le');
  if (bag.kodlama === 'utf16be') veri.swap16();
  if (bag.bom) veri = Buffer.concat([Buffer.from(bag.kodlama === 'utf8' ? [0xef, 0xbb, 0xbf] : bag.kodlama === 'utf16le' ? [0xff, 0xfe] : [0xfe, 0xff]), veri]);
  return veri;
}

class NotDosyalari {
  constructor({ depo, veriKlasoru, dialog, pencere }) {
    Object.assign(this, { depo, dialog, pencere });
    this.bagDosyasi = path.join(veriKlasoru, 'txt-baglantilari.json');
    this.baglar = new Map();
    this.bagHatasi = false;
    try {
      if (fs.statSync(this.bagDosyasi).size > 16 * 1024 * 1024) throw new Error('Boyut');
      const veri = JSON.parse(fs.readFileSync(this.bagDosyasi, 'utf8'));
      if (veri.surum !== 1 || !Array.isArray(veri.baglar) || veri.baglar.length > 10000) throw new Error('Biçim');
      for (const bag of veri.baglar) {
        if (!bag || typeof bag.id !== 'string' || !bag.id || bag.id.length > 100 || this.baglar.has(bag.id) ||
            typeof bag.dosya !== 'string' || !path.isAbsolute(bag.dosya) || path.extname(bag.dosya).toLowerCase() !== '.txt' ||
            !/^[a-f0-9]{64}$/u.test(bag.hash) || !/^[a-f0-9]{64}$/u.test(bag.govdeHash) ||
            !['utf8', 'utf16le', 'utf16be'].includes(bag.kodlama) ||
            !(bag.kodlama === 'utf8' ? [0, 3] : [2]).includes(bag.bom) || !['\r\n', '\n', '\r'].includes(bag.satir)) throw new Error('Bağlantı');
        this.baglar.set(bag.id, bag);
      }
    } catch (hata) {
      if (hata.code !== 'ENOENT') { this.baglar.clear(); this.bagHatasi = true; }
    }
  }
  hazirMi() {
    if (this.bagHatasi) throw new Error('TXT bağlantı kaydı okunamadı. Dış dosyaları korumak için kayıt durduruldu; txt-baglantilari.json dosyasını kontrol et.');
  }
  baglariKaydet() {
    atomikYaz(this.bagDosyasi, JSON.stringify({ surum: 1, baglar: [...this.baglar.values()] }, null, 2));
  }
  oku() {
    this.hazirMi();
    const veri = this.depo.oku();
    const bekleyenKayit = veri.notlar.some(n => this.baglar.has(n.id) && ozet(satirlar(n.body)) !== this.baglar.get(n.id).govdeHash);
    return { ...veri, bekleyenKayit, dosyalar: Object.fromEntries([...this.baglar].map(([id, bag]) => [id, path.basename(bag.dosya)])) };
  }
  notuOku(kimlik) {
    if (typeof kimlik !== 'string' || !kimlik || kimlik.length > 100) throw new Error('Kaydedilecek not geçersiz.');
    const not = this.depo.oku().notlar.find(n => n.id === kimlik);
    if (!not) throw new Error('Kaydedilecek not bulunamadı.');
    return { ...not };
  }
  async farkliKaydet(kimlik, anlikNot) {
    this.hazirMi();
    const not = anlikNot ? notlariDogrula([anlikNot])[0] : this.notuOku(kimlik);
    if (not.id !== kimlik) throw new Error('Not kimliği uyuşmuyor.');
    const sonuc = await this.dialog.showSaveDialog(this.pencere(), {
      title: 'Notu farklı kaydet', buttonLabel: 'Kaydet', defaultPath: dosyaAdi(not.title),
      filters: [{ name: 'Metin dosyası', extensions: ['txt'] }]
    });
    if (sonuc.canceled || !sonuc.filePath) return { iptal: true };
    if (path.extname(sonuc.filePath).toLowerCase() !== '.txt') throw new Error('Dosya adını .txt uzantısıyla kaydet.');
    if (!this.baglar.has(kimlik) && this.baglar.size >= 10000) throw new Error('TXT bağlantısı sınırına ulaşıldı.');
    const hedef = path.resolve(sonuc.filePath);
    if ([...this.baglar.values()].some(b => path.resolve(b.dosya).toLowerCase() === hedef.toLowerCase())) throw new Error('Bu dosya Notes içinde açık. Kopya için başka bir ad seç.');
    // Başlık dosya adı olarak önerilir; TXT yalnız düzenleyicideki içeriği taşır.
    const veri = Buffer.from(satirlar(not.body).replace(/\n/gu, '\r\n'), 'utf8');
    atomikYaz(hedef, veri);
    this.baglar.set(kimlik, { id: kimlik, dosya: hedef, hash: ozet(veri), govdeHash: ozet(satirlar(not.body)), kodlama: 'utf8', bom: 0, satir: '\r\n' });
    this.baglariKaydet();
    return { iptal: false, ad: path.basename(hedef) };
  }
  async dosyaAc() {
    this.hazirMi();
    const sonuc = await this.dialog.showOpenDialog(this.pencere(), {
      title: 'TXT dosyası aç', buttonLabel: 'Aç', properties: ['openFile'],
      filters: [{ name: 'Metin dosyası', extensions: ['txt'] }]
    });
    if (sonuc.canceled || !sonuc.filePaths?.[0]) return { iptal: true };
    const dosya = path.resolve(sonuc.filePaths[0]);
    const { notlar } = this.depo.oku();
    const bag = [...this.baglar.values()].find(b => b.dosya.toLowerCase() === dosya.toLowerCase());
    const txt = txtOku(dosya);
    // Yeniden açma, bekleyen düzenlemeyi diskten gelen eski içerikle değiştirmez.
    if (bag && notlar.some(n => n.id === bag.id)) return { iptal: false, not: this.notuOku(bag.id), ad: path.basename(dosya),
      uyari: bag.hash !== txt.hash ? 'TXT dışarıda değişmiş. Notes içindeki mevcut kopyan açıldı. İki metni karşılaştır; Farklı kaydet ile başka bir hedef seçebilirsin.' : null };
    if (!bag && this.baglar.size >= 10000) throw new Error('TXT bağlantısı sınırına ulaşıldı.');
    const not = { id: bag?.id ?? randomUUID(), title: path.basename(dosya, path.extname(dosya)).slice(0, 500), body: txt.body, updated: Date.now() };
    kodla([not, ...notlar]);
    const oncekiBag = bag;
    const yeniBag = { id: not.id, dosya, hash: txt.hash, govdeHash: ozet(txt.body), kodlama: txt.kodlama, bom: txt.bom, satir: txt.satir };
    this.baglar.set(not.id, yeniBag);
    try { this.baglariKaydet(); }
    catch (hata) { if (oncekiBag) this.baglar.set(not.id, oncekiBag); else this.baglar.delete(not.id); throw hata; }
    // Asıl içerik renderer'ın normal kayıt kuyruğuyla JSON'a yazılır.
    return { iptal: false, not, ad: path.basename(dosya) };
  }
  kaydet(gelenNotlar) {
    this.hazirMi();
    const notlar = notlariDogrula(gelenNotlar);
    const degisenler = notlar.filter(n => this.baglar.has(n.id) && ozet(satirlar(n.body)) !== this.baglar.get(n.id).govdeHash);
    // Önce yerel kurtarılabilir kopya. TXT yazılamazsa düzenleme JSON'da kalır;
    // hata döndürülür, pencere kapanmaz ve eski TXT'ye dokunulmaz.
    this.depo.kaydet(notlar);
    for (const not of degisenler) {
      const bag = this.baglar.get(not.id);
      let gecici;
      try {
        const dogrula = () => {
          if (txtOku(bag.dosya).hash !== bag.hash) throw new Error('Dosya başka bir yerde değiştirilmiş.');
        };
        dogrula();
        const veri = txtKodla(not.body, bag);
        gecici = `${bag.dosya}.${randomUUID()}.tmp`;
        const fd = fs.openSync(gecici, 'wx', fs.statSync(bag.dosya).mode & 0o777);
        try { fs.writeFileSync(fd, veri); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        dogrula();
        fs.renameSync(gecici, bag.dosya);
        gecici = null;
        bag.hash = ozet(veri); bag.govdeHash = ozet(satirlar(not.body));
        this.baglariKaydet();
      } catch {
        throw new Error(`${path.basename(bag.dosya)} güncellenemedi veya bağlantısı kaydedilemedi: dosya dışarıda değişmiş, silinmiş veya yazılamıyor olabilir. Düzenlemen Notes içinde korundu. Farklı kaydet ile yeni bir TXT seç ve iki metni karşılaştır.`);
      } finally { if (gecici) fs.rmSync(gecici, { force: true }); }
    }
    if (this.baglar.size) this.baglariKaydet();
    // Silmek yalnız Notes kaydını kaldırır. Bağ, Geri al için korunur;
    // disk üzerindeki özgün TXT hiçbir zaman burada silinmez.
  }
}
module.exports = { NotDosyalari, dosyaAdi };
