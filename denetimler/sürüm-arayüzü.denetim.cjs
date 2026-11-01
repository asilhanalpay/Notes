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
  const durum = { indirmeler: 0, denetimler: 0, anahtar: null, dinle: null };
  dom.window.notDefterim = {
    surumDurumu: async () => ({ basarili: true, veri: ilkDurum }),
    surumDinle: islem => { durum.dinle = islem; },
    surumIndir: async () => { durum.indirmeler++; return { basarili: true }; },
    surumDenetle: async () => {
      durum.denetimler++;
      return { basarili: true, veri: { ...ilkDurum, durum: 'yeni-surum', aciklama: 'Yeni sürüm hazır', yeniSurum: '0.0.3' } };
    },
    surumBagla: async anahtar => { durum.anahtar = anahtar; return { basarili: true }; }
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
test('Erişim anahtarı gönderildikten sonra alandan silinir ve metin olarak gösterilmez', async t => {
  const { dom, oge, durum } = await ac(t, { durum: 'baglanti-gerekli', aciklama: 'Bağlan', surum: '0.2.3' });
  const anahtar = 'github_pat_'+'a'.repeat(30);
  oge('erisimAnahtari').value = anahtar;
  oge('erisimFormu').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
  await bekle();
  assert.equal(durum.anahtar, anahtar);
  assert.equal(oge('erisimAnahtari').value, '');
  assert.equal(dom.window.document.body.textContent.includes(anahtar), false);
});

test('Bağlantı süresi dolsa bile yerel erişim kaydını kaldırma seçeneği görünür', async t => {
  const { oge } = await ac(t, { durum: 'baglanti-gerekli', aciklama: 'Bağlantıyı yenile', surum: '0.2.3', bagli: true });
  assert.equal(oge('surumAyir').hidden, false);
  assert.equal(oge('erisimFormu').hidden, false);
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
