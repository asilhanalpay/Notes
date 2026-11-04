'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../arayüz/pencere.html'), 'utf8');
const kod = fs.readFileSync(path.join(__dirname, '../arayüz/notlar.js'), 'utf8');
const bekle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };

async function arayuzAc(t, ilkNotlar = [], okumaEkleri = {}) {
  const kayitlar = [];
  const durum = { hata: false, kapandi: false, kapatmaIstegi: null };
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'file:///uygulama/arayüz/pencere.html' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  let saat = 0, sayac = 0;
  const zamanlayicilar = new Map();
  dom.window.setTimeout = (islem, sure) => { zamanlayicilar.set(++sayac, { islem, zaman: saat + sure }); return sayac; };
  dom.window.clearTimeout = kimlik => zamanlayicilar.delete(kimlik);
  const ilerle = async sure => {
    saat += sure;
    for (const [kimlik, zamanlayici] of [...zamanlayicilar]) {
      if (zamanlayici.zaman <= saat) { zamanlayicilar.delete(kimlik); zamanlayici.islem(); }
    }
    await bekle();
  };
  dom.window.notDefterim = {
    oku: async () => ({ basarili: true, veri: { notlar: ilkNotlar, kurtarildi: false, ...okumaEkleri } }),
    kaydet: async notlar => {
      if (durum.kayitKancasi) await durum.kayitKancasi();
      if (durum.hata) return { basarili: false, hata: 'Disk dolu' };
      kayitlar.push(JSON.parse(JSON.stringify(notlar)));
      return { basarili: true };
    },
    kapatmaIsteginiDinle: islem => { durum.kapatmaIstegi = islem; },
    kapat: async () => { durum.kapandi = true; },
    dosyaAc: async () => ({ basarili: true, veri: { iptal: true } })
  };
  dom.window.eval(kod);
  await bekle();
  const oge = kimlik => dom.window.document.getElementById(kimlik);
  const yaz = (kimlik, metin) => { oge(kimlik).value = metin; oge(kimlik).dispatchEvent(new dom.window.Event('input')); };
  return { dom, oge, yaz, kayitlar, durum, ilerle };
}

test('Yeni notun ardışık değişiklikleri doğru sırayla kaydedilir; metin HTML olarak yorumlanmaz', async t => {
  const { dom, oge, yaz, kayitlar, ilerle } = await arayuzAc(t);
  oge('add').click();
  yaz('title', '<img src=x onerror=alert(1)>');
  yaz('body', 'İstanbul için ilk not');
  yaz('body', 'İstanbul için son not');
  await ilerle(650);
  assert.equal(kayitlar.at(-1)[0].body, 'İstanbul için son not');
  assert.equal(dom.window.document.querySelector('.note strong').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(dom.window.document.querySelector('.note img'), null);
  assert.equal(oge('words').textContent, '4 kelime');
  assert.equal(oge('status').textContent, 'Bilgisayara kaydedildi');
});
test('Türkçe arama, silme ve geri alma aynı notu korur', async t => {
  const { oge, yaz, kayitlar } = await arayuzAc(t);
  oge('add').click(); yaz('title', 'İSTANBUL'); yaz('body', 'İçerik');
  await bekle();
  const kimlik = kayitlar.at(-1)[0].id;
  yaz('search', 'istanbul');
  assert.equal(oge('list').querySelectorAll('.note').length, 1);
  oge('delete').click(); oge('confirmDelete').click(); await bekle();
  assert.deepEqual(kayitlar.at(-1), []);
  oge('undo').click(); await bekle();
  assert.equal(kayitlar.at(-1)[0].id, kimlik);
  assert.equal(oge('body').value, 'İçerik');
});
test('Kayıt hatasında kapanış engellenir; yeniden deneme son değişikliği kaydeder', async t => {
  const { oge, yaz, durum, kayitlar, ilerle } = await arayuzAc(t);
  oge('add').click(); await bekle();
  durum.hata = true;
  yaz('body', 'Kaybolmaması gereken metin'); await ilerle(650);
  assert.equal(oge('hata').hidden, false);
  await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, false);
  assert.equal(oge('body').value, 'Kaybolmaması gereken metin');
  durum.hata = false;
  oge('yenidenDene').click(); await bekle();
  assert.equal(kayitlar.at(-1)[0].body, 'Kaybolmaması gereken metin');
  await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, true);
});
test('Hızlı yazma 650 ms sessizlikten sonra tek kayıtta birleşir; değişmeyen not yeniden yazılmaz', async t => {
  const { dom, yaz, ilerle, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: '', updated: 1000 }]);
  for (let i = 1; i <= 100; i++) yaz('body', `Son metin ${i}`);
  assert.equal(kayitlar.length, 0);
  await ilerle(649);
  assert.equal(kayitlar.length, 0);
  yaz('body', 'En son değişiklik');
  await ilerle(649);
  assert.equal(kayitlar.length, 0);
  await ilerle(1);
  assert.equal(kayitlar.length, 1);
  assert.equal(kayitlar[0][0].body, 'En son değişiklik');
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
  await bekle();
  assert.equal(kayitlar.length, 1);
});

