'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { NotDeposu } = require('../masaüstü/depolama.cjs');
const { NotDosyalari, dosyaAdi } = require('../masaüstü/not-dosyaları.cjs');
function kur(t, ek = {}) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-txt-'));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  const veri = path.join(kok, 'veri');
  const depo = new NotDeposu(veri); depo.oku();
  depo.kaydet([{ id: 'bir', title: 'İğdır notu', body: 'Son metin\nİkinci satır', updated: 1000 },
    { id: 'iki', title: 'Diğer not', body: 'Dışarı çıkmamalı', updated: 1000 }]);
  const pencere = {};
  const durum = { dialoglar: [], acilanlar: [] };
  const hedef = path.join(kok, 'seçilen konum.txt');
  const islem = new NotDosyalari({ depo, veriKlasoru: veri, pencere: () => pencere,
    dialog: { showSaveDialog: async (p, ayar) => { durum.dialoglar.push({ p, ayar }); return { canceled: false, filePath: hedef }; } },
    shell: { openPath: async p => { durum.acilanlar.push(p); return ''; } }, ...ek });
  return { kok, depo, hedef, islem, durum, pencere };
}
test('Farklı kaydet seçilen konuma yalnız açık notu Türkçe UTF-8 metniyle yazar', async t => {
  const { depo, hedef, islem, durum, pencere } = kur(t);
  const onceki = fs.readFileSync(depo.dosya);
  const sonuc = await islem.farkliKaydet('bir');
  assert.equal(sonuc.iptal, false);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'İğdır notu\r\n\r\nSon metin\r\nİkinci satır');
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
  assert.equal(durum.dialoglar[0].p, pencere);
  assert.equal(durum.dialoglar[0].ayar.defaultPath, 'İğdır notu.txt');
  assert.deepEqual(durum.dialoglar[0].ayar.filters[0].extensions, ['txt']);
});
test('Konum seçimi iptal edilirse dosya yazılmaz; JSON/anahtar uzantısına TXT yazılmaz', async t => {
  const { islem, hedef, depo } = kur(t);
  islem.dialog.showSaveDialog = async () => ({ canceled: true, filePath: hedef });
  assert.equal((await islem.farkliKaydet('bir')).iptal, true);
  assert.equal(fs.existsSync(hedef), false);
  const onceki = fs.readFileSync(depo.dosya);
  islem.dialog.showSaveDialog = async () => ({ canceled: false, filePath: depo.dosya });
  await assert.rejects(islem.farkliKaydet('bir'), /\.txt/);
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
});
test('Uygulamaya kaydet önce dosyayı tamamlar sonra klasörü açar; önceki kopyalar ezilmez', async t => {
  const { islem, durum, depo } = kur(t);
  const onceki = fs.readFileSync(depo.dosya);
  islem.shell.openPath = async p => {
    const adlar = fs.readdirSync(p);
    assert.ok(adlar.length);
    for (const ad of adlar) assert.ok(fs.readFileSync(path.join(p, ad), 'utf8').includes('İkinci satır'));
    durum.acilanlar.push(p); return '';
  };
  const ilk = await islem.uygulamayaKaydet('bir');
  const ikinci = await islem.uygulamayaKaydet('bir');
  assert.equal(ilk.klasorAcildi, true);
  assert.equal(ilk.ad, 'İğdır notu.txt');
  assert.equal(ikinci.ad, 'İğdır notu (2).txt');
  assert.deepEqual(durum.acilanlar, [islem.klasor, islem.klasor]);
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
});
test('Dosya kaydedilip klasör açılamazsa başarılı kayıt ayrı bildirilir', async t => {
  const { islem } = kur(t);
  islem.shell.openPath = async () => { throw new Error('Sentetik Explorer hatası'); };
  const sonuc = await islem.uygulamayaKaydet('bir');
  assert.equal(sonuc.klasorAcildi, false);
  assert.ok(fs.existsSync(path.join(islem.klasor, sonuc.ad)));
});
test('Yazma başarısızsa klasör açılmaz; geçersiz/bulunmayan not dosya oluşturamaz', async t => {
  const { islem, durum } = kur(t);
  for (const id of [null, {}, 'yok']) await assert.rejects(islem.uygulamayaKaydet(id));
  assert.equal(fs.existsSync(islem.klasor), false);
  fs.writeFileSync(islem.klasor, 'Klasör yerine sentetik engel');
  await assert.rejects(islem.uygulamayaKaydet('bir'));
  assert.deepEqual(durum.acilanlar, []);
});
test('Dosya adı başlığı yol olarak kullanmaz ve Windows özel adlarıyla boş başlığı düzeltir', () => {
  assert.equal(dosyaAdi(''), 'Başlıksız not.txt');
  assert.equal(dosyaAdi('CON'), 'Not-CON.txt');
  assert.equal(dosyaAdi('com¹'), 'Not-com¹.txt');
  const ad = dosyaAdi('../../çok:özel\\not?*<>|". ');
  assert.equal(/[<>:"/\\|?*]/u.test(ad), false);
  assert.ok(ad.endsWith('.txt'));
});
