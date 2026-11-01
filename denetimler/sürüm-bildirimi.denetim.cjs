'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { SurumBildirimi, ErisimKasasi, githubOku, yayiniDogrula, depoyuDogrula,
  dahaYeniMi, ARALIK, ErisimHatasi } = require('../masaüstü/sürüm-bildirimi.cjs');
const ANAHTAR = 'github_pat_' + 'a'.repeat(30);
const DEPO = { id: 1427086629, full_name: 'asilhanalpay/Notes', private: true };
function yayin(surum = '0.2.4') {
  return { tag_name: `v${surum}`, draft: false, prerelease: false, assets: [{
    name: 'Notes.exe', state: 'uploaded', size: 100,
    browser_download_url: `https://github.com/asilhanalpay/Notes/releases/download/v${surum}/Notes.exe`
  }] };
}
function kur(secenekler = {}) {
  const durum = { istekler: [], araliklar: [] };
  const kasa = { anahtar: ANAHTAR, uygunMu: () => true, dogrula() {},
    oku() { return this.anahtar; }, kaydet(anahtar) { this.anahtar = anahtar; }, sil() { this.anahtar = null; } };
  const yonetici = new SurumBildirimi({
    surum: '0.2.3', paketli: true, platform: 'win32', kasa,
    oku: async (yol, anahtar) => { durum.istekler.push({ yol, anahtar }); return yol.endsWith('/latest') ? yayin() : DEPO; },
    zamanlayici: { setTimeout: () => 1, clearTimeout() {}, setInterval: (_f, a) => { durum.araliklar.push(a); return 2; }, clearInterval() {} },
    ...secenekler
  });
  return { yonetici, kasa, durum };
}

