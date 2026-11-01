'use strict';

// Windows davranış denetimleri geçene kadar normal dağıtım ayarına taşınmaz.
const { build } = require('../package.json');
module.exports = {
  ...build,
  directories: { ...build.directories, output: 'kurulum/güçlendirme-adayı' },
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true
  }
};
