'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { NotDeposu, kodla, coz, notlariDogrula, atomikYaz } = require('../masaustu/depolama.cjs');
const ornek = (metin = 'İlk düşüncem') => [{ id: 'bir', title: 'Türkçe başlık', body: metin, updated: 1000 }];
function depoOlustur(t) {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'not-defterim-'));
  t.after(() => fs.rmSync(klasor, { recursive: true, force: true }));
  return new NotDeposu(klasor);
}

test('İlk açılış boş olur; Türkçe notlar uygulama yeniden açıldığında korunur', t => {
  const depo = depoOlustur(t);
  assert.deepEqual(depo.oku().notlar, []);
  depo.kaydet(ornek());
  const yeniden = new NotDeposu(path.dirname(depo.dosya));
  assert.deepEqual(yeniden.oku().notlar, ornek());
});
test('Bozuk ana dosya son sağlam yedekten kurtarılır; yeni kayıt yedeği bozmaz', t => {
  const depo = depoOlustur(t);
  depo.oku();
  depo.kaydet(ornek('önceki'));
  depo.kaydet(ornek('sonraki'));
  fs.writeFileSync(depo.dosya, '{bozuk');
  const yeniden = new NotDeposu(path.dirname(depo.dosya));
  assert.deepEqual(yeniden.oku(), { notlar: ornek('önceki'), kurtarildi: true });
  yeniden.kaydet(ornek('kurtarılan'));
  assert.deepEqual(coz(fs.readFileSync(depo.yedek, 'utf8')), ornek('önceki'));
});
test('İki dosya da bozuksa kayıt engellenir ve bozuk dosyalar korunur', t => {
  const depo = depoOlustur(t);
  fs.writeFileSync(depo.dosya, 'bozuk');
  fs.writeFileSync(depo.yedek, 'bozuk yedek');
  assert.throws(() => depo.oku(), /kaydetme durduruldu/);
  assert.throws(() => depo.kaydet([]), /okunmadan/);
  assert.equal(fs.readFileSync(depo.dosya, 'utf8'), 'bozuk');
});
test('Geçersiz veya yinelenen kimlikli veri mevcut not dosyasını değiştiremez', t => {
  const depo = depoOlustur(t);
  depo.oku(); depo.kaydet(ornek());
  for (const veri of [null, [null], [...ornek(), ...ornek()], [{ ...ornek()[0], updated: Infinity }]]) {
    assert.throws(() => depo.kaydet(veri));
  }
  assert.deepEqual(coz(fs.readFileSync(depo.dosya, 'utf8')), ornek());
});
test('Yedek biçimi ve boyut sınırı denetlenir', () => {
  assert.deepEqual(coz(kodla(ornek())), ornek());
  assert.throws(() => coz('{"surum":2,"notlar":[]}'), /desteklenmiyor/);
  assert.throws(() => notlariDogrula([{ ...ornek()[0], title: 'a'.repeat(501) }]));
  assert.throws(() => notlariDogrula([{ ...ornek()[0], body: 'a'.repeat(1000001) }]));
});
test('Atomik yazma başarısız olursa önceki veri korunur ve geçici dosya temizlenir', t => {
  const depo = depoOlustur(t);
  depo.oku(); depo.kaydet(ornek());
  const hedef = path.join(path.dirname(depo.dosya), 'dizin');
  fs.mkdirSync(hedef);
  assert.throws(() => atomikYaz(hedef, 'yeni veri'));
  assert.equal(fs.readdirSync(path.dirname(depo.dosya)).some(ad => ad.endsWith('.tmp')), false);
  assert.deepEqual(coz(fs.readFileSync(depo.dosya, 'utf8')), ornek());
});
