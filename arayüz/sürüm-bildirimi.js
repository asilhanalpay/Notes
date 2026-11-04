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
    oge('surumIptal').hidden = yeni.durum !== 'indiriliyor';
    const mesgul = istekSuruyor || ['denetleniyor', 'indiriliyor', 'kuruluyor'].includes(yeni.durum);
    for (const dugme of oge('surumPenceresi').querySelectorAll('button[data-surum]')) dugme.disabled = mesgul;
    oge('surumHizliGuncelle').disabled = mesgul;
    oge('surumIptal').disabled = false;
    oge('surumDenetle').disabled = mesgul || yeni.durum === 'kullanilamiyor';
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
    oge('surumPenceresi').close();
  });
  oge('surumDenetle').addEventListener('click', () => istek(() => api.surumDenetle()));
  oge('surumIndir').addEventListener('click', () => istek(() => api.surumIndir()));
  oge('surumHizliGuncelle').addEventListener('click', () => istek(() => api.surumIndir()));
  oge('surumIptal').addEventListener('click', async () => {
    try {
      const sonuc = await api.surumIptal();
      if (!sonuc.basarili) throw new Error(sonuc.hata);
      if (sonuc.veri) goster(sonuc.veri);
    } catch {
      oge('surumHatasi').textContent = 'İndirme iptal edilemedi. Yeniden dene.';
      oge('surumHatasi').hidden = false;
    }
  });
  api.surumDinle(yeni => goster(yeni));
  void istek(() => api.surumDurumu());
})();
