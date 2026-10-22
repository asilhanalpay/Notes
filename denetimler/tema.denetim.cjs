'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '../arayüz/pencere.html'), 'utf8');
const kod = fs.readFileSync(path.join(__dirname, '../arayüz/tema.js'), 'utf8');

async function ac(t, kayit, hazirla = () => {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://notes.test/' });
  t.after(() => dom.window.close());
  if (kayit !== undefined) dom.window.localStorage.setItem('notes-tema', kayit);
  hazirla(dom.window);
  const hazir = new Promise(resolve => dom.window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  dom.window.eval(kod);
  // DOMContentLoaded beklenmeden tema uygulanmış olmalı.
  const ilkTema = dom.window.document.documentElement.dataset.tema;
  await hazir;
  const secici = dom.window.document.getElementById('tema');
  const sec = tema => { secici.value = tema; secici.dispatchEvent(new dom.window.Event('change')); };
  return { dom, ilkTema, secici, sec };
}

test('Tema seçimi kaydedilir, sonraki açılışta ilk çizimden önce uygulanır ve açık temaya dönülebilir', async t => {
  const ilk = await ac(t);
  assert.equal(ilk.ilkTema, 'acik');
  ilk.dom.window.localStorage.setItem('notlara-dokunma', 'mevcut içerik');
  ilk.sec('karanlik');
  assert.equal(ilk.dom.window.document.documentElement.dataset.tema, 'karanlik');
  assert.equal(ilk.dom.window.localStorage.getItem('notlara-dokunma'), 'mevcut içerik');
  const tekrar = await ac(t, ilk.dom.window.localStorage.getItem('notes-tema'));
  assert.equal(tekrar.ilkTema, 'karanlik');
  assert.equal(tekrar.secici.value, 'karanlik');
  assert.equal(tekrar.dom.window.document.querySelector('meta[name="theme-color"]').content, '#171c19');
  tekrar.sec('acik');
  assert.equal(tekrar.dom.window.localStorage.getItem('notes-tema'), 'acik');
  assert.equal(tekrar.dom.window.document.documentElement.dataset.tema, 'acik');
});

test('Geçersiz veya okunamayan tercih uygulamanın açılmasını engellemez', async t => {
  const bozuk = await ac(t, '<script>gecersiz</script>');
  assert.equal(bozuk.ilkTema, 'acik');
  const kapali = await ac(t, undefined, pencere => {
    Object.defineProperty(pencere, 'localStorage', { get() { throw new Error('Erişim yok'); } });
  });
  assert.equal(kapali.secici.value, 'acik');
  kapali.sec('karanlik');
  assert.equal(kapali.dom.window.document.documentElement.dataset.tema, 'karanlik');
  assert.equal(kapali.dom.window.document.getElementById('temaUyarisi').hidden, false);
});

test('Kayıt hatası görünür; yeniden başarılı seçimde uyarı kalkar', async t => {
  const arayuz = await ac(t);
  const prototip = arayuz.dom.window.Storage.prototype;
  const yaz = prototip.setItem;
  prototip.setItem = () => { throw new Error('Alan dolu'); };
  arayuz.sec('karanlik');
  assert.equal(arayuz.dom.window.document.getElementById('temaUyarisi').hidden, false);
  prototip.setItem = yaz;
  arayuz.sec('acik');
  assert.equal(arayuz.dom.window.document.getElementById('temaUyarisi').hidden, true);
  assert.equal(arayuz.dom.window.localStorage.getItem('notes-tema'), 'acik');
});
