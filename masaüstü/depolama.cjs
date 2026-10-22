'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const EN_BUYUK_DOSYA = 16 * 1024 * 1024;

function notlariDogrula(notlar) {
  if (!Array.isArray(notlar) || notlar.length > 10000) {
    throw new Error('Not listesi geçersiz veya çok büyük.');
  }
  const kimlikler = new Set();
  return notlar.map(not => {
    if (!not || typeof not.id !== 'string' || !not.id || not.id.length > 100 ||
        kimlikler.has(not.id) || typeof not.title !== 'string' || not.title.length > 500 ||
        typeof not.body !== 'string' || not.body.length > 1000000 ||
        !Number.isSafeInteger(not.updated) || not.updated < 0 || not.updated > 8640000000000000) {
      throw new Error('Not verisi geçersiz.');
    }
    kimlikler.add(not.id);
    return { id: not.id, title: not.title, body: not.body, updated: not.updated };
  });
}

function kodla(notlar) {
  const metin = JSON.stringify({ surum: 1, notlar: notlariDogrula(notlar) }, null, 2);
  if (Buffer.byteLength(metin) > EN_BUYUK_DOSYA) throw new Error('Notların toplam boyutu 16 MB sınırını aşıyor.');
  return metin;
}

function coz(metin) {
  if (Buffer.byteLength(metin) > EN_BUYUK_DOSYA) throw new Error('Dosya çok büyük.');
  const veri = JSON.parse(metin);
  if (!veri || veri.surum !== 1) throw new Error('Bu yedek biçimi desteklenmiyor.');
  return notlariDogrula(veri.notlar);
}

function atomikYaz(dosya, metin) {
  const gecici = `${dosya}.${randomUUID()}.tmp`;
  let tanitici;
  try {
    tanitici = fs.openSync(gecici, 'wx', 0o600);
    fs.writeFileSync(tanitici, metin, 'utf8');
    fs.fsyncSync(tanitici);
    fs.closeSync(tanitici);
    tanitici = undefined;
    fs.renameSync(gecici, dosya);
  } finally {
    if (tanitici !== undefined) fs.closeSync(tanitici);
    if (fs.existsSync(gecici)) fs.unlinkSync(gecici);
  }
}

function dosyaOku(dosya) {
  if (fs.statSync(dosya).size > EN_BUYUK_DOSYA) throw new Error('Dosya çok büyük.');
  return fs.readFileSync(dosya, 'utf8');
}

class NotDeposu {
  constructor(klasor) {
    fs.mkdirSync(klasor, { recursive: true });
    this.dosya = path.join(klasor, 'notlar.json');
    this.yedek = path.join(klasor, 'notlar.yedek.json');
    this.sonGecerliMetin = null;
    this.hazir = false;
  }

  oku() {
    try {
      const metin = dosyaOku(this.dosya);
      const notlar = coz(metin);
      this.sonGecerliMetin = metin;
      this.hazir = true;
      return { notlar, kurtarildi: false };
    } catch (hata) {
      if (hata.code === 'ENOENT' && !fs.existsSync(this.yedek)) {
        this.hazir = true;
        return { notlar: [], kurtarildi: false };
      }
      try {
        const metin = dosyaOku(this.yedek);
        const notlar = coz(metin);
        this.sonGecerliMetin = metin;
        this.hazir = true;
        return { notlar, kurtarildi: true };
      } catch {
        this.hazir = false;
        throw new Error('Not dosyası açılamadı. Verilerin korunması için kaydetme durduruldu. Yedek dosyanı kontrol et.');
      }
    }
  }

  kaydet(notlar) {
    if (!this.hazir) throw new Error('Notlar okunmadan kaydedilemez.');
    const metin = kodla(notlar);
    if (this.sonGecerliMetin !== null) atomikYaz(this.yedek, this.sonGecerliMetin);
    atomikYaz(this.dosya, metin);
    this.sonGecerliMetin = metin;
  }
}

module.exports = { NotDeposu, notlariDogrula, kodla, coz, atomikYaz, dosyaOku };
