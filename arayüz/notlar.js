'use strict';

const oge = kimlik => document.getElementById(kimlik);
const masaustu = window.notDefterim;
let notlar = [];
let seciliKimlik = null;
let dosyalar = {};
let silinen = null;
let bildirimSayaci;
let yuklendi = false;
let mesgul = false;
let degisiklik = 0;
let kaydedilenDegisiklik = 0;
let kayitIslemi = null;
let kayitSayaci;
const KAYIT_BEKLEMESI = 650;

function degisti() {
  degisiklik++;
  oge('status').textContent = 'Kaydedilmeyi bekliyor…';
  oge('status').dataset.durum = 'bekliyor';
}

function kaydiPlanla() {
  clearTimeout(kayitSayaci);
  kayitSayaci = setTimeout(() => { void kaydet(); }, KAYIT_BEKLEMESI);
}

const tarih = deger => new Date(deger).toLocaleDateString('tr-TR', {
  day: 'numeric', month: 'long', year: 'numeric'
});

function hataGoster(metin) {
  oge('hataMetni').textContent = metin;
  oge('hata').hidden = false;
}

function denetimleriAyarla() {
  const kilitli = !yuklendi || mesgul;
  for (const dugme of document.querySelectorAll('button[data-islem], .note')) dugme.disabled = kilitli;
  oge('title').disabled = kilitli;
  oge('body').disabled = kilitli;
  oge('search').disabled = kilitli;
  oge('farkliKaydet').disabled = kilitli || !notlar.some(not => not.id === seciliKimlik);
}

function kelimeleriSay() {
  const metin = oge('body').value.trim();
  oge('words').textContent = `${metin ? metin.split(/\s+/u).length : 0} kelime`;
}

function listeyiCiz() {
  const aranan = oge('search').value.toLocaleLowerCase('tr');
  oge('list').replaceChildren();
  oge('noteCount').textContent = notlar.length;
  const bulunan = notlar.filter(not => `${not.title} ${not.body}`.toLocaleLowerCase('tr').includes(aranan));
  for (const not of bulunan) {
    const dugme = document.createElement('button');
    dugme.className = `note${not.id === seciliKimlik ? ' active' : ''}`;
    dugme.disabled = !yuklendi || mesgul;
    dugme.setAttribute('aria-pressed', String(not.id === seciliKimlik));
    const baslik = document.createElement('strong');
    baslik.textContent = not.title.trim() || 'Başlıksız not';
    const onizleme = document.createElement('p');
    onizleme.textContent = not.body.trim() || 'Yazmaya başla…';
    dugme.append(baslik, onizleme);
    dugme.addEventListener('click', () => { seciliKimlik = not.id; ekraniCiz(); });
    oge('list').append(dugme);
  }
  if (!bulunan.length) {
    const aciklama = document.createElement('p');
    aciklama.className = 'no-results';
    aciklama.textContent = aranan ? 'Eşleşen not bulunamadı.' : 'Henüz bir notun yok.';
    oge('list').append(aciklama);
  }
}

function ekraniCiz() {
  listeyiCiz();
  const not = notlar.find(not => not.id === seciliKimlik);
  oge('writing').hidden = !not;
  oge('empty').hidden = !!not;
  oge('delete').hidden = !not;
  oge('title').value = not?.title ?? '';
  oge('body').value = not?.body ?? '';
  oge('date').textContent = not ? `${tarih(not.updated)}${dosyalar[not.id] ? ` · ${dosyalar[not.id]} — değişiklikler bu dosyaya kaydedilir` : ''}` : '';
  kelimeleriSay();
  denetimleriAyarla();
}

