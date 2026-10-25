'use strict';

// Stil yüklenmeden önce uygulanır; kayıtlı karanlık tema açılışta beyaz parlamaz.
(() => {
  const anahtar = 'notes-tema';
  const uygunMu = tema => tema === 'acik' || tema === 'karanlik';
  let tema = 'acik';
  try {
    const kayitli = localStorage.getItem(anahtar);
    if (uygunMu(kayitli)) tema = kayitli;
  } catch { /* Tercih okunamasa da not defteri açılabilmeli. */ }

  function uygula(secim) {
    document.documentElement.dataset.tema = secim;
    document.querySelector('meta[name="theme-color"]').content = secim === 'karanlik' ? '#090909' : '#ffffff';
    // Pencerenin Windows başlık çubuğu da seçilen temayı izler.
    if (window.notDefterim?.temaSec) void window.notDefterim.temaSec(secim).catch(() => {});
  }
  uygula(tema);

  document.addEventListener('DOMContentLoaded', () => {
    const secici = document.getElementById('tema');
    const uyari = document.getElementById('temaUyarisi');
    secici.value = tema;
    secici.addEventListener('change', () => {
      if (!uygunMu(secici.value)) return;
      uygula(secici.value);
      try {
        localStorage.setItem(anahtar, secici.value);
        uyari.hidden = true;
      } catch {
        uyari.hidden = false;
      }
    });
  }, { once: true });
})();
