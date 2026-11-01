'use strict';
const fs = require('node:fs');
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { atomikYaz } = require('./depolama.cjs');

const DEPO = 'asilhanalpay/Notes';
const DEPO_KIMLIGI = '1427086629';
const ARALIK = 6 * 60 * 60 * 1000;
const BEKLEME = 2 * 60 * 1000;
const IZIN_SAYFASI = 'https://github.com/settings/personal-access-tokens/new?name=Notes%20Surum%20Bildirimi&target_name=asilhanalpay&contents=read&expires_in=90';

class ErisimHatasi extends Error {}

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

function githubOku(yol, anahtar, signal, istemci = https) {
  if (![ `/repos/${DEPO}`, `/repos/${DEPO}/releases/latest` ].includes(yol)) {
    return Promise.reject(new Error('Bu GitHub isteğine izin verilmiyor.'));
  }
  return new Promise((resolve, reject) => {
    const istek = istemci.get({
      hostname: 'api.github.com', port: 443, path: yol, signal,
      headers: { Authorization: `Bearer ${anahtar}`, Accept: 'application/vnd.github+json',
        'User-Agent': 'Notes', 'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' }
    }, yanit => {
      if (yanit.statusCode !== 200) {
        yanit.resume();
        reject([401, 403, 404].includes(yanit.statusCode)
          ? new ErisimHatasi('Özel depoya erişim doğrulanamadı. Bağlantıyı yenile.')
          : new Error('GitHub yanıtı alınamadı. Daha sonra yeniden dene.'));
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
  if (!veri || String(veri.id) !== DEPO_KIMLIGI || veri.full_name !== DEPO || veri.private !== true) {
    throw new ErisimHatasi('Özel güncelleme deposunun kimliği doğrulanamadı.');
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
  return { surum, adres };
}

class SurumBildirimi extends EventEmitter {
  constructor({ surum, kasa, paketli, platform, oku = githubOku, simdi = Date.now, zamanlayici = globalThis }) {
    super();
    surumuCoz(surum);
    Object.assign(this, { surum, kasa, paketli, platform, oku, simdi, zamanlayici });
    this.kusak = 0;
    this.sonDeneme = -Infinity;
    this.bilgi = { durum: 'baglanti-gerekli', aciklama: 'Özel sürüm bildirimleri için GitHub bağlantısı kur.', surum };
  }
  gorunum() { return { ...this.bilgi, bagli: Boolean(this.anahtar) }; }
  bildir(durum, aciklama, ek = {}) {
    this.bilgi = { durum, aciklama, surum: this.surum, ...ek };
    this.emit('durum', this.gorunum());
    return this.gorunum();
  }
  async engel() {
    if (!this.paketli || this.platform !== 'win32') return 'Sürüm bildirimleri kurulu Windows uygulamasında kullanılabilir.';
    if (!await this.kasa.uygunMu()) return 'Windows güvenli depolaması kullanılamıyor. Notlarını kullanmaya devam edebilirsin.';
    return null;
  }
  async baslat() {
    const kusak = this.kusak;
    this.mesgul = true;
    try {
      const engel = await this.engel();
      if (kusak !== this.kusak) return this.gorunum();
      if (engel) return this.bildir('kullanilamiyor', engel);
      const anahtar = await this.kasa.oku();
      if (kusak !== this.kusak) return this.gorunum();
      this.anahtar = anahtar;
    } catch {
      if (kusak !== this.kusak) return this.gorunum();
      this.bildir('baglanti-gerekli', 'GitHub bağlantısı okunamadı. Bağlantıyı yeniden kur.');
    } finally { this.mesgul = false; }
    if (this.anahtar) this.bildir('bekliyor', 'Açılışta ve altı saatte bir otomatik denetlenir. Düğmeyle istediğin zaman hemen denetleyebilirsin.');
    this.ilkSayac = this.zamanlayici.setTimeout(() => { void this.denetle(); }, 10000);
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
  async bagla(anahtar) {
    const kusak = this.kusak;
    const engel = await this.engel();
    if (kusak !== this.kusak) throw new Error('Bağlantı isteği iptal edildi.');
    if (engel) throw new Error(engel);
    if (this.mesgul) throw new Error('Devam eden denetimin bitmesini bekle.');
    this.kasa.dogrula(anahtar);
    this.mesgul = true;
    this.iptal = new AbortController();
    try {
      depoyuDogrula(await this.oku(`/repos/${DEPO}`, anahtar, this.iptal.signal));
      if (kusak !== this.kusak) throw new Error('Bağlantı isteği iptal edildi.');
      await this.kasa.kaydet(anahtar, () => kusak === this.kusak);
      if (kusak !== this.kusak) throw new Error('Bağlantı isteği iptal edildi.');
      this.anahtar = anahtar;
      this.sonDeneme = -Infinity;
    } catch { throw new Error('Özel depoya bağlantı kurulamadı. Yalnızca bu depoyu okuma iznini ve anahtarın süresini kontrol et.'); }
    finally { this.mesgul = false; }
    return this.denetle();
  }
  ayir() {
    this.kusak++;
    this.iptal?.abort();
    this.anahtar = null;
    this.yayin = null;
    this.kasa.sil();
    return this.bildir('baglanti-gerekli', 'Bu bilgisayardaki GitHub bağlantısı kaldırıldı. Anahtarı tamamen iptal etmek için GitHub ayarlarını kullan.');
  }
  async denetle({ elle = false } = {}) {
    const kusak = this.kusak;
    const engel = await this.engel();
    if (kusak !== this.kusak) return this.gorunum();
    if (engel) return this.bildir('kullanilamiyor', engel);
    if (!this.anahtar) return this.bildir('baglanti-gerekli', 'Özel sürüm bildirimleri için GitHub bağlantısı kur.');
    // Kullanıcının düğmeye basması her zaman yeni bir istek başlatır.
    // Arka plan denetimlerinin sınırı ve eşzamanlı istek kilidi korunur.
    if (this.mesgul || (!elle && this.simdi() - this.sonDeneme < BEKLEME)) return this.gorunum();
    this.mesgul = true;
    this.sonDeneme = this.simdi();
    const anahtar = this.anahtar;
    this.iptal = new AbortController();
    this.bildir('denetleniyor', 'Yeni sürüm denetleniyor…');
    try {
      depoyuDogrula(await this.oku(`/repos/${DEPO}`, anahtar, this.iptal.signal));
      if (kusak !== this.kusak) return this.gorunum();
      const yayin = yayiniDogrula(await this.oku(`/repos/${DEPO}/releases/latest`, anahtar, this.iptal.signal));
      if (kusak !== this.kusak) return this.gorunum();
      this.yayin = null;
      if (!dahaYeniMi(yayin.surum, this.surum)) return this.bildir('guncel', 'En güncel sürümü kullanıyorsun.');
      this.yayin = yayin;
      return this.bildir('yeni-surum', 'Yeni sürüm hazır. Kurulum dosyasını indirip uygulamayı kapatarak üzerine kurabilirsin.', { yeniSurum: yayin.surum });
    } catch (hata) {
      if (kusak !== this.kusak) return this.gorunum();
      if (hata instanceof ErisimHatasi) {
        this.yayin = null;
        return this.bildir('baglanti-gerekli', 'Özel depoya erişim doğrulanamadı. GitHub bağlantısını yenile.');
      }
      // Son doğrulanan bağlantı korunur; çevrimdışıyken notlar kullanılabilir.
      return this.bildir(this.yayin ? 'yeni-surum' : 'hata',
        'Şu anda yeni sürüm denetlenemedi. İnternet bağlantını kontrol et; sonraki denetim otomatik yapılacak.',
        this.yayin ? { yeniSurum: this.yayin.surum } : {});
    } finally { this.mesgul = false; }
  }
  indirmeAdresi() {
    if (!this.anahtar || !this.yayin || this.bilgi.durum !== 'yeni-surum') {
      throw new Error('Doğrulanmış bir yeni sürüm bulunmuyor.');
    }
    return this.yayin.adres;
  }
}
module.exports = { SurumBildirimi, ErisimKasasi, githubOku, depoyuDogrula, yayiniDogrula,
  dahaYeniMi, ErisimHatasi, ARALIK, BEKLEME, IZIN_SAYFASI };
