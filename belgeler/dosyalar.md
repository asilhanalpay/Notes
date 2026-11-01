# Dosyalar ne işe yarar?

Bu depo, Notes’un kaynak kodlarını ve açıklamalarını içerir. Dosyalar, aranan bölüm kolay bulunsun diye klasörlere ayrılmıştır.

| Klasör | İçindekiler ve görevi |
| --- | --- |
| `arayüz/` | Uygulamanın görünen yüzü: pencere, düğmeler, not düzenleme ve temalar. |
| `masaüstü/` | Pencereyi açar; notları kaydeder, yedekler ve yeni sürümleri denetler. |
| `kurulum-kaynakları/` | Windows kurulumunda kullanılan simge ve yardımcı dosyalar. |
| `denetimler/` | Notların kaybolmadığını, düğmelerin çalıştığını ve kurulumun doğru yapıldığını sınayan dosyalar. |
| `belgeler/` | Kullanım açıklamaları, geliştirme bilgileri ve sürüm notları. |
| `.github/dependabot.yml` | Yardımcı yazılımlar ve iş akışları için güncelleme takibi. |
| `.github/workflows/` | GitHub’ın denetimleri çalıştırmasını ve Windows kurulumunu hazırlamasını sağlayan yönergeler. |

## Önemli dosyalar

| Dosya | Görevi |
| --- | --- |
| `README.md` | Depoyu açınca gördüğün **Beni Oku** sayfası. |
| `arayüz/pencere.html` | Pencerenin içindeki bölümler ve yazılar. |
| `arayüz/görünüm.css` | Renkler, yazı biçimleri ve yerleşim. |
| `arayüz/notlar.js` | Not yazma, arama, silme ve yedekleme düğmelerinin davranışı. |
| `arayüz/tema.js` | Tema seçimi ve bu seçimin hatırlanması. |
| `arayüz/sürüm-bildirimi.js` | Yeni sürüm bildirimlerinin ekranda gösterilmesi. |
| `masaüstü/ana.cjs` | Uygulamanın başlaması ve pencerenin yönetilmesi. |
| `masaüstü/depolama.cjs` | Notların dosyaya kaydedilmesi ve korunması. |
| `masaüstü/köprü.cjs` | Görünen düğmeler ile masaüstü işlemleri arasındaki sınırlı bağlantı. |
| `masaüstü/sürüm-bildirimi.cjs` | GitHub’dan sürüm bilgisinin alınması ve erişim anahtarının korunması. |
| `masaüstü/güncelleme.cjs` | Doğrulanan kurulumun özel depodan indirilmesi ve güncelleme yardımcısının hazırlanması. |
| `masaüstü/güncelleme-yardımcısı.ps1` | Normal kapanışı bekleyip mevcut klasöre sessiz kurulum ve yeniden açma. |
| `package.json` | Kullanılan araçlar, sürüm numarası ve kurulum ayarları. |
| `package-lock.json` | Kullanılan yardımcı yazılımların tam sürümleri. |
| `.gitignore` | Depoya eklenmeyecek geçici ve üretilmiş dosyaların listesi. |

`README.md`, `package.json`, `package-lock.json`, `.gitignore` ve `.github/workflows` araçların tanıdığı adlardır; Türkçeye çevrilmeleri bu araçların işleyişini bozabilir. Dosya uzantıları da dosyanın türünü belirtir. Açıklamalar ve değiştirebildiğimiz dosya adları Türkçedir. **Notes** uygulamanın adıdır.

## Uygulamayı kullanmak için bunları indirmeli miyim?

Hayır. Yalnızca **Notes.exe** kurulum dosyasını indirmen yeterli. Kurulum, çalışmak için gereken parçaları bilgisayarına yerleştirir. Açıklama ve denetim dosyaları günlük kullanım için gerekmez.

Kodlar incelenecekse deponun tamamı birlikte verilmelidir. Kişisel notlarını veya erişim anahtarını paylaşman gerekmez; bunlar depoda değil, bilgisayarında saklanır.