test('Kullanıcı bağlantı kurmadan ağ isteği yapılmaz', async () => {
  const { yonetici, kasa, durum } = kur(); kasa.anahtar = null;
  await yonetici.baslat(); await yonetici.denetle();
  assert.equal(durum.istekler.length, 0);
  assert.equal(yonetici.gorunum().durum, 'baglanti-gerekli');
});
test('Dakikalık denetim yalnızca yeni sürüm bildirir; anahtar arayüze dönmez', async () => {
  const { yonetici, durum } = kur(); await yonetici.baslat();
  const sonuc = await yonetici.denetle();
  assert.deepEqual(durum.araliklar, [ARALIK]);
  assert.equal(ARALIK, 60000);
  assert.equal(sonuc.durum, 'yeni-surum');
  assert.equal(sonuc.yeniSurum, '0.2.4');
  assert.equal(durum.istekler.length, 2);
  assert.equal(JSON.stringify(sonuc).includes(ANAHTAR), false);
  assert.equal(yonetici.indirmeAdresi(), yayin().assets[0].browser_download_url);
});
test('Eski ve eşit sürümler için güncelleme bildirimi gösterilmez', async () => {
  for (const surum of ['0.2.2', '0.2.3']) {
    const { yonetici } = kur({ oku: async yol => yol.endsWith('/latest') ? yayin(surum) : DEPO });
    await yonetici.baslat(); assert.equal((await yonetici.denetle()).durum, 'guncel');
    assert.throws(() => yonetici.indirmeAdresi());
  }
  assert.equal(dahaYeniMi('0.10.0', '0.2.3'), true);
});
test('0.0.1 başlangıcından sonraki sürüm bildirilir; eski 0.2.4 kurulumu için sıfırlama bildirilmez', async () => {
  const yeni = kur({ surum: '0.0.1', oku: async yol => yol.endsWith('/latest') ? yayin('0.0.2') : DEPO });
  await yeni.yonetici.baslat();
  const sonuc = await yeni.yonetici.denetle();
  assert.equal(sonuc.durum, 'yeni-surum');
  assert.equal(sonuc.yeniSurum, '0.0.2');
  const eski = kur({ surum: '0.2.4', oku: async yol => yol.endsWith('/latest') ? yayin('0.0.1') : DEPO });
  await eski.yonetici.baslat();
  assert.equal((await eski.yonetici.denetle()).durum, 'guncel');
  assert.throws(() => eski.yonetici.indirmeAdresi());
});
test('Eşzamanlı ve sık denetimler çoğaltılmaz', async () => {
  const { yonetici, durum } = kur(); await yonetici.baslat();
  await Promise.all([yonetici.denetle(), yonetici.denetle(), yonetici.denetle()]);
  await yonetici.denetle(); assert.equal(durum.istekler.length, 2);
});
test('Elle denetim bekleme süresini atlar ve yeni yayımlanan sürümü hemen görür', async () => {
  let sonSurum = '0.0.2';
  let istekSayisi = 0;
  const { yonetici } = kur({ surum: '0.0.2', simdi: () => 1000,
    oku: async yol => { istekSayisi++; return yol.endsWith('/latest') ? yayin(sonSurum) : DEPO; } });
  await yonetici.baslat();
  assert.equal((await yonetici.denetle()).durum, 'guncel');
  sonSurum = '0.0.3';
  await yonetici.denetle();
  assert.equal(istekSayisi, 2);
  const yeni = await yonetici.denetle({ elle: true });
  assert.equal(istekSayisi, 4);
  assert.equal(yeni.durum, 'yeni-surum');
  assert.equal(yeni.yeniSurum, '0.0.3');
  assert.equal(yonetici.indirmeAdresi(), yayin('0.0.3').assets[0].browser_download_url);
  await yonetici.denetle({ elle: true });
  assert.equal(istekSayisi, 6);
});
test('Elle denetim de eşzamanlı istekleri çoğaltmaz ve bağlantı gereksinimini atlayamaz', async () => {
  let tamamla;
  let istekSayisi = 0;
  const { yonetici } = kur({ oku: async yol => {
    istekSayisi++;
    return yol.endsWith('/latest') ? yayin() : await new Promise(resolve => { tamamla = resolve; });
  } });
  await yonetici.baslat();
  const ilk = yonetici.denetle({ elle: true });
  await yonetici.denetle({ elle: true });
  assert.equal(istekSayisi, 1);
  tamamla(DEPO); await ilk;
  assert.equal(istekSayisi, 2);
  yonetici.ayir();
  assert.equal((await yonetici.denetle({ elle: true })).durum, 'baglanti-gerekli');
  assert.equal(istekSayisi, 2);
});
test('Farklı veya herkese açık depoya geçiş reddedilir', () => {
  assert.throws(() => depoyuDogrula({ ...DEPO, id: 1 }));
  assert.throws(() => depoyuDogrula({ ...DEPO, private: false }));
});
test('Harici adres, ön sürüm, taslak ve eksik kurulum dosyası reddedilir', () => {
  for (const degistir of [
    v => { v.draft = true; }, v => { v.prerelease = true; },
    v => { v.assets[0].browser_download_url = 'https://example.com/kurulum.exe'; },
    v => { v.assets[0].state = 'new'; }, v => { v.assets[0].size = 0; },
    v => { v.tag_name = 'v../../a'; }
  ]) { const veri = yayin(); degistir(veri); assert.throws(() => yayiniDogrula(veri)); }
});
test('Çevrimdışı ağ hataları gizli ayrıntıları arayüze sızdırmaz', async () => {
  const { yonetici } = kur({ oku: async () => { throw Error('Authorization '+ANAHTAR); } });
  await yonetici.baslat(); const sonuc = await yonetici.denetle();
  assert.equal(sonuc.durum, 'hata');
  assert.equal(JSON.stringify(sonuc).includes(ANAHTAR), false);
});
test('Bağlantıyı kaldırdıktan sonra gecikmiş denetim bildirimi geri getiremez', async () => {
  let tamamla;
  const { yonetici, kasa } = kur({ oku: () => new Promise(resolve => { tamamla = resolve; }) });
  await yonetici.baslat(); const istek = yonetici.denetle();
  await new Promise(setImmediate); yonetici.ayir(); tamamla(DEPO); await istek;
  assert.equal(yonetici.gorunum().durum, 'baglanti-gerekli');
  assert.equal(kasa.anahtar, null); assert.throws(() => yonetici.indirmeAdresi());
});
test('Bağlantıyı kaldırdıktan sonra gecikmiş yetkilendirme anahtarı yeniden kaydedemez', async () => {
  let tamamla;
  const { yonetici, kasa } = kur({ oku: () => new Promise(resolve => { tamamla = resolve; }) });
  const istek = yonetici.bagla(ANAHTAR); await new Promise(setImmediate); yonetici.ayir(); tamamla(DEPO);
  await assert.rejects(() => istek); assert.equal(kasa.anahtar, null);
});
test('Windows şifrelemesi yoksa bağlantı kurulamaz', async () => {
  const { yonetici, kasa, durum } = kur(); kasa.uygunMu = () => false;
  assert.equal((await yonetici.baslat()).durum, 'kullanilamiyor');
  await assert.rejects(() => yonetici.bagla(ANAHTAR));
  assert.equal(durum.istekler.length, 0);
});
test('Kasa asenkron şifreleme kullanır ve geçersiz anahtarları saklamaz', async t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const sifreleme = { isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: async s => Buffer.from(s.split('').reverse().join('')),
    decryptStringAsync: async b => ({ result: b.toString().split('').reverse().join(''), shouldReEncrypt: false }) };
  const dosya = path.join(klasor, 'erisim.bin');
  const kasa = new ErisimKasasi(dosya, sifreleme);
  await kasa.kaydet(ANAHTAR); assert.equal(await kasa.oku(), ANAHTAR);
  assert.equal(fs.readFileSync(dosya, 'utf8').includes(ANAHTAR), false);
  await assert.rejects(() => kasa.kaydet('parola'));
  sifreleme.isAsyncEncryptionAvailable = async () => false;
  await assert.rejects(() => kasa.kaydet(ANAHTAR));
  await assert.rejects(() => kasa.oku());
});
test('GitHub isteği yalnızca sabit HTTPS kaynağını kullanır; yönlendirme takip edilmez', async () => {
  let ayarlar;
  const istemci = { get(secenekler, yanitla) {
    ayarlar = secenekler;
    const istek = new EventEmitter(); istek.setTimeout = () => {}; istek.destroy = () => {};
    queueMicrotask(() => { const yanit = new EventEmitter(); yanit.statusCode = 302; yanit.resume = () => {}; yanitla(yanit); });
    return istek;
  } };
  await assert.rejects(() => githubOku('/repos/asilhanalpay/Notes', ANAHTAR, undefined, istemci));
  assert.equal(ayarlar.hostname, 'api.github.com'); assert.equal(ayarlar.port, 443);
  assert.equal(ayarlar.headers['Cache-Control'], 'no-cache');
  await assert.rejects(() => githubOku('/users/asilhanalpay', ANAHTAR, undefined, istemci));
});

