'use strict';
const fs = require('node:fs');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { atomikYaz } = require('./depolama.cjs');

const DEPO = 'asilhanalpay/Notes';
const DEPO_KIMLIGI = '1427086629';
const ARALIK = 3 * 60 * 1000;
const BEKLEME = 45 * 1000;


class ErisimHatasi extends Error {}
class BeklemeHatasi extends Error {
  constructor(bekleyeKadar) { super('GitHub istek sınırına ulaşıldı. Daha sonra otomatik denetlenecek.'); this.bekleyeKadar = bekleyeKadar; }
}

function surumuCoz(metin) {
  if (typeof metin !== 'string' || !/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(metin)) {
    throw new Error('Sürüm bilgisi doğrulanamadı.');
  }
  return metin.split('.').map(Number);
}
function dahaYeniMi(yeni, kurulu) {
  const a = surumuCoz(yeni), b = surumuCoz(kurulu);
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}

// Eski şifreli kayıt uyumu için korunur; açık depo güncelleyicisi bu kasayı okumaz.
class ErisimKasasi {
  constructor(dosya, sifreleme) { this.dosya = dosya; this.sifreleme = sifreleme; this.kusak = 0; }
  async uygunMu() {
    try {
      return await this.sifreleme.isAsyncEncryptionAvailable() &&
        (!this.sifreleme.getSelectedStorageBackend || this.sifreleme.getSelectedStorageBackend() !== 'basic_text');
    } catch { return false; }
  }
  dogrula(anahtar) {
    if (typeof anahtar !== 'string' || !/^github_pat_[A-Za-z0-9_]{20,240}$/.test(anahtar)) {
      throw new Error('GitHub’da yalnızca bu depoya okuma izni olan ayrıntılı bir erişim anahtarı oluştur.');
    }
  }
  async oku() {
    const kusak = this.kusak;
    if (!await this.uygunMu()) throw new Error('Windows güvenli depolaması kullanılamıyor.');
    try {
      if (fs.statSync(this.dosya).size > 8192) throw new Error('Geçersiz kayıt.');
      const { result: anahtar } = await this.sifreleme.decryptStringAsync(fs.readFileSync(this.dosya));
      this.dogrula(anahtar);
      // Eski senkron API kayıtları okunur; açılışta biçim dönüşümü yapılmaz.
      // shouldReEncrypt sonucu da kendiliğinden dosyanın üzerine yazmaz.
      return kusak === this.kusak ? anahtar : null;
    } catch (hata) {
      if (hata.code === 'ENOENT') return null;
      throw new Error('GitHub bağlantısı okunamadı. Bağlantıyı yeniden kur.');
    }
  }
  async kaydet(anahtar, gecerliMi = () => true) {
    const kusak = this.kusak;
    this.dogrula(anahtar);
    if (!await this.uygunMu()) throw new Error('Windows güvenli depolaması kullanılamıyor. Anahtar kaydedilmedi.');
    const sifreli = await this.sifreleme.encryptStringAsync(anahtar);
    // Şifreleme beklerken bağlantı kaldırılmış veya uygulama kapanmış olabilir.
    // Son kontrol ile senkron atomik yazma arasına await giremez.
    if (kusak !== this.kusak || !gecerliMi()) throw new Error('Bağlantı isteği iptal edildi.');
    atomikYaz(this.dosya, sifreli);
  }
  sil() { this.kusak++; fs.rmSync(this.dosya, { force: true }); }
}

