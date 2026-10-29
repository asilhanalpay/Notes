'use strict';

const oge = kimlik => document.getElementById(kimlik);
const masaustu = window.notDefterim;
let notlar = [];
let seciliKimlik = null;
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
  oge('klasor').disabled = !masaustu || mesgul;
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
  oge('date').textContent = not ? tarih(not.updated) : '';
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
    } catch {
      oge('status').textContent = 'Kaydedilemedi';
      oge('status').dataset.durum = 'hata';
      hataGoster('Son değişiklikler kaydedilemedi. Uygulamayı açık tut ve yeniden dene. Diskte boş alan olduğundan emin ol.');
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
  oge('date').textContent = tarih(not.updated);
  kelimeleriSay();
  degisti();
  kaydiPlanla();
}

function dosyaMenusunuKapat() {
  const menu = oge('dosyaMenusu');
  if (menu.hidePopover && menu.matches(':popover-open')) menu.hidePopover();
}

async function dosyaIslemi(islem) {
  if (!yuklendi || mesgul) return;
  dosyaMenusunuKapat();
  mesgul = true;
  denetimleriAyarla();
  try {
    if (!(await kaydet())) return;
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
oge('yedekle').addEventListener('click', () => dosyaIslemi(async () => {
  const sonuc = await masaustu.yedekle();
  if (!sonuc.basarili) throw new Error(sonuc.hata);
  if (!sonuc.veri.iptal) oge('status').textContent = 'Yedek dosyası kaydedildi';
}));
oge('iceAktar').addEventListener('click', () => dosyaIslemi(async () => {
  const sonuc = await masaustu.iceAktar();
  if (!sonuc.basarili) throw new Error(sonuc.hata);
  if (sonuc.veri.iptal) return;
  const onceki = notlar;
  // İçe aktarılan notlar yeni kimliklerle eklenir; mevcut notlara dokunulmaz.
  const eklenen = sonuc.veri.notlar.map(not => ({ ...not, id: crypto.randomUUID() }));
  notlar = [...eklenen, ...notlar];
  degisti();
  if (!(await kaydet())) { notlar = onceki; degisti(); ekraniCiz(); return; }
  seciliKimlik = eklenen[0]?.id ?? seciliKimlik;
  oge('search').value = '';
  ekraniCiz();
  oge('status').textContent = `${eklenen.length} not yedekten eklendi`;
}));
oge('klasor').addEventListener('click', async () => {
  dosyaMenusunuKapat();
  const sonuc = await masaustu.klasoruAc();
  if (!sonuc.basarili) hataGoster(sonuc.hata);
});

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
    if (await kaydet()) await masaustu.kapat();
    else { mesgul = false; denetimleriAyarla(); }
  });
  try {
    const sonuc = await masaustu.oku();
    if (!sonuc.basarili) throw new Error(sonuc.hata);
    notlar = sonuc.veri.notlar;
    seciliKimlik = notlar[0]?.id ?? null;
    yuklendi = true;
    oge('status').textContent = 'Notların hazır';
    if (sonuc.veri.kurtarildi) {
      hataGoster('Not dosyası okunamadığı için son sağlam yedek açıldı. Notlarını kontrol edip bir yedek al.');
    }
    ekraniCiz();
  } catch (hata) {
    hataGoster(hata.message || 'Notlar açılamadı.');
    oge('status').textContent = 'Notlar açılamadı';
    oge('yenidenDene').hidden = true;
  }
}

void baslat();