test('Süresi dolan bağlantı yeniden kurulabilir veya kaldırılabilir; indirme adresi verilmez', async () => {
  const { yonetici } = kur({ oku: async () => { throw new ErisimHatasi('Yetki yok'); } });
  await yonetici.baslat(); const sonuc = await yonetici.denetle();
  assert.equal(sonuc.durum, 'baglanti-gerekli'); assert.equal(sonuc.bagli, true);
  assert.throws(() => yonetici.indirmeAdresi());
  assert.equal(yonetici.ayir().bagli, false);
});
test('Zaman aşımı isteği kesin olarak sonlandırır; ham ağ hatası döndürülmez', async () => {
  const istemci = { get() {
    const istek = new EventEmitter();
    istek.setTimeout = (_sure, islem) => { queueMicrotask(islem); };
    istek.destroy = hata => { istek.emit('error', hata); };
    return istek;
  } };
  await assert.rejects(() => githubOku('/repos/asilhanalpay/Notes', ANAHTAR, undefined, istemci), /güvenli bağlantı/);
});

test('Geçmiş sürümün eski kurulum adı desteklenir; yeni ad tercih edilir', () => {
  const eski = yayin();
  eski.assets[0].name = 'Windows.Masaustu.Uygulamasi.exe';
  eski.assets[0].browser_download_url = eski.assets[0].browser_download_url.replace('Notes.exe', eski.assets[0].name);
  assert.equal(yayiniDogrula(eski).adres, eski.assets[0].browser_download_url);
  eski.assets.push(yayin().assets[0]);
  assert.equal(yayiniDogrula(eski).adres, yayin().assets[0].browser_download_url);
});

