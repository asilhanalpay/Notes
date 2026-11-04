'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const bekle = async () => { for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve)); };
async function ac(t, ilkDurum) {
  const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../arayüz/pencere.html'), 'utf8'), { runScripts: 'outside-only', url: 'file:///uygulama/pencere.html' });
  t.after(() => dom.window.close());
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new dom.window.Event('close')); };
  const durum = { indirmeler: 0, denetimler: 0, iptaller: 0, dinle: null };
  dom.window.notDefterim = {
    surumDurumu: async () => ({ basarili: true, veri: ilkDurum }),
    surumDinle: islem => { durum.dinle = islem; },
    surumIndir: async () => { durum.indirmeler++; return { basarili: true }; },
    surumDenetle: async () => {
      durum.denetimler++;
      return { basarili: true, veri: { ...ilkDurum, durum: 'yeni-surum', aciklama: 'Yeni sürüm hazır', yeniSurum: '0.0.3' } };
    },
    surumIptal: async () => { durum.iptaller++; return { basarili: true, veri: { durum: 'bekliyor', aciklama: 'İptal edildi', surum: '0.0.8' } }; }
  };
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../arayüz/sürüm-bildirimi.js'), 'utf8'));
  await bekle();
  return { dom, durum, oge: id => dom.window.document.getElementById(id) };
}
test('Yeni sürüm uygulama içinde gösterilir; kullanıcı basmadan indirme isteği yapılmaz', async t => {
  const { oge, durum } = await ac(t, { durum: 'guncel', aciklama: 'Güncel', surum: '0.2.3' });
  assert.equal(oge('surumBildirimi').hidden, true);
  durum.dinle({ durum: 'yeni-surum', aciklama: 'Yeni sürüm', surum: '0.2.3', yeniSurum: '0.2.4' });
  assert.equal(oge('surumBildirimi').hidden, false);
  assert.equal(durum.indirmeler, 0);
  oge('surumIndir').click(); await bekle();
  assert.equal(durum.indirmeler, 1);
});
test('Güncelleme penceresinde anahtar veya hesap bağlantısı istenmez', async t => {
  const { oge, dom } = await ac(t, { durum: 'bekliyor', aciklama: 'Anahtarsız denetim', surum: '0.0.8' });
  for (const id of ['erisimFormu', 'erisimAnahtari', 'izinSayfasi', 'surumAyir']) assert.equal(oge(id), null);
  assert.equal(oge('surumDenetle').disabled, false);
  assert.equal(dom.window.document.body.textContent.includes('Contents → Read-only'), false);
});
test('İndirme iptal düğmesi yalnız indirme sırasında görünür ve iptal isteği gönderir', async t => {
  const { oge, durum } = await ac(t, { durum: 'guncel', aciklama: 'Güncel', surum: '0.0.8' });
  assert.equal(oge('surumIptal').hidden, true);
  durum.dinle({ durum: 'indiriliyor', aciklama: 'İndiriliyor', surum: '0.0.8' });
  assert.equal(oge('surumIptal').hidden, false);
  oge('surumIptal').click(); await bekle();
  assert.equal(durum.iptaller, 1); assert.equal(oge('surumIptal').hidden, true);
});

test('Elle denetim düğmesi hemen istek gönderir ve sonucu indirme düğmesiyle gösterir', async t => {
  const { oge, durum } = await ac(t, { durum: 'guncel', aciklama: 'Güncel', surum: '0.0.2', bagli: true });
  oge('surumDenetle').click();
  assert.equal(durum.denetimler, 1);
  await bekle();
  assert.equal(oge('surumBildirimi').hidden, false);
  assert.equal(oge('surumIndir').hidden, false);
  assert.equal(oge('surumBildirimMetni').textContent, 'Yeni sürüm hazır: 0.0.3');
  assert.equal(durum.indirmeler, 0);
});
test('Bildirimdeki Güncelle tek tıkla başlatır; indirme sırasında tekrar başlatılamaz', async t => {
  const { oge, durum } = await ac(t, { durum: 'yeni-surum', aciklama: 'Hazır', surum: '0.0.4', yeniSurum: '0.0.5' });
  oge('surumHizliGuncelle').click(); await bekle();
  assert.equal(durum.indirmeler, 1);
  durum.dinle({ durum: 'indiriliyor', aciklama: 'Güncelleme indiriliyor: %50', surum: '0.0.4', yeniSurum: '0.0.5' });
  assert.equal(oge('surumBildirimi').hidden, false);
  assert.equal(oge('surumHizliGuncelle').hidden, true);
  assert.equal(oge('surumDenetle').disabled, true);
  assert.equal(oge('surumBildirimMetni').textContent, 'Güncelleme indiriliyor: %50');
});
