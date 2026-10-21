'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../arayuz/index.html'), 'utf8');
const kod = fs.readFileSync(path.join(__dirname, '../arayuz/app.js'), 'utf8');
const bekle = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };

async function arayuzAc(t, ilkNotlar = []) {
  const kayitlar = [];
  const durum = { hata: false, kapandi: false, kapatmaIstegi: null };
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'file:///uygulama/arayuz/index.html' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  dom.window.notDefterim = {
    oku: async () => ({ basarili: true, veri: { notlar: ilkNotlar, kurtarildi: false } }),
    kaydet: async notlar => {
      if (durum.hata) return { basarili: false, hata: 'Disk dolu' };
      kayitlar.push(JSON.parse(JSON.stringify(notlar)));
      return { basarili: true };
    },
    kapatmaIsteginiDinle: islem => { durum.kapatmaIstegi = islem; },
    kapat: async () => { durum.kapandi = true; },
    iceAktar: async () => ({ basarili: true, veri: { iptal: false, notlar: [{ id: 'eski', title: 'Yedek', body: 'Yedek içerik', updated: 1000 }] } }),
    yedekle: async () => ({ basarili: true, veri: { iptal: false } })
  };
  dom.window.eval(kod);
  await bekle();
  const oge = kimlik => dom.window.document.getElementById(kimlik);
  const yaz = (kimlik, metin) => { oge(kimlik).value = metin; oge(kimlik).dispatchEvent(new dom.window.Event('input')); };
  return { dom, oge, yaz, kayitlar, durum };
}

test('Yeni notun ardışık değişiklikleri doğru sırayla kaydedilir; metin HTML olarak yorumlanmaz', async t => {
  const { dom, oge, yaz, kayitlar } = await arayuzAc(t);
  oge('add').click();
  yaz('title', '<img src=x onerror=alert(1)>');
  yaz('body', 'İstanbul için ilk not');
  yaz('body', 'İstanbul için son not');
  await bekle();
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
  const { oge, yaz, durum, kayitlar } = await arayuzAc(t);
  oge('add').click(); await bekle();
  durum.hata = true;
  yaz('body', 'Kaybolmaması gereken metin'); await bekle();
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
test('Yedekten ekleme mevcut notları silmez ve yeni kimlik üretir', async t => {
  const { oge, kayitlar } = await arayuzAc(t, [{ id: 'eski', title: 'Mevcut', body: 'Kalacak', updated: 1000 }]);
  oge('iceAktar').click(); await bekle();
  const sonuc = kayitlar.at(-1);
  assert.equal(sonuc.length, 2);
  assert.equal(sonuc[1].body, 'Kalacak');
  assert.notEqual(sonuc[0].id, sonuc[1].id);
});