test('Ctrl+S bekleyen değişikliği hemen kaydeder ve gecikmiş ikinci kayıt oluşturmaz', async t => {
  const { dom, yaz, ilerle, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: '', updated: 1000 }]);
  yaz('body', 'Beklemeden kaydet');
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
  await bekle();
  assert.equal(kayitlar.length, 1);
  assert.equal(kayitlar[0][0].body, 'Beklemeden kaydet');
  await ilerle(1000);
  assert.equal(kayitlar.length, 1);
});

test('Kapanış bekleme süresini atlar; diske yazma bitmeden pencere kapanmaz', async t => {
  const { yaz, durum, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: '', updated: 1000 }]);
  let tamamla;
  durum.kayitKancasi = () => new Promise(resolve => { tamamla = resolve; });
  yaz('body', 'Kapanıştaki son metin');
  const kapanis = durum.kapatmaIstegi();
  await bekle();
  assert.equal(durum.kapandi, false);
  tamamla();
  await kapanis;
  assert.equal(durum.kapandi, true);
  assert.equal(kayitlar[0][0].body, 'Kapanıştaki son metin');
});
test('Güncelleme yardımcısı başlatılamazsa düzenleyici açık kalır ve kapanış yeniden denenebilir', async t => {
  const { dom, oge, yaz, durum } = await arayuzAc(t);
  oge('add').click(); yaz('body', 'Son değişiklik korunmalı');
  dom.window.notDefterim.kapat = async () => ({ basarili: false, hata: 'Yardımcı başlatılamadı.' });
  await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, false);
  assert.ok(dom.window.document.body.textContent.includes('Yardımcı başlatılamadı.'));
  dom.window.notDefterim.kapat = async () => { durum.kapandi = true; return { basarili: true }; };
  await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, true);
});

test('Devam eden kayıt sırasındaki değişiklikler eski kopyanın arkasında tek son kayıtta birleşir', async t => {
  const { dom, yaz, durum, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: '', updated: 1000 }]);
  let tamamla;
  durum.kayitKancasi = () => new Promise(resolve => { tamamla = resolve; });
  yaz('body', 'İlk kopya');
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
  await bekle();
  for (let i = 0; i < 100; i++) yaz('body', `Yeni kopya ${i}`);
  durum.kayitKancasi = null;
  tamamla();
  await bekle();
  assert.equal(kayitlar.length, 2);
  assert.equal(kayitlar[0][0].body, 'İlk kopya');
  assert.equal(kayitlar[1][0].body, 'Yeni kopya 99');
});

