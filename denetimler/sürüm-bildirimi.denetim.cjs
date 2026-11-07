'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { SurumBildirimi, ErisimKasasi, githubOku, yayiniDogrula, depoyuDogrula,
  dahaYeniMi, ARALIK, BeklemeHatasi } = require('../masaüstü/sürüm-bildirimi.cjs');
const ANAHTAR = 'github_pat_' + 'a'.repeat(30);
const DEPO = { id: 1427086629, full_name: 'asilhanalpay/Notes', private: false };
function yayin(surum = '0.0.9') {
  return { tag_name: `v${surum}`, draft: false, prerelease: false, assets: [{
    name: 'Notes.exe', state: 'uploaded', size: 100,
    browser_download_url: `https://github.com/asilhanalpay/Notes/releases/download/v${surum}/Notes.exe`
  }] };
}
function kur(secenekler = {}) {
  const durum = { istekler: [], araliklar: [], ilkler: [] };
  const yonetici = new SurumBildirimi({
    surum: '0.0.8', paketli: true, platform: 'win32',
    oku: async (yol, signal) => { durum.istekler.push({ yol, signal }); return yol.endsWith('/latest') ? yayin() : DEPO; },
    zamanlayici: { setTimeout: (f, a) => { durum.ilkler.push({ f, a }); return 1; }, clearTimeout() {},
      setInterval: (f, a) => { durum.araliklar.push({ f, a }); return 2; }, clearInterval() {} },
    ...secenekler
  });
  return { yonetici, durum };
}
test('Anahtar veya Windows şifreleme kasası olmadan açılış denetimi zamanlanır', async () => {
  const kasa = new Proxy({}, { get() { assert.fail('Eski kasa okunamaz veya silinemez.'); } });
  const { yonetici, durum } = kur({ kasa });
  await yonetici.baslat();
  assert.equal(durum.ilkler[0].a, 1000);
  assert.equal(durum.araliklar[0].a, 3 * 60 * 1000);
  assert.equal(ARALIK, 180000);
  durum.ilkler[0].f(); await new Promise(setImmediate);
  assert.equal(durum.istekler.length, 2);
  assert.ok(durum.istekler.every(x => x.signal instanceof AbortSignal));
  assert.equal(yonetici.gorunum().durum, 'yeni-surum');
  assert.equal(yonetici.gorunum().yeniSurum, '0.0.9');
  assert.equal(JSON.stringify(yonetici.gorunum()).includes('anahtar'), false);
});
test('Yinelenen açılış sayaçları çoğaltmaz; kapanış gecikmiş açılışı engeller', async () => {
  const { yonetici, durum } = kur(); await Promise.all([yonetici.baslat(), yonetici.baslat()]);
  assert.equal(durum.araliklar.length, 1);
  const ikinci = kur(); const acilis = ikinci.yonetici.baslat(); ikinci.yonetici.durdur(); await acilis;
  assert.equal(ikinci.durum.araliklar.length, 0);
});
test('Geliştirme ve Windows dışı ortamda güncelleme çalışmaz', async () => {
  for (const secenek of [{ paketli: false }, { platform: 'linux' }]) {
    const { yonetici, durum } = kur(secenek);
    assert.equal((await yonetici.baslat()).durum, 'kullanilamiyor');
    await yonetici.denetle(); assert.equal(durum.istekler.length, 0);
  }
});
test('Eski/eşit sürümler bildirilmez; daha yüksek sürüm ve doğrulanmış adres bildirilir', async () => {
  for (const surum of ['0.0.7', '0.0.8']) {
    const { yonetici } = kur({ oku: async yol => yol.endsWith('/latest') ? yayin(surum) : DEPO });
    assert.equal((await yonetici.denetle()).durum, 'guncel'); assert.throws(() => yonetici.indirmeAdresi());
  }
  const { yonetici } = kur(); await yonetici.denetle();
  assert.equal(yonetici.indirmeAdresi(), yayin().assets[0].browser_download_url);
  assert.equal(dahaYeniMi('0.10.0', '0.2.3'), true);
});
test('Eşzamanlı/sık arka plan denetimleri çoğaltılmaz; elle denetim beklemez', async () => {
  const { yonetici, durum } = kur({ simdi: () => 1000 });
  await Promise.all([yonetici.denetle(), yonetici.denetle(), yonetici.denetle()]);
  await yonetici.denetle(); assert.equal(durum.istekler.length, 2);
  await yonetici.denetle({ elle: true }); assert.equal(durum.istekler.length, 4);
});
test('Kimliği veya adı farklı, özel ve eksik gizlilik bilgili depo reddedilir', () => {
  depoyuDogrula(DEPO);
  for (const v of [{ ...DEPO, id: 1 }, { ...DEPO, full_name: 'baska/Notes' },
    { ...DEPO, private: true }, { ...DEPO, private: undefined }]) assert.throws(() => depoyuDogrula(v));
});
test('Harici adres, ön sürüm, taslak ve eksik kurulum reddedilir', () => {
  for (const degistir of [v => { v.draft = true; }, v => { v.prerelease = true; },
    v => { v.assets[0].browser_download_url = 'https://example.com/kurulum.exe'; },
    v => { v.assets[0].state = 'new'; }, v => { v.assets[0].size = 0; }, v => { v.tag_name = 'v../../a'; }]) {
    const veri = yayin(); degistir(veri); assert.throws(() => yayiniDogrula(veri));
  }
});
test('Çevrimdışı hata anahtar istemez, ham hata sızdırmaz ve sonra yeniden denetlenir', async () => {
  let kapali = true;
  const { yonetici } = kur({ oku: async yol => {
    if (kapali) throw Error('Authorization ' + ANAHTAR);
    return yol.endsWith('/latest') ? yayin() : DEPO;
  } });
  const sonuc = await yonetici.denetle();
  assert.equal(sonuc.durum, 'hata'); assert.equal(JSON.stringify(sonuc).includes(ANAHTAR), false);
  kapali = false; assert.equal((await yonetici.denetle({ elle: true })).durum, 'yeni-surum');
});
test('Kapanıştan sonra geciken ağ yanıtı yeni sürümü geri getiremez', async () => {
  let tamamla, sayi = 0;
  const { yonetici } = kur({ oku: () => { sayi++; return new Promise(resolve => { tamamla = resolve; }); } });
  const istek = yonetici.denetle(); await new Promise(setImmediate);
  yonetici.durdur(); tamamla(DEPO); await istek;
  assert.equal(yonetici.yayin, undefined); assert.equal(sayi, 1);
});
test('GitHub kota beklemesi elle denetimle de aşılamaz; süre sonunda yeniden denenir', async () => {
  let simdi = 1000, sayi = 0;
  const { yonetici } = kur({ simdi: () => simdi, oku: async yol => {
    sayi++; if (sayi === 1) throw new BeklemeHatasi(200000);
    return yol.endsWith('/latest') ? yayin() : DEPO;
  } });
  assert.equal((await yonetici.denetle()).durum, 'hata');
  await yonetici.denetle({ elle: true }); assert.equal(sayi, 1);
  simdi = 200001; assert.equal((await yonetici.denetle({ elle: true })).durum, 'yeni-surum'); assert.equal(sayi, 3);
});
function hataIstemcisi(kod, headers = {}, al = () => {}) {
  return { get(secenekler, yanitla) {
    al(secenekler);
    const istek = new EventEmitter(); istek.setTimeout = () => {}; istek.destroy = () => {};
    queueMicrotask(() => { const y = new EventEmitter(); y.statusCode = kod; y.headers = headers; y.resume = () => {}; yanitla(y); });
    return istek;
  } };
}
test('GitHub isteği anahtar/cookie göndermez; sabit HTTPS dışında istek ve yönlendirme reddedilir', async () => {
  let ayar;
  await assert.rejects(() => githubOku('/repos/asilhanalpay/Notes', undefined, hataIstemcisi(302, {}, s => { ayar = s; })));
  assert.equal(ayar.hostname, 'api.github.com'); assert.equal(ayar.port, 443);
  assert.equal(ayar.headers.Authorization, undefined); assert.equal(ayar.headers.Cookie, undefined);
  assert.equal(ayar.headers['Cache-Control'], 'no-cache');
  await assert.rejects(() => githubOku('/users/asilhanalpay', undefined, hataIstemcisi(200)));
});
test('403/429 ve bozuk bekleme başlıkları sınırlı beklemeye dönüştürülür', async () => {
  for (const [kod, headers] of [[429, { 'retry-after': '90' }], [403, { 'x-ratelimit-reset': '1' }], [429, { 'retry-after': 'Infinity' }]]) {
    const once = Date.now();
    await assert.rejects(() => githubOku('/repos/asilhanalpay/Notes', undefined, hataIstemcisi(kod, headers)), e =>
      e instanceof BeklemeHatasi && e.bekleyeKadar >= once + 60000 && e.bekleyeKadar <= Date.now() + 86400000);
  }
});
test('Zaman aşımı isteği sonlandırır; ham ağ hatası döndürülmez', async () => {
  const istemci = { get() {
    const istek = new EventEmitter(); istek.setTimeout = (_s, f) => queueMicrotask(f);
    istek.destroy = hata => istek.emit('error', hata); return istek;
  } };
  await assert.rejects(() => githubOku('/repos/asilhanalpay/Notes', undefined, istemci), /güvenli bağlantı/);
});
test('Geçmiş kurulum adı desteklenir; yeni ad tercih edilir', () => {
  const eski = yayin(); eski.assets[0].name = 'Windows.Masaustu.Uygulamasi.exe';
  eski.assets[0].browser_download_url = eski.assets[0].browser_download_url.replace('Notes.exe', eski.assets[0].name);
  assert.equal(yayiniDogrula(eski).adres, eski.assets[0].browser_download_url);
  eski.assets.push(yayin().assets[0]); assert.equal(yayiniDogrula(eski).adres, yayin().assets[0].browser_download_url);
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

test('Arka plan yeniden denetlerken bilinen yeni sürüm bilgisi korunur; eşzamanlı odak istekleri birleşir', async () => {
  let simdi = 1000;
  const { yonetici, durum } = kur({ simdi: () => simdi });
  await yonetici.denetle();
  const olaylar = []; yonetici.on('durum', veri => olaylar.push(veri));
  simdi += 46000;
  await Promise.all([yonetici.denetle(), yonetici.denetle(), yonetici.denetle()]);
  assert.equal(durum.istekler.length, 4);
  assert.equal(olaylar[0].durum, 'denetleniyor');
  assert.equal(olaylar[0].yeniSurum, '0.0.9');
  assert.equal(olaylar.at(-1).durum, 'yeni-surum');
});