test('Eski şifreli kayıt okununca yeniden şifreleme önerilse bile baytları korunur', async t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-eski-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const dosya = path.join(klasor, 'erisim.bin');
  const eski = Buffer.from('sentetik-eski-sifreli-kayit');
  fs.writeFileSync(dosya, eski);
  const kasa = new ErisimKasasi(dosya, {
    isAsyncEncryptionAvailable: async () => true,
    decryptStringAsync: async b => {
      assert.deepEqual(b, eski);
      return { result: ANAHTAR, shouldReEncrypt: true };
    },
    encryptStringAsync: async () => { assert.fail('Okuma dosyayı dönüştüremez.'); }
  });
  assert.equal(await kasa.oku(), ANAHTAR);
  assert.deepEqual(fs.readFileSync(dosya), eski);
});

test('Şifreleme sürerken bağlantıyı kaldırmak gecikmiş dosya yazımını engeller', async t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-gec-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const dosya = path.join(klasor, 'erisim.bin');
  let tamamla, basladi;
  const hazir = new Promise(resolve => { basladi = resolve; });
  const kasa = new ErisimKasasi(dosya, {
    isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: () => new Promise(resolve => { tamamla = resolve; basladi(); })
  });
  const { yonetici } = kur({ kasa });
  const istek = yonetici.bagla(ANAHTAR);
  await hazir;
  yonetici.ayir();
  tamamla(Buffer.from('sentetik-sifreli-kayit'));
  await assert.rejects(istek);
  assert.equal(fs.existsSync(dosya), false);
  assert.equal(yonetici.gorunum().bagli, false);
});

test('Kapanış şifreleme sonucunun mevcut kaydın üzerine yazmasını engeller', async t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-kapanis-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const dosya = path.join(klasor, 'erisim.bin');
  const eski = Buffer.from('sentetik-eski-kayit');
  fs.writeFileSync(dosya, eski);
  let tamamla, basladi;
  const hazir = new Promise(resolve => { basladi = resolve; });
  const kasa = new ErisimKasasi(dosya, {
    isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: () => new Promise(resolve => { tamamla = resolve; basladi(); })
  });
  const { yonetici } = kur({ kasa });
  const istek = yonetici.bagla(ANAHTAR);
  await hazir;
  yonetici.durdur();
  tamamla(Buffer.from('yeni-sentetik-kayit'));
  await assert.rejects(istek);
  assert.deepEqual(fs.readFileSync(dosya), eski);
});

test('Açılışta geciken kasa okuması kaldırılan bağlantıyı ve sayaçları geri getirmez', async () => {
  const { yonetici, kasa, durum } = kur();
  let tamamla, basladi;
  const hazir = new Promise(resolve => { basladi = resolve; });
  kasa.oku = () => new Promise(resolve => { tamamla = resolve; basladi(); });
  const istek = yonetici.baslat();
  await hazir;
  yonetici.ayir();
  tamamla(ANAHTAR);
  await istek;
  assert.equal(yonetici.gorunum().bagli, false);
  assert.deepEqual(durum.araliklar, []);
  assert.equal(durum.istekler.length, 0);
});

test('Güvensiz veya başarısız şifreleme sağlayıcısında açık metne geçilmez', async t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-guvensiz-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const dosya = path.join(klasor, 'erisim.bin');
  const sifreleme = {
    isAsyncEncryptionAvailable: async () => true,
    getSelectedStorageBackend: () => 'basic_text',
    encryptStringAsync: async () => { assert.fail('Güvensiz sağlayıcı kullanılamaz.'); }
  };
  const kasa = new ErisimKasasi(dosya, sifreleme);
  await assert.rejects(() => kasa.kaydet(ANAHTAR));
  sifreleme.isAsyncEncryptionAvailable = async () => { throw new Error('Sağlayıcı hatası'); };
  assert.equal(await kasa.uygunMu(), false);
  await assert.rejects(() => kasa.kaydet(ANAHTAR));
  assert.equal(fs.existsSync(dosya), false);
});
