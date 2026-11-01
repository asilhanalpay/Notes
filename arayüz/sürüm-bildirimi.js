'use strict';
(() => {
  const api = window.notDefterim;
  if (!api?.surumDurumu) return;
  const oge = kimlik => document.getElementById(kimlik);
  let bilgi;
  let istekSuruyor = false;
  function goster(yeni) {
    bilgi = yeni;
    oge('surumMetni').textContent = yeni.aciklama;
    oge('kuruluSurum').textContent = `Kurulu sürüm: ${yeni.surum}`;
    oge('surumBildirimi').hidden = !['yeni-surum', 'indiriliyor', 'kuruluyor'].includes(yeni.durum);
    oge('surumBildirimMetni').textContent = ['indiriliyor', 'kuruluyor'].includes(yeni.durum)
      ? yeni.aciklama : `Yeni sürüm hazır: ${yeni.yeniSurum ?? ''}`;
    oge('surumIndir').hidden = yeni.durum !== 'yeni-surum';
    oge('surumHizliGuncelle').hidden = yeni.durum !== 'yeni-surum';
    oge('erisimFormu').hidden = yeni.durum !== 'baglanti-gerekli';
    oge('surumAyir').hidden = !yeni.bagli;
    const mesgul = istekSuruyor || ['denetleniyor', 'indiriliyor', 'kuruluyor'].includes(yeni.durum);
    for (const dugme of oge('surumPenceresi').querySelectorAll('button[data-surum]')) dugme.disabled = mesgul;
    oge('surumHizliGuncelle').disabled = mesgul;
    oge('surumAyir').disabled = false;
    oge('surumDenetle').disabled = mesgul || ['baglanti-gerekli', 'kullanilamiyor'].includes(yeni.durum);
  }
  async function istek(islem) {
    if (istekSuruyor) return;
    istekSuruyor = true;
    oge('surumHatasi').hidden = true;
    if (bilgi) goster(bilgi);
    try {
      const sonuc = await islem();
      if (!sonuc.basarili) throw new Error(sonuc.hata);
      if (sonuc.veri?.durum) bilgi = sonuc.veri;
    } catch (hata) {
      oge('surumHatasi').textContent = hata.message || 'İşlem tamamlanamadı.';
      oge('surumHatasi').hidden = false;
    } finally {
      istekSuruyor = false;
      if (bilgi) goster(bilgi);
    }
  }
  function ac() { oge('surumPenceresi').showModal(); }
  oge('surumler').addEventListener('click', ac);
  oge('surumBildirimAc').addEventListener('click', ac);
  oge('surumKapat').addEventListener('click', () => {
    oge('erisimAnahtari').value = '';
    oge('surumPenceresi').close();
  });
  oge('surumPenceresi').addEventListener('close', () => { oge('erisimAnahtari').value = ''; });
  oge('surumDenetle').addEventListener('click', () => istek(() => api.surumDenetle()));
  oge('surumIndir').addEventListener('click', () => istek(() => api.surumIndir()));
  oge('surumHizliGuncelle').addEventListener('click', () => istek(() => api.surumIndir()));
  oge('surumAyir').addEventListener('click', async () => {
    try {
      const sonuc = await api.surumAyir();
      if (!sonuc.basarili) throw new Error(sonuc.hata);
      if (sonuc.veri) goster(sonuc.veri);
    } catch {
      oge('surumHatasi').textContent = 'Bağlantı kaldırılamadı. Yeniden dene.';
      oge('surumHatasi').hidden = false;
    }
  });
  oge('izinSayfasi').addEventListener('click', () => istek(() => api.surumIzinSayfasi()));
  oge('erisimFormu').addEventListener('submit', olay => {
    olay.preventDefault();
    const anahtar = oge('erisimAnahtari').value.trim();
    oge('erisimAnahtari').value = '';
    void istek(() => api.surumBagla(anahtar));
  });
  api.surumDinle(yeni => goster(yeni));
  void istek(() => api.surumDurumu());
})();
