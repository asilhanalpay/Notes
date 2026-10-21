'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { SurumBildirimi, ErisimKasasi, githubOku, yayiniDogrula, depoyuDogrula,
  dahaYeniMi, ARALIK, ErisimHatasi } = require('../masaustu/surum-bildirimi.cjs');
const ANAHTAR = 'github_pat_' + 'a'.repeat(30);
const DEPO = { id: 1427086629, full_name: 'asilhanalpay/-lk-Projem', private: true };
function yayin(surum = '0.2.4') {
  return { tag_name: `v${surum}`, draft: false, prerelease: false, assets: [{
    name: 'Windows.Masaustu.Uygulamasi.exe', state: 'uploaded', size: 100,
    browser_download_url: `https://github.com/asilhanalpay/-lk-Projem/releases/download/v${surum}/Windows.Masaustu.Uygulamasi.exe`
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
  yonetici.baslat(); await yonetici.denetle();
  assert.equal(durum.istekler.length, 0);
  assert.equal(yonetici.gorunum().durum, 'baglanti-gerekli');
});
test('Altı saatlik denetim yalnızca yeni sürüm bildirir; anahtar arayüze dönmez', async () => {
  const { yonetici, durum } = kur(); yonetici.baslat();
  const sonuc = await yonetici.denetle();
  assert.deepEqual(durum.araliklar, [ARALIK]);
  assert.equal(sonuc.durum, 'yeni-surum');
  assert.equal(sonuc.yeniSurum, '0.2.4');
  assert.equal(durum.istekler.length, 2);
  assert.equal(JSON.stringify(sonuc).includes(ANAHTAR), false);
  assert.equal(yonetici.indirmeAdresi(), yayin().assets[0].browser_download_url);
});
test('Eski ve eşit sürümler için güncelleme bildirimi gösterilmez', async () => {
  for (const surum of ['0.2.2', '0.2.3']) {
    const { yonetici } = kur({ oku: async yol => yol.endsWith('/latest') ? yayin(surum) : DEPO });
    yonetici.baslat(); assert.equal((await yonetici.denetle()).durum, 'guncel');
    assert.throws(() => yonetici.indirmeAdresi());
  }
  assert.equal(dahaYeniMi('0.10.0', '0.2.3'), true);
});
test('Eşzamanlı ve sık denetimler çoğaltılmaz', async () => {
  const { yonetici, durum } = kur(); yonetici.baslat();
  await Promise.all([yonetici.denetle(), yonetici.denetle(), yonetici.denetle()]);
  await yonetici.denetle(); assert.equal(durum.istekler.length, 2);
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
  yonetici.baslat(); const sonuc = await yonetici.denetle();
  assert.equal(sonuc.durum, 'hata');
  assert.equal(JSON.stringify(sonuc).includes(ANAHTAR), false);
});
test('Bağlantıyı kaldırdıktan sonra gecikmiş denetim bildirimi geri getiremez', async () => {
  let tamamla;
  const { yonetici, kasa } = kur({ oku: () => new Promise(resolve => { tamamla = resolve; }) });
  yonetici.baslat(); const istek = yonetici.denetle();
  yonetici.ayir(); tamamla(DEPO); await istek;
  assert.equal(yonetici.gorunum().durum, 'baglanti-gerekli');
  assert.equal(kasa.anahtar, null); assert.throws(() => yonetici.indirmeAdresi());
});
test('Bağlantıyı kaldırdıktan sonra gecikmiş yetkilendirme anahtarı yeniden kaydedemez', async () => {
  let tamamla;
  const { yonetici, kasa } = kur({ oku: () => new Promise(resolve => { tamamla = resolve; }) });
  const istek = yonetici.bagla(ANAHTAR); yonetici.ayir(); tamamla(DEPO);
  await assert.rejects(() => istek); assert.equal(kasa.anahtar, null);
});
test('Windows şifrelemesi yoksa bağlantı kurulamaz', async () => {
  const { yonetici, kasa, durum } = kur(); kasa.uygunMu = () => false;
  assert.equal(yonetici.baslat().durum, 'kullanilamiyor');
  await assert.rejects(() => yonetici.bagla(ANAHTAR));
  assert.equal(durum.istekler.length, 0);
});
test('Kasa şifreleme kullanır ve geçersiz anahtarları saklamaz', t => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'surum-kasa-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  const sifreleme = { isEncryptionAvailable: () => true,
    encryptString: s => Buffer.from(s.split('').reverse().join('')),
    decryptString: b => b.toString().split('').reverse().join('') };
  const dosya = path.join(klasor, 'erisim.bin');
  const kasa = new ErisimKasasi(dosya, sifreleme);
  kasa.kaydet(ANAHTAR); assert.equal(kasa.oku(), ANAHTAR);
  assert.equal(fs.readFileSync(dosya, 'utf8').includes(ANAHTAR), false);
  assert.throws(() => kasa.kaydet('parola'));
  sifreleme.isEncryptionAvailable = () => false;
  assert.throws(() => kasa.kaydet(ANAHTAR));
  assert.throws(() => kasa.oku());
});
test('GitHub isteği yalnızca sabit HTTPS kaynağını kullanır; yönlendirme takip edilmez', async () => {
  let ayarlar;
  const istemci = { get(secenekler, yanitla) {
    ayarlar = secenekler;
    const istek = new EventEmitter(); istek.setTimeout = () => {}; istek.destroy = () => {};
    queueMicrotask(() => { const yanit = new EventEmitter(); yanit.statusCode = 302; yanit.resume = () => {}; yanitla(yanit); });
    return istek;
  } };
  await assert.rejects(() => githubOku('/repos/asilhanalpay/-lk-Projem', ANAHTAR, undefined, istemci));
  assert.equal(ayarlar.hostname, 'api.github.com'); assert.equal(ayarlar.port, 443);
  await assert.rejects(() => githubOku('/users/asilhanalpay', ANAHTAR, undefined, istemci));
});

test('Süresi dolan bağlantı yeniden kurulabilir veya kaldırılabilir; indirme adresi verilmez', async () => {
  const { yonetici } = kur({ oku: async () => { throw new ErisimHatasi('Yetki yok'); } });
  yonetici.baslat(); const sonuc = await yonetici.denetle();
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
  await assert.rejects(() => githubOku('/repos/asilhanalpay/-lk-Projem', ANAHTAR, undefined, istemci), /güvenli bağlantı/);
});
