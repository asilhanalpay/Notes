# Not Defterim

Türkçe arayüze sahip, basit bir not defteri uygulaması. HTML, CSS ve JavaScript ile yazılmıştır; kurulum veya derleme gerektirmez.

## Çalıştırma

Bu depoyu bilgisayarına indir ve `index.html` dosyasını güncel bir tarayıcıda aç. Alternatif olarak depo klasöründe `python3 -m http.server 8000` komutunu çalıştırıp http://localhost:8000 adresine git.

## Özellikler

- Not oluşturma ve düzenleme
- Otomatik kaydetme
- Türkçe not arama
- Silme onayı ve 10 saniye boyunca geri alma
- Kelime sayacı ve mobil uyumlu arayüz

## Verilerin saklanması

Notlar yalnızca kullandığın tarayıcının `localStorage` alanında saklanır. GitHub'a gönderilmez ve cihazlar arasında eşitlenmez. Tarayıcı verilerini temizlemek notlarını da siler.

## Kontrol

JavaScript sözdizimini kontrol etmek için `node --check app.js` komutunu kullanabilirsin.