function githubOku(yol, signal, istemci = https) {
  if (![ `/repos/${DEPO}`, `/repos/${DEPO}/releases/latest` ].includes(yol)) {
    return Promise.reject(new Error('Bu GitHub isteğine izin verilmiyor.'));
  }
  return new Promise((resolve, reject) => {
    const istek = istemci.get({
      hostname: 'api.github.com', port: 443, path: yol, signal,
      headers: { Accept: 'application/vnd.github+json',
        'User-Agent': 'Notes', 'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' }
    }, yanit => {
      if (yanit.statusCode !== 200) {
        yanit.resume();
        if (yanit.statusCode === 429 || yanit.statusCode === 403) {
          const simdi = Date.now();
          const sonra = Number(yanit.headers?.['retry-after']);
          const sifirlama = Number(yanit.headers?.['x-ratelimit-reset']);
          const aday = sonra > 0 ? simdi + sonra * 1000 : sifirlama > 0 ? sifirlama * 1000 : simdi + ARALIK;
          const bekle = Number.isFinite(aday) ? Math.min(simdi + 86400000, Math.max(simdi + 60000, aday)) : simdi + ARALIK;
          reject(new BeklemeHatasi(bekle));
        } else {
          reject(new Error('Açık güncelleme yayınına erişilemiyor. Daha sonra yeniden dene.'));
        }
        return;
      }
      let toplam = 0;
      const parcalar = [];
      yanit.on('data', parca => {
        toplam += parca.length;
        if (toplam > 262144) {
          reject(new Error('GitHub yanıtı doğrulanamadı.'));
          istek.destroy();
          return;
        }
        parcalar.push(parca);
      });
      yanit.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(parcalar).toString('utf8'))); }
        catch { reject(new Error('GitHub yanıtı doğrulanamadı.')); }
      });
      yanit.on('error', () => reject(new Error('GitHub bağlantısı tamamlanamadı.')));
    });
    istek.setTimeout(20000, () => istek.destroy(new Error('Zaman aşımı.')));
    // Ham ağ hataları kimlik doğrulama ayrıntıları içerebilir; dışarı aktarılmaz.
    istek.on('error', () => reject(new Error('GitHub’a güvenli bağlantı kurulamadı.')));
  });
}

function depoyuDogrula(veri) {
  if (!veri || String(veri.id) !== DEPO_KIMLIGI || veri.full_name !== DEPO || veri.private !== false) {
    throw new ErisimHatasi('Herkese açık güncelleme deposunun kimliği doğrulanamadı.');
  }
}
function yayiniDogrula(veri) {
  if (!veri || veri.draft !== false || veri.prerelease !== false || typeof veri.tag_name !== 'string' || !veri.tag_name.startsWith('v')) {
    throw new Error('Kararlı sürüm bilgisi doğrulanamadı.');
  }
  const surum = veri.tag_name.slice(1);
  surumuCoz(surum);
  // Yeni yayınlar Notes.exe kullanır; geçmiş yayınların sabit eski adı da okunabilir.
  const dosya = veri.assets?.find(a => a.name === 'Notes.exe') ??
    veri.assets?.find(a => a.name === 'Windows.Masaustu.Uygulamasi.exe');
  const adres = `https://github.com/${DEPO}/releases/download/v${surum}/${dosya?.name}`;
  if (!dosya || dosya.state !== 'uploaded' || !Number.isSafeInteger(dosya.size) || dosya.size < 1 ||
      dosya.size > 500 * 1024 * 1024 || dosya.browser_download_url !== adres) {
    throw new Error('Yeni sürümün kurulum dosyası doğrulanamadı.');
  }
  return { surum, adres, kimlik: dosya.id, boyut: dosya.size, ozet: dosya.digest };
}

