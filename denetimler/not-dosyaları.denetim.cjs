'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { NotDeposu } = require('../masaüstü/depolama.cjs');
const { NotDosyalari, dosyaAdi } = require('../masaüstü/not-dosyaları.cjs');
function kur(t) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-txt-'));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  const veri = path.join(kok, 'veri');
  const depo = new NotDeposu(veri); depo.oku();
  depo.kaydet([{ id: 'bir', title: 'İğdır notu', body: 'Son metin\nİkinci satır', updated: 1000 },
    { id: 'iki', title: 'Diğer not', body: 'Dışarı çıkmamalı', updated: 1000 }]);
  const hedef = path.join(kok, 'seçilen konum.txt');
  const durum = { ayar: null, iptal: false, hedef };
  const ayarlar = { depo, veriKlasoru: veri, pencere: () => ({}), dialog: {
    showSaveDialog: async (_, ayar) => { durum.ayar = ayar; return { canceled: durum.iptal, filePath: durum.hedef }; },
    showOpenDialog: async (_, ayar) => { durum.ayar = ayar; return { canceled: durum.iptal, filePaths: [durum.hedef] }; }
  } };
  const islem = new NotDosyalari(ayarlar);
  return { kok, veri, depo, hedef, islem, durum, ayarlar };
}
async function ac(t, icerik = 'İlk satır\r\nİkinci satır\r\n') {
  const ortam = kur(t);
  fs.writeFileSync(ortam.hedef, icerik);
  const { not } = await ortam.islem.dosyaAc();
  const notlar = [not, ...ortam.depo.oku().notlar];
  ortam.islem.kaydet(notlar);
  return { ...ortam, not, notlar };
}
test('Farklı kaydet varsayılan TXT, yalnız gövde ve UTF-8 kullanır; sonraki düzenlemeler aynı hedefe gider', async t => {
  const { depo, hedef, islem, durum } = kur(t);
  const onceki = fs.readFileSync(depo.dosya);
  assert.equal((await islem.farkliKaydet('bir')).iptal, false);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'Son metin\r\nİkinci satır');
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
  assert.equal(durum.ayar.defaultPath, 'İğdır notu.txt');
  assert.deepEqual(durum.ayar.filters[0].extensions, ['txt']);
  const notlar = depo.oku().notlar; notlar[0].body = 'Yeni içerik'; islem.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'Yeni içerik');
});
test('İptal edilen seçiciler yazmaz; TXT dışındaki hedefler reddedilir', async t => {
  const { islem, hedef, depo, durum } = kur(t);
  durum.iptal = true;
  assert.equal((await islem.farkliKaydet('bir')).iptal, true);
  assert.equal((await islem.dosyaAc()).iptal, true);
  assert.equal(fs.existsSync(hedef), false);
  durum.iptal = false; durum.hedef = depo.dosya;
  const onceki = fs.readFileSync(depo.dosya);
  await assert.rejects(islem.farkliKaydet('bir'), /\.txt/u);
  await assert.rejects(islem.dosyaAc(), /\.txt/u);
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
});
test('TXT açma tüm metni korur, yeni not ekler; aynı dosya ikinci kez çoğalmaz', async t => {
  const { islem, not, notlar, hedef, durum } = await ac(t);
  assert.equal(not.title, 'seçilen konum');
  assert.equal(not.body, 'İlk satır\nİkinci satır\n');
  assert.equal(notlar.length, 3);
  const ikinci = await islem.dosyaAc();
  assert.equal(ikinci.not.id, not.id);
  assert.deepEqual(durum.ayar.properties, ['openFile']);
  not.body = 'Değişen Türkçe\nYeni satır\n'; islem.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'Değişen Türkçe\r\nYeni satır\r\n');
});
test('Bağlantı yeniden başlatmada korunur; başlık değişmesi TXT gövdesine eklenmez', async t => {
  const { ayarlar, islem, not, notlar, hedef } = await ac(t);
  const yeniden = new NotDosyalari(ayarlar);
  assert.equal(yeniden.oku().dosyalar[not.id], path.basename(hedef));
  const eski = fs.readFileSync(hedef);
  not.title = 'Yerel başlık'; yeniden.kaydet(notlar);
  assert.deepEqual(fs.readFileSync(hedef), eski);
  not.body = 'Yeniden açılıştan sonra'; yeniden.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), not.body);
  assert.equal(islem.oku().notlar[0].title, 'Yerel başlık');
});
test('Dışarıda değişen veya silinen TXT ezilmez; düzenleme JSON’da korunur, Farklı kaydet ile kurtarılır', async t => {
  const { islem, not, notlar, hedef, depo, durum, kok } = await ac(t);
  fs.writeFileSync(hedef, 'Dış düzenleme'); not.body = 'Notes düzenlemesi';
  assert.throws(() => islem.kaydet(notlar), /güncellenemedi/u);
  assert.equal(fs.readFileSync(hedef, 'utf8'), 'Dış düzenleme');
  assert.equal(depo.oku().notlar[0].body, 'Notes düzenlemesi');
  fs.unlinkSync(hedef);
  assert.throws(() => islem.kaydet(notlar), /güncellenemedi/u);
  assert.equal(fs.existsSync(hedef), false);
  durum.hedef = path.join(kok, 'kurtarılan.txt');
  await islem.farkliKaydet(not.id, not); islem.kaydet(notlar);
  assert.equal(fs.readFileSync(durum.hedef, 'utf8'), not.body);
});
test('UTF-8 BOM ve UTF-16 BOM, satır sonları ve değişmeyen dosyanın baytları korunur', async t => {
  for (const kodlama of ['utf8', 'utf16le', 'utf16be']) {
    let veri = Buffer.from('İğdır\nİkinci\n', kodlama === 'utf8' ? 'utf8' : 'utf16le');
    if (kodlama === 'utf16be') veri.swap16();
    const bom = Buffer.from(kodlama === 'utf8' ? [0xef, 0xbb, 0xbf] : kodlama === 'utf16le' ? [0xff, 0xfe] : [0xfe, 0xff]);
    const { islem, not, notlar, hedef } = await ac(t, Buffer.concat([bom, veri]));
    assert.deepEqual(fs.readFileSync(hedef), Buffer.concat([bom, veri]));
    not.body += 'Son\n'; islem.kaydet(notlar);
    let beklenen = Buffer.from(not.body, kodlama === 'utf8' ? 'utf8' : 'utf16le');
    if (kodlama === 'utf16be') beklenen.swap16();
    assert.deepEqual(fs.readFileSync(hedef), Buffer.concat([bom, beklenen]));
  }
});
test('Bozuk kodlama, ikili içerik, büyük dosya ve klasör not eklemeden reddedilir', async t => {
  const { islem, hedef, depo } = kur(t);
  const onceki = fs.readFileSync(depo.dosya);
  for (const icerik of [Buffer.from([0xc3, 0x28]), 'İçerik\0', 'a'.repeat(1000001), Buffer.alloc(4 * 1024 * 1024 + 1)]) {
    fs.writeFileSync(hedef, icerik); await assert.rejects(islem.dosyaAc());
  }
  fs.unlinkSync(hedef); fs.mkdirSync(hedef); await assert.rejects(islem.dosyaAc());
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
});
test('Notu silmek özgün TXT’yi silmez; geri alma aynı bağlantıyı sürdürür', async t => {
  const { islem, not, notlar, hedef } = await ac(t);
  const onceki = fs.readFileSync(hedef);
  islem.kaydet(notlar.filter(n => n.id !== not.id));
  assert.deepEqual(fs.readFileSync(hedef), onceki);
  not.body = 'Geri alınan not'; islem.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), not.body);
});
test('Bozuk bağlantı kaydı dosyaların üstüne yazmaz; JSON içeriği korunur', async t => {
  const { ayarlar, islem, depo, hedef } = await ac(t);
  fs.writeFileSync(islem.bagDosyasi, '{bozuk');
  const onceki = fs.readFileSync(depo.dosya), txt = fs.readFileSync(hedef);
  const yeniden = new NotDosyalari(ayarlar);
  assert.throws(() => yeniden.oku(), /bağlantı/u);
  assert.throws(() => yeniden.kaydet([]), /bağlantı/u);
  assert.deepEqual(fs.readFileSync(depo.dosya), onceki);
  assert.deepEqual(fs.readFileSync(hedef), txt);
});
test('Bağlı hedefe Farklı kaydet reddedilir; geçersiz not ve başarısız yazma başarı dönmez', async t => {
  const { islem, not, hedef, durum, kok } = await ac(t);
  await assert.rejects(islem.farkliKaydet(not.id), /içinde açık/u);
  await assert.rejects(islem.farkliKaydet('yok'));
  await assert.rejects(islem.farkliKaydet(not.id, { ...not, id: 'başka' }));
  durum.hedef = path.join(kok, 'olmayan', 'not.txt');
  await assert.rejects(islem.farkliKaydet(not.id));
  assert.equal(fs.existsSync(durum.hedef), false);
  assert.ok(fs.existsSync(hedef));
});
test('Windows dosya adı başlıktan yol üretmez ve özel adları düzeltir', () => {
  assert.equal(dosyaAdi(''), 'Başlıksız not.txt');
  assert.equal(dosyaAdi('CON'), 'Not-CON.txt');
  assert.equal(dosyaAdi('com¹'), 'Not-com¹.txt');
  assert.equal(/[<>:"/\\|?*]/u.test(dosyaAdi('../../çok:özel\\not?*<>|". ')), false);
});
test('TXT yazma/yeniden adlandırma hatası özgün dosyayı korur; tekrar deneme ve geçici dosya temizliği çalışır', async t => {
  const { islem, not, notlar, hedef, kok, depo } = await ac(t);
  const onceki = fs.readFileSync(hedef);
  const rename = fs.renameSync;
  fs.renameSync = (kaynak, hedefYol) => { if (hedefYol === hedef) throw new Error('Sentetik izin hatası'); return rename(kaynak, hedefYol); };
  try {
    not.body = 'Korunacak değişiklik';
    assert.throws(() => islem.kaydet(notlar), /güncellenemedi/u);
    assert.deepEqual(fs.readFileSync(hedef), onceki);
    assert.equal(depo.oku().notlar[0].body, not.body);
    assert.equal(fs.readdirSync(kok).some(ad => ad.endsWith('.tmp')), false);
  } finally { fs.renameSync = rename; }
  islem.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), not.body);
});
test('Bağlantı kaydı yazılamazsa başarı dönmez; tekrar denemede disk kaydı tamamlanır', async t => {
  const { islem, not, notlar, hedef, ayarlar } = await ac(t);
  const rename = fs.renameSync;
  fs.renameSync = (kaynak, hedefYol) => { if (hedefYol === islem.bagDosyasi) throw new Error('Sentetik bağlantı kayıt hatası'); return rename(kaynak, hedefYol); };
  try {
    not.body = 'TXT’ye yazılan metin';
    assert.throws(() => islem.kaydet(notlar));
    assert.equal(fs.readFileSync(hedef, 'utf8'), not.body);
  } finally { fs.renameSync = rename; }
  islem.kaydet(notlar);
  const yeniden = new NotDosyalari(ayarlar); not.body = 'Tekrar denemeden sonra'; yeniden.kaydet(notlar);
  assert.equal(fs.readFileSync(hedef, 'utf8'), not.body);
});
