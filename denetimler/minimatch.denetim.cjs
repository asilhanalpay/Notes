'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const uyum = require('../kurulum-kaynakları/minimatch-uyumu.cjs')();

function yer(t) {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-minimatch-'));
  t.after(() => fs.rmSync(kok, { recursive: true, force: true }));
  return kok;
}
test('Derleme zincirindeki bütün minimatch tüketicileri aynı düzeltilmiş sürümü çözer', () => {
  assert.equal(require('minimatch/package.json').version, '11.0.3');
  const kimlik = require.resolve('minimatch');
  for (const paket of ['app-builder-lib', '@electron/asar', '@electron/universal', 'glob', 'dir-compare', 'filelist']) {
    const oku = createRequire(require.resolve(paket));
    assert.equal(oku.resolve('minimatch'), kimlik, paket);
    assert.equal(oku('minimatch'), uyum, paket);
  }
  const kilit = require('../package-lock.json');
  const girdiler = Object.entries(kilit.packages).filter(([ad]) => ad.endsWith('node_modules/minimatch'));
  assert.equal(girdiler.length, 1);
  assert.equal(girdiler[0][1].version, '11.0.3');
});
test('GHSA-g3hv-75wg-m249: örüntü çoğalması sınırlandırılır; büyük kümelerde ikili tarama yapılmaz', () => {
  for (const [parca, sinir] of [['**/../a/b', 64], ['**/../x/y', 32]]) {
    const m = new uyum.Minimatch(Array(30).fill(parca).join('/'), { optimizationLevel: 2, braceExpandMax: sinir });
    assert.equal(m.set.length, sinir);
  }
  const m = new uyum.Minimatch('a');
  let karsilastirma = 0;
  m.partsMatch = () => { karsilastirma++; throw new Error('Büyük kümede ikili tarama olmamalı.'); };
  const desenler = Array.from({ length: 1001 }, (_, i) => [String(i), '**', 'x']);
  assert.equal(m.secondPhasePreProcess(desenler), desenler);
  assert.equal(karsilastirma, 0);
});
test('Eski callable API ve yeni named API; dot, Unicode, extglob ve defaults davranışı korunur', () => {
  assert.equal(typeof uyum, 'function');
  assert.equal(uyum.minimatch, uyum);
  for (const [dosya, desen, ayar, beklenen] of [
    ['not.txt', '*.txt', {}, true], ['not.bin', '*.txt', {}, false],
    ['.gizli.txt', '*.txt', {}, false], ['.gizli.txt', '*.txt', { dot: true }, true],
    ['İğdır/not.cjs', '**/*.{cjs,png}', {}, true],
    ['x/a.js', '**/!(*.test).js', {}, true], ['x/a.test.js', '**/!(*.test).js', {}, false],
    ['DIR/NOT.TXT', '**/*.txt', { nocase: true }, true]
  ]) assert.equal(uyum(dosya, desen, ayar), beklenen, `${dosya} / ${desen}`);
  assert.equal(uyum.defaults({ dot: true })('.gizli', '*'), true);
  assert.deepEqual(uyum.match(['a.cjs', 'b.bin'], '*.cjs'), ['a.cjs']);
  const Varsayilan = uyum.Minimatch.defaults({ dot: true });
  assert.ok('.gizli.txt'.match(new Varsayilan('*.txt').set[0][0]));
});
test('FileList Windows örüntülerinde ayırıcı uyumu sağlanır; açık escape seçeneği korunur', () => {
  const dosyalar = ['C:/Temp/notlar/not.txt'];
  const desen = path.win32.normalize('C:/Temp/notlar/*.txt');
  assert.deepEqual(uyum.match(dosyalar, desen, { platform: 'win32' }), dosyalar);
  assert.deepEqual(uyum.match(dosyalar, desen, { platform: 'win32', windowsPathsNoEscape: false }), []);
  assert.deepEqual(uyum.defaults({ platform: 'win32', windowsPathsNoEscape: false }).match(dosyalar, desen), []);
});
test('Gerçek glob7 ve filelist tüketicileri gizli/Türkçe dosyaları seçer, dışlanan klasörü almaz', t => {
  const kok = yer(t);
  fs.mkdirSync(path.join(kok, 'skip'));
  for (const ad of ['not.txt', '.gizli.txt', 'İğdır.txt', 'x.bin', 'skip/atla.txt']) fs.writeFileSync(path.join(kok, ad), ad);
  const glob = require('glob');
  assert.deepEqual(glob.sync('**/*.txt', { cwd: kok, dot: true, ignore: 'skip/**' }).sort(), ['.gizli.txt', 'not.txt', 'İğdır.txt'].sort());
  const { FileList } = require('filelist');
  const liste = new FileList();
  liste.include(path.join(kok, '*.txt'));
  assert.deepEqual(liste.toArray().map(ad => path.basename(ad)).sort(), ['not.txt', 'İğdır.txt'].sort());
});
test('Gerçek ASAR3 glob/unpack yolları arşivlenmiş ve dışarıda bırakılan baytları korur', async t => {
  const kok = yer(t), kaynak = path.join(kok, 'kaynak'), arsiv = path.join(kok, 'test.asar');
  fs.mkdirSync(kaynak);
  fs.writeFileSync(path.join(kaynak, '.gizli.txt'), 'Türkçe içerik');
  fs.writeFileSync(path.join(kaynak, 'raw.bin'), Buffer.from([0, 1, 254, 255]));
  const asar = require('@electron/asar');
  await asar.createPackageWithOptions(kaynak, arsiv, { unpack: '*.bin' });
  assert.equal(asar.extractFile(arsiv, '.gizli.txt').toString(), 'Türkçe içerik');
  assert.equal(asar.statFile(arsiv, 'raw.bin').unpacked, true);
  assert.deepEqual(asar.extractFile(arsiv, 'raw.bin'), Buffer.from([0, 1, 254, 255]));
});
test('Gerçek dir-compare filtreleri ve builder dosya sınırı korunur', t => {
  const kok = yer(t), a = path.join(kok, 'a'), b = path.join(kok, 'b');
  fs.mkdirSync(a); fs.mkdirSync(b);
  fs.writeFileSync(path.join(a, 'not.txt'), 'eşit'); fs.writeFileSync(path.join(b, 'not.txt'), 'eşit');
  fs.writeFileSync(path.join(a, 'ignore.txt'), 'farklı');
  fs.writeFileSync(path.join(a, 'x.bin'), 'dışarıda');
  assert.equal(require('dir-compare').compareSync(a, b, { compareContent: true, includeFilter: '*.txt', excludeFilter: 'ignore*' }).same, true);
  const { FileMatcher } = require('app-builder-lib/out/fileMatcher');
  const proje = path.resolve(__dirname, '..');
  const filtre = new FileMatcher(proje, b, s => s, require('../package.json').build.files).createFilter();
  for (const [ad, dahil] of [['masaüstü/ana.cjs', true], ['arayüz/simge.png', true], ['package.json', true],
    ['kurulum-kaynakları/minimatch-uyumu.cjs', false], ['denetimler/minimatch.denetim.cjs', false], ['README.md', false]]) {
    assert.equal(filtre(path.join(proje, ad), fs.statSync(path.join(proje, ad))), dahil, ad);
  }
});
