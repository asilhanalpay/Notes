'use strict';

// Yalnız derleme sürecinde: minimatch 11'in kendi callable API'sini eski
// CommonJS tüketicilerine sunar. Eşleştirme/optimizasyon kodu değiştirilmez.
// Namespace API'sini kullanan builder aynı işlev üzerindeki named alanları okur.
module.exports = function minimatchUyumu() {
  const assert = require('node:assert/strict');
  assert.equal(require('minimatch/package.json').version, '11.0.3',
    'Minimatch sürümü değişti; eski çağrıların uyumu yeniden doğrulanmalı.');
  const kimlik = require.resolve('minimatch');
  const api = require(kimlik);
  if (typeof api === 'function') return api;
  assert.equal(typeof api.minimatch, 'function');
  assert.equal(api.minimatch.Minimatch, api.Minimatch);
  assert.equal(api.minimatch.GLOBSTAR, api.GLOBSTAR);
  function kopru(kaynak, varsayilan = {}) {
    const eslestir = kaynak.minimatch || kaynak;
    const uyum = Object.assign((...args) => eslestir(...args), kaynak);
    // Glob 7, .set içindeki segmentlere String.match uygular. Min11 burada
    // RegExp yerine özyinelemesiz Matcher üretir. RegExp'e geri dönmek yerine
    // yalnız eski çağrı biçimi resmi Matcher.test metoduna bağlanır.
    class Minimatch extends kaynak.Minimatch {
      constructor(...args) {
        super(...args);
        for (const satir of this.set) for (const parca of satir) {
          if (parca && typeof parca === 'object' && typeof parca.test === 'function' && !parca[Symbol.match]) {
            Object.defineProperty(parca, Symbol.match, {
              value(metin) { return this.test(metin) ? [metin] : null; }
            });
          }
        }
      }
      static defaults(ayar) { return kopru(kaynak.defaults(ayar), { ...varsayilan, ...ayar }).Minimatch; }
    }
    uyum.Minimatch = Minimatch;
    uyum.minimatch = uyum;
    uyum.defaults = ayar => kopru(kaynak.defaults(ayar), { ...varsayilan, ...ayar });
    // FileList/minimatch5 Windows'ta dosyaları '/' ile, örüntüleri '\\' ile verir.
    // Eski API'nin Windows ayırıcı davranışı; açık escape seçenekleri korunur.
    uyum.match = (dosyalar, desen, ayar = {}) => {
      const secenekler = { ...varsayilan, ...ayar };
      if ((secenekler.platform || process.platform) === 'win32' &&
          secenekler.windowsPathsNoEscape === undefined && secenekler.allowWindowsEscape === undefined) {
        secenekler.windowsPathsNoEscape = true;
      }
      return kaynak.match(dosyalar, desen, secenekler);
    };
    return uyum;
  }
  const uyum = kopru(api);
  require.cache[kimlik].exports = uyum;
  return uyum;
};
// node --require ile gerçek builder CLI'sinden önce yüklenir.
module.exports();