test('Köprü eşzamanlı hata verse de yeniden kayıt denenebilir', async t => {
  const { dom, yaz, oge, ilerle, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: '', updated: 1000 }]);
  const kaydet = dom.window.notDefterim.kaydet;
  dom.window.notDefterim.kaydet = () => { throw new Error('İletişim başarısız'); };
  yaz('body', 'Korunacak metin');
  await ilerle(650);
  assert.equal(oge('hata').hidden, false);
  dom.window.notDefterim.kaydet = kaydet;
  oge('yenidenDene').click();
  await bekle();
  assert.equal(kayitlar.at(-1)[0].body, 'Korunacak metin');
  assert.equal(oge('hata').hidden, true);
});
test('Farklı kaydet açık notun son değişikliğini önce saklar ve yalnız seçili kimliği gönderir', async t => {
  const { dom, oge, yaz, kayitlar } = await arayuzAc(t, [
    { id: 'bir', title: 'Birinci', body: '', updated: 1000 },
    { id: 'iki', title: 'İkinci', body: 'Başka not', updated: 1000 }
  ]);
  let gonderilen;
  dom.window.notDefterim.farkliKaydet = async id => {
    gonderilen = id;
    assert.equal(kayitlar.at(-1)[0].body, 'TXT dosyasına son metin');
    return { basarili: true, veri: { iptal: false, ad: 'Birinci.txt' } };
  };
  yaz('body', 'TXT dosyasına son metin');
  oge('farkliKaydet').click(); await bekle();
  assert.equal(gonderilen, 'bir');
  assert.equal(oge('status').textContent, 'Birinci.txt kaydedildi');
  assert.equal(oge('body').disabled, false);
});
test('Menü yalnız iki seçenek içerir; not yokken dosya açılabilir', async t => {
  const { dom, oge, kayitlar } = await arayuzAc(t);
  assert.deepEqual([...oge('dosyaMenusu').querySelectorAll('button')].map(b => b.id), ['farkliKaydet', 'dosyaAc']);
  assert.equal(oge('farkliKaydet').disabled, true);
  assert.equal(oge('dosyaAc').disabled, false);
  dom.window.notDefterim.dosyaAc = async () => ({ basarili: true, veri: { iptal: false, ad: 'İlk.txt', not: { id: 'txt', title: 'İlk', body: 'Bütün metin', updated: 1000 } } });
  oge('dosyaAc').click(); await bekle();
  assert.equal(oge('body').value, 'Bütün metin');
  assert.equal(kayitlar.at(-1)[0].id, 'txt');
  assert.ok(oge('date').textContent.includes('İlk.txt'));
});
test('Dosya açmadan önce bekleyen kayıt tamamlanır; hatada yeni dosya açılmaz', async t => {
  const { dom, oge, yaz, kayitlar, durum } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: 'Eski', updated: 1000 }]);
  let sayi = 0;
  dom.window.notDefterim.dosyaAc = async () => {
    sayi++;
    assert.equal(kayitlar.at(-1)[0].body, 'Son düzenleme');
    return { basarili: true, veri: { iptal: true } };
  };
  yaz('body', 'Son düzenleme'); oge('dosyaAc').click(); await bekle();
  assert.equal(sayi, 1);
  durum.hata = true; yaz('body', 'Kaydedilemeyen düzenleme');
  oge('dosyaAc').click(); await bekle(); assert.equal(sayi, 1);
  assert.equal(oge('body').value, 'Kaydedilemeyen düzenleme');
});
test('İptal ve dosya açma hatası mevcut notu değiştirmez; aynı dosya yeniden açılınca çoğalmaz', async t => {
  const mevcut = { id: 'bir', title: 'Not', body: 'Korunacak', updated: 1000 };
  const { dom, oge, kayitlar } = await arayuzAc(t, [mevcut]);
  dom.window.notDefterim.dosyaAc = async () => ({ basarili: true, veri: { iptal: true } });
  oge('dosyaAc').click(); await bekle(); assert.equal(kayitlar.length, 0);
  dom.window.notDefterim.dosyaAc = async () => ({ basarili: false, hata: 'TXT okunamadı' });
  oge('dosyaAc').click(); await bekle(); assert.equal(oge('hataMetni').textContent, 'TXT okunamadı');
  assert.equal(oge('body').value, mevcut.body);
  dom.window.notDefterim.dosyaAc = async () => ({ basarili: true, veri: { iptal: false, ad: 'Not.txt', not: mevcut } });
  oge('dosyaAc').click(); await bekle();
  assert.equal(oge('list').querySelectorAll('.note').length, 1);
});
test('İptal edilen farklı kaydet başarı göstermez; ikinci dosya işlemi eşzamanlı başlayamaz', async t => {
  const { dom, oge } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: 'Metin', updated: 1000 }]);
  let bitir, sayi = 0;
  dom.window.notDefterim.farkliKaydet = () => { sayi++; return new Promise(r => { bitir = r; }); };
  oge('farkliKaydet').click(); await bekle();
  oge('farkliKaydet').click(); oge('dosyaAc').click();
  assert.equal(sayi, 1); assert.equal(oge('body').disabled, true);
  bitir({ basarili: true, veri: { iptal: true } }); await bekle();
  assert.equal(oge('status').textContent, 'Notların hazır');
  assert.equal(oge('body').disabled, false);
});
test('Dış TXT kaydı başarısızken Farklı kaydet son metinle kurtarma sağlar', async t => {
  const { dom, oge, yaz, durum, kayitlar } = await arayuzAc(t, [{ id: 'bir', title: 'Not', body: 'Eski', updated: 1000 }]);
  durum.hata = true; yaz('body', 'Kurtarılacak son metin');
  dom.window.notDefterim.farkliKaydet = async (id, not) => {
    assert.equal(id, 'bir'); assert.equal(not.body, 'Kurtarılacak son metin');
    durum.hata = false;
    return { basarili: true, veri: { iptal: false, ad: 'Kurtarılan.txt' } };
  };
  oge('farkliKaydet').click(); await bekle();
  assert.equal(kayitlar.at(-1)[0].body, 'Kurtarılacak son metin');
  assert.equal(oge('status').textContent, 'Kurtarılan.txt kaydedildi');
  assert.equal(oge('hata').hidden, true);
});

test('Önceki oturumdan kalan başarısız TXT kaydı yeniden açılışta uyarılır ve kapanışta yeniden denenir', async t => {
  const { oge, durum } = await arayuzAc(t, [{ id: 'txt', title: 'Not', body: 'JSON içinde korunmuş', updated: 1000 }], { bekleyenKayit: true, dosyalar: { txt: 'Not.txt' } });
  assert.ok(oge('hataMetni').textContent.includes('henüz yazılamamış'));
  durum.hata = true; await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, false);
  durum.hata = false; await durum.kapatmaIstegi();
  assert.equal(durum.kapandi, true);
});