class SurumBildirimi extends EventEmitter {
  constructor({ surum, paketli, platform, oku = githubOku, simdi = Date.now, zamanlayici = globalThis }) {
    super();
    surumuCoz(surum);
    Object.assign(this, { surum, paketli, platform, oku, simdi, zamanlayici });
    this.kusak = 0;
    this.sonDeneme = -Infinity;
    this.geriCekilme = 0;
    this.bilgi = { durum: 'bekliyor', aciklama: 'Yeni sürümler anahtar gerektirmeden otomatik denetlenir.', surum };
  }
  gorunum() { return { ...this.bilgi }; }
  bildir(durum, aciklama, ek = {}) {
    this.bilgi = { durum, aciklama, surum: this.surum, ...ek };
    this.emit('durum', this.gorunum());
    return this.gorunum();
  }
  async engel() {
    if (!this.paketli || this.platform !== 'win32') return 'Sürüm bildirimleri kurulu Windows uygulamasında kullanılabilir.';
    return null;
  }
  async baslat() {
    const kusak = this.kusak;
    const engel = await this.engel();
    if (kusak !== this.kusak || this.baslatildi) return this.gorunum();
    if (engel) return this.bildir('kullanilamiyor', engel);
    this.baslatildi = true;
    this.ilkSayac = this.zamanlayici.setTimeout(() => { void this.denetle(); }, 1000);
    this.sayac = this.zamanlayici.setInterval(() => { void this.denetle(); }, ARALIK);
    this.ilkSayac?.unref?.(); this.sayac?.unref?.();
    return this.gorunum();
  }
  durdur() {
    this.kusak++;
    this.zamanlayici.clearTimeout(this.ilkSayac);
    this.zamanlayici.clearInterval(this.sayac);
    this.iptal?.abort();
  }
  iptalEt() {
    if (this.bilgi.durum !== 'indiriliyor') throw new Error('İptal edilebilecek bir indirme yok.');
    this.kusak++;
    this.iptal?.abort();
    this.yayin = null;
    return this.bildir('bekliyor', 'İndirme iptal edildi. Notlarını kullanmaya devam edebilirsin.');
  }
  async denetle({ elle = false } = {}) {
    const kusak = this.kusak;
    const engel = await this.engel();
    if (kusak !== this.kusak) return this.gorunum();
    if (engel) return this.bildir('kullanilamiyor', engel);
    if (this.mesgul || this.simdi() < this.geriCekilme || (!elle && this.simdi() - this.sonDeneme < BEKLEME)) return this.gorunum();
    this.mesgul = true;
    this.sonDeneme = this.simdi();
    this.iptal = new AbortController();
    this.bildir('denetleniyor', 'Yeni sürüm denetleniyor…', this.yayin ? { yeniSurum: this.yayin.surum } : {});
    try {
      depoyuDogrula(await this.oku(`/repos/${DEPO}`, this.iptal.signal));
      if (kusak !== this.kusak) return this.gorunum();
      const yayin = yayiniDogrula(await this.oku(`/repos/${DEPO}/releases/latest`, this.iptal.signal));
      if (kusak !== this.kusak) return this.gorunum();
      this.yayin = null;
      if (!dahaYeniMi(yayin.surum, this.surum)) return this.bildir('guncel', 'En güncel sürümü kullanıyorsun.');
      this.yayin = yayin;
      return this.bildir('yeni-surum', 'Yeni sürüm hazır. Güncelle düğmesi indirir, notlarını kaydeder ve mevcut klasöre kurar.', { yeniSurum: yayin.surum });
    } catch (hata) {
      if (kusak !== this.kusak) return this.gorunum();
      if (hata instanceof BeklemeHatasi) {
        this.yayin = null;
        this.geriCekilme = Math.max(this.simdi() + 60000, hata.bekleyeKadar);
        return this.bildir('hata', 'GitHub istek sınırına ulaşıldı. Daha sonra otomatik denetlenecek.');
      }
      if (hata instanceof ErisimHatasi) this.yayin = null;
      return this.bildir(this.yayin ? 'yeni-surum' : 'hata',
        'Şu anda yeni sürüm denetlenemedi. İnternet bağlantını kontrol et; sonraki denetim otomatik yapılacak.',
        this.yayin ? { yeniSurum: this.yayin.surum } : {});
    } finally { this.mesgul = false; }
  }
  async guncelle(hazirla) {
    if (this.mesgul) throw new Error('Devam eden işlemin bitmesini bekle.');
    this.indirmeAdresi();
    const kusak = this.kusak;
    const yayin = this.yayin;
    this.mesgul = true;
    this.iptal = new AbortController();
    this.bildir('indiriliyor', 'Güncelleme indiriliyor…', { yeniSurum: yayin.surum });
    let paket;
    try {
      paket = await hazirla({ yayin, signal: this.iptal.signal,
        ilerle: yuzde => { if (kusak === this.kusak) this.bildir('indiriliyor', `Güncelleme indiriliyor: %${yuzde}`, { yeniSurum: yayin.surum }); } });
      if (kusak !== this.kusak) { paket.temizle(); throw new Error('Güncelleme iptal edildi.'); }
      this.bildir('kuruluyor', 'İndirme doğrulandı. Notların kaydedilip uygulama yeniden başlatılıyor…', { yeniSurum: yayin.surum });
      return paket;
    } catch (hata) {
      if (kusak === this.kusak) this.bildir('yeni-surum', hata.message, { yeniSurum: yayin.surum });
      throw hata;
    } finally {
      // Kurulum hazırlanmışsa kapanışa kadar başka bir işlem başlatılmaz.
      if (!paket || kusak !== this.kusak) this.mesgul = false;
    }
  }
  indirmeAdresi() {
    if (!this.yayin || this.bilgi.durum !== 'yeni-surum') {
      throw new Error('Doğrulanmış bir yeni sürüm bulunmuyor.');
    }
    return this.yayin.adres;
  }
}
module.exports = { SurumBildirimi, ErisimKasasi, githubOku, depoyuDogrula, yayiniDogrula,
  dahaYeniMi, ErisimHatasi, BeklemeHatasi, ARALIK, BEKLEME };
