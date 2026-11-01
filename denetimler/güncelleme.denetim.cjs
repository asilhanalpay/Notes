'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { indir, paketiDogrula, veriAdresi, yardimciMetni } = require('../masaüstü/güncelleme.cjs');
const { SurumBildirimi } = require('../masaüstü/sürüm-bildirimi.cjs');
const govde = Buffer.from('MZ-sentetik-kurulum');
const yayin = { kimlik: 42, boyut: govde.length, ozet: 'sha256:' + createHash('sha256').update(govde).digest('hex'), surum: '0.0.5' };
function yer(t) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-indirme-'));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  return path.join(kok, 'Kurulum.exe');
}
function istemci(yanitlar, istekler = []) {
  return { get(url, ayar, cb) {
    istekler.push({ url: url.href, ...ayar });
    const istek = new EventEmitter();
    istek.setTimeout = () => {};
    istek.destroy = hata => istek.emit('error', hata);
    queueMicrotask(() => {
      const v = yanitlar.shift();
      const r = Readable.from(v.parcalar || [v.govde || govde]);
      r.statusCode = v.durum ?? 200; r.headers = v.headers || {};
      cb(r);
    });
    return istek;
  } };
}
test('Özel varlık API indirmesi özeti ve boyutu doğrular; anahtar veri sunucusuna gitmez', async t => {
  const dosya = yer(t), istekler = [], yuzdeler = [];
  await indir({ yayin, anahtar: 'sentetik-gizli', dosya, ilerle: n => yuzdeler.push(n), istemci: istemci([
    { durum: 302, headers: { location: 'https://release-assets.githubusercontent.com/a?imza=sentetik' } },
    { headers: { 'content-length': String(govde.length) }, parcalar: [govde.subarray(0, 4), govde.subarray(4)] }
  ], istekler) });
  assert.deepEqual(fs.readFileSync(dosya), govde);
  assert.equal(istekler[0].url, 'https://api.github.com/repos/asilhanalpay/Notes/releases/assets/42');
  assert.equal(istekler[0].headers.Authorization, 'Bearer sentetik-gizli');
  assert.equal(istekler[1].headers.Authorization, undefined);
  assert.equal(yuzdeler.at(-1), 100);
});
test('Yanlış özet, fazla/eksik gövde, HTTP hatası ve boyut başlığı kurulum dosyası bırakmaz', async t => {
  for (const v of [
    { govde: Buffer.alloc(govde.length, 0) }, { govde: Buffer.concat([govde, govde]) },
    { govde: govde.subarray(0, 4) }, { durum: 401 }, { headers: { 'content-length': '1' } }
  ]) {
    const dosya = yer(t);
    await assert.rejects(indir({ yayin, anahtar: 'gizli', dosya, istemci: istemci([v]) }), /bütünlüğü/);
    assert.equal(fs.existsSync(dosya), false);
  }
});
test('HTTP, sahte GitHub adı, kullanıcı bilgisi, port ve başka sunucuya yönlendirme reddedilir', async t => {
  for (const adres of ['http://release-assets.githubusercontent.com/a', 'https://release-assets.githubusercontent.com.evil.test/a',
    'https://x@release-assets.githubusercontent.com/a', 'https://objects.githubusercontent.com:444/a', 'https://evil.test/a', 'https://api.github.com/a']) {
    assert.throws(() => veriAdresi(adres));
    const istekler = [];
    await assert.rejects(indir({ yayin, anahtar: 'gizli', dosya: yer(t), istemci: istemci([{ durum: 302, headers: { location: adres } }], istekler) }));
    assert.equal(istekler.length, 1);
  }
});
test('İptal edilen indirme ve özeti olmayan yayın kurulamaz', async t => {
  const c = new AbortController(); c.abort();
  const dosya = yer(t);
  await assert.rejects(indir({ yayin, anahtar: 'gizli', dosya, signal: c.signal, istemci: istemci([{}]) }));
  assert.equal(fs.existsSync(dosya), false);
  for (const ek of [{ ozet: undefined }, { ozet: 'sha256:yanlis' }, { kimlik: '../1' }, { boyut: Infinity }]) {
    assert.throws(() => paketiDogrula({ ...yayin, ...ek }));
  }
});
test('Yardımcı hedefi düz metin olarak alır; sessiz kurulum ve süreç bekleme zorla kapatmaz', () => {
  const metin = yardimciMetni({ dosya: "C:\\O'Brien\\Kurulum.exe", hedef: "C:\\Notes boşluk ';calc;#", ozet: 'a'.repeat(64), pid: 123,
    sonuc: 'C:\\sonuc.json', hazir: 'C:\\hazir' });
  assert.ok(metin.includes("$Hedef = 'C:\\Notes boşluk '';calc;#'"));
  assert.ok(metin.includes('/S --updated /currentuser /D=$Hedef'));
  assert.ok(metin.includes('WaitForExit(300000)'));
  assert.equal(/Stop-Process|taskkill|ExecutionPolicy/.test(metin), false);
});
function yonetici() {
  const s = new SurumBildirimi({ surum: '0.0.4', paketli: true, platform: 'win32', kasa: {} });
  s.anahtar = 'gizli'; s.yayin = { ...yayin, adres: 'https://github.com/asilhanalpay/Notes/releases/download/v0.0.5/Notes.exe' };
  s.bildir('yeni-surum', 'Hazır', { yeniSurum: '0.0.5' });
  return s;
}
test('Güncelleme çift tıklamayı engeller; bitmeden kurulum durumu gösterilmez', async () => {
  const s = yonetici(); let bitir;
  const paket = { temizle() {}, baslat() {} };
  const istek = s.guncelle(() => new Promise(r => { bitir = r; }));
  assert.equal(s.gorunum().durum, 'indiriliyor');
  await assert.rejects(s.guncelle(() => assert.fail('İkinci indirme olamaz.')));
  bitir(paket); assert.equal(await istek, paket);
  assert.equal(s.gorunum().durum, 'kuruluyor');
});
test('İndirme hatasında yeniden denenebilir; bağlantı kaldırıldıktan sonra paket kurulamaz', async () => {
  const s = yonetici();
  await assert.rejects(s.guncelle(async () => { throw new Error('Sentetik hata'); }));
  assert.equal(s.gorunum().durum, 'yeni-surum'); assert.equal(s.mesgul, false);
  let bitir, silindi = false;
  const istek = s.guncelle(() => new Promise(r => { bitir = r; }));
  s.kasa.sil = () => {}; s.ayir();
  bitir({ temizle() { silindi = true; } });
  await assert.rejects(istek);
  assert.equal(silindi, true); assert.equal(s.gorunum().durum, 'baglanti-gerekli');
});
