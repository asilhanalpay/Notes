'use strict';

// Ayrı çıktı konumunda deneme paketi; doğrulanan fuse ayarları ana yapılandırmadadır.
const { build } = require('../package.json');
module.exports = {
  ...build,
  directories: { ...build.directories, output: 'kurulum/güçlendirme-adayı' }
};