function kaydet() {
  clearTimeout(kayitSayaci);
  if (!yuklendi) return Promise.resolve(false);
  if (kayitIslemi) return kayitIslemi;
  if (kaydedilenDegisiklik === degisiklik) return Promise.resolve(true);
  // Yalnızca gerçekten diske yazılırken kopyala. Devam eden kayıt sırasında
  // yapılan değişiklikler tek bir son kopyada birleştirilir; eski metin sona kalmaz.
  kayitIslemi = Promise.resolve().then(async () => {
    try {
      while (kaydedilenDegisiklik !== degisiklik) {
        const sira = degisiklik;
        const anlikNotlar = notlar.map(not => ({ ...not }));
        oge('status').textContent = 'Kaydediliyor…';
        oge('status').dataset.durum = 'bekliyor';
        const sonuc = await masaustu.kaydet(anlikNotlar);
        if (!sonuc.basarili) throw new Error(sonuc.hata);
        kaydedilenDegisiklik = sira;
      }
      oge('status').textContent = 'Bilgisayara kaydedildi';
      oge('status').dataset.durum = 'tamam';
      oge('hata').hidden = true;
      return true;
    } catch (hata) {
      oge('status').textContent = 'Kaydedilemedi';
      oge('status').dataset.durum = 'hata';
      hataGoster(hata.message || 'Son değişiklikler kaydedilemedi. Uygulamayı açık tut ve yeniden dene.');
      return false;
    } finally {
      kayitIslemi = null;
    }
  });
  return kayitIslemi;
}

function notEkle() {
  if (!yuklendi || mesgul) return;
  const not = { id: crypto.randomUUID(), title: '', body: '', updated: Date.now() };
  notlar.unshift(not);
  seciliKimlik = not.id;
  oge('search').value = '';
  ekraniCiz();
  degisti();
  void kaydet();
  oge('title').focus();
}

function duzenle() {
  const not = notlar.find(not => not.id === seciliKimlik);
  if (!not || !yuklendi || mesgul) return;
  not.title = oge('title').value;
  not.body = oge('body').value;
  not.updated = Date.now();
  listeyiCiz();
  oge('date').textContent = `${tarih(not.updated)}${dosyalar[not.id] ? ` · ${dosyalar[not.id]} — değişiklikler bu dosyaya kaydedilir` : ''}`;
  kelimeleriSay();
  degisti();
  kaydiPlanla();
}

function dosyaMenusunuKapat() {
  const menu = oge('dosyaMenusu');
  if (menu.hidePopover && menu.matches(':popover-open')) menu.hidePopover();
}
async function dosyaIslemi(islem, kurtarmaKopyasi = false) {
  if (!yuklendi || mesgul) return;
  dosyaMenusunuKapat();
  mesgul = true;
  denetimleriAyarla();
  try {
    if (!(await kaydet()) && !kurtarmaKopyasi) return;
    await islem();
  } catch (hata) {
    hataGoster(hata.message || 'Dosya işlemi tamamlanamadı.');
  } finally {
    mesgul = false;
    denetimleriAyarla();
  }
}

oge('add').addEventListener('click', notEkle);
oge('first').addEventListener('click', notEkle);
oge('title').addEventListener('input', duzenle);
oge('body').addEventListener('input', duzenle);
oge('search').addEventListener('input', listeyiCiz);
oge('yenidenDene').addEventListener('click', () => { void kaydet(); });
oge('delete').addEventListener('click', () => oge('confirm').showModal());
oge('cancel').addEventListener('click', () => oge('confirm').close());
oge('confirmDelete').addEventListener('click', () => {
  const konum = notlar.findIndex(not => not.id === seciliKimlik);
  if (konum < 0) return;
  silinen = { not: notlar[konum], konum };
  notlar.splice(konum, 1);
  seciliKimlik = notlar[Math.min(konum, notlar.length - 1)]?.id ?? null;
  oge('confirm').close();
  ekraniCiz();
  degisti();
  void kaydet();
  oge('toast').hidden = false;
  clearTimeout(bildirimSayaci);
  bildirimSayaci = setTimeout(() => { oge('toast').hidden = true; silinen = null; }, 10000);
});
oge('undo').addEventListener('click', () => {
  if (!silinen || mesgul) return;
  notlar.splice(silinen.konum, 0, silinen.not);
  seciliKimlik = silinen.not.id;
  silinen = null;
  clearTimeout(bildirimSayaci);
  oge('toast').hidden = true;
  oge('search').value = '';
  ekraniCiz();
  degisti();
  void kaydet();
});
oge('farkliKaydet').addEventListener('click', () => dosyaIslemi(async () => {
  const not = notlar.find(n => n.id === seciliKimlik);
  const sonuc = await masaustu.farkliKaydet(seciliKimlik, { ...not });
  if (!sonuc.basarili) throw new Error(sonuc.hata);
  if (sonuc.veri.iptal) return;
  dosyalar[seciliKimlik] = sonuc.veri.ad;
  ekraniCiz();
  // Yeni hedefe bağlandıktan sonra başarısız kaydın yeniden denenmesi kapanışa izin verir.
  if (!(await kaydet())) return;
  oge('status').textContent = `${sonuc.veri.ad} kaydedildi`;
}, true));
oge('dosyaAc').addEventListener('click', () => dosyaIslemi(async () => {
  const sonuc = await masaustu.dosyaAc();
  if (!sonuc.basarili) throw new Error(sonuc.hata);
  if (sonuc.veri.iptal) return;
  const not = sonuc.veri.not;
  if (!notlar.some(n => n.id === not.id)) { notlar.unshift(not); degisti(); }
  dosyalar[not.id] = sonuc.veri.ad;
  seciliKimlik = not.id;
  oge('search').value = '';
  ekraniCiz();
  if (!(await kaydet())) return;
  oge('status').textContent = `${sonuc.veri.ad} açıldı; değişiklikler aynı dosyaya kaydedilecek`;
  if (sonuc.veri.uyari) hataGoster(sonuc.veri.uyari);
}));

document.addEventListener('keydown', olay => {
  if (!(olay.ctrlKey || olay.metaKey) || oge('confirm').open) return;
  if (olay.key.toLowerCase() === 'n') { olay.preventDefault(); notEkle(); }
  if (olay.key.toLowerCase() === 'f') { olay.preventDefault(); oge('search').focus(); }
  if (olay.key.toLowerCase() === 's') { olay.preventDefault(); void kaydet(); }
});

async function baslat() {
  denetimleriAyarla();
  if (!masaustu) {
    oge('status').textContent = 'Masaüstü uygulaması gerekli';
    hataGoster('Notes bir Windows uygulamasıdır. Kurulum dosyasını kullanarak aç.');
    oge('yenidenDene').hidden = true;
    return;
  }
  masaustu.kapatmaIsteginiDinle(async () => {
    if (mesgul) return;
    if (!yuklendi) { await masaustu.kapat(); return; }
    mesgul = true;
    denetimleriAyarla();
    if (await kaydet()) {
      const sonuc = await masaustu.kapat();
      if (sonuc?.basarili !== false) return;
      hataGoster(sonuc.hata || 'Uygulama kapatılamadı. Yeniden dene.');
    }
    mesgul = false; denetimleriAyarla();
  });
  try {
    const sonuc = await masaustu.oku();
    if (!sonuc.basarili) throw new Error(sonuc.hata);
    notlar = sonuc.veri.notlar;
    dosyalar = sonuc.veri.dosyalar ?? {};
    seciliKimlik = notlar[0]?.id ?? null;
    yuklendi = true;
    oge('status').textContent = 'Notların hazır';
    if (sonuc.veri.kurtarildi) {
      hataGoster('Not dosyası okunamadığı için son sağlam yedek açıldı. Notlarını kontrol edip bir yedek al.');
    }
    if (sonuc.veri.bekleyenKayit) {
      degisti();
      hataGoster('Notes içinde korunmuş bazı değişiklikler TXT dosyasına henüz yazılamamış. Yeniden dene veya Farklı kaydet ile yeni bir hedef seç.');
    }
    ekraniCiz();
  } catch (hata) {
    hataGoster(hata.message || 'Notlar açılamadı.');
    oge('status').textContent = 'Notlar açılamadı';
    oge('yenidenDene').hidden = true;
  }
}

void baslat();
