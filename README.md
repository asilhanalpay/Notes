# Beni Oku

Notes, Türkçe bir Windows not defteridir. İnternet olmadan çalışır; notlarını bilgisayarında saklar.

## İndir ve kur

1. [İndirme sayfasını aç](https://github.com/asilhanalpay/Notes/releases/latest) ve **Notes.exe** dosyasını indir.
2. Dosyayı açıp kurulumu tamamla.

Windows 10/11 (64 bit). Yayıncı imzası olmadığı için Windows uyarı gösterebilir.

## Kullan

- **+** ile not oluştur, arama kutusuyla bul. Yazmaya kısa süre ara verdiğinde kaydedilir. **Ctrl+S** ile beklemeden kaydedebilirsin.
- **Tema** bölümünden açık veya karanlık görünümü seç. Siyah pencere kenarı ve belirgin çizgiler iki görünümde de korunur; karanlık temanın iç ayırıcıları görünür gri tonundadır.
- Sol alttaki **⋯** menüsünde **Farklı kaydet…**, açık notu başlık ve içeriğiyle .txt dosyası olarak seçtiğin konuma kaydeder.
- **Kaydet ve klasörü aç**, açık notun .txt kopyasını uygulamanın **Kaydedilen notlar** klasörüne yazar ve klasörü otomatik açar. Aynı adlı eski dosyalar ezilmez; yeni dosyaya numara eklenir. Bu klasör kullanıcı verileri içindedir; uygulamanın kurulum klasörü değildir.
- Aynı menüde **Yedek al**, **Yedekten ekle** ve **Not klasörünü aç** da bulunur. JSON yedekleri bütün notlar içindir; .txt dosyaları tek notun okunabilir kopyasıdır.
- Yanlışlıkla sildiğin notu 10 saniye içinde **Geri al** ile kurtar.

## Gizlilik

Notların, kurtarma kopyaları ve aldığın yedekler **şifrelenmez**. Bu dosyalara erişen biri yazdıklarını okuyabilir. GitHub erişim anahtarın ise Windows tarafından şifrelenerek saklanır.

Bir notu silmek, bütün kopyalarını silmez. Önceki içerik otomatik kurtarma kopyasında ve daha önce aldığın dış yedeklerde kalabilir. 10 saniyelik geri alma süresinin bitmesi bu kopyaların yok edildiği anlamına gelmez. Dosya silmek; SSD, Windows gölge kopyaları veya dış yedeklerde garantili güvenli imha sağlamaz.

## Güncelle

**0.0.1’den geçiş:** Depo adı değiştiği için yeni sürümü bir kez indirme sayfasından elle indirip kur.

Bildirim almak için **Yeni sürümler** bölümündeki bağlantı adımlarını izle. Uygulama açıkken yayımlanmış sürümler yaklaşık dakikada bir denetlenir; **Yeni sürümü denetle** düğmesi beklemeden kontrol eder. Bildirimdeki **Güncelle**, kurulumu arka planda indirip doğrular, notlarını kaydeder, Notes’u kapatır ve mevcut kurulum klasörüne sessizce kurar. Ardından Notes yeniden açılır; klasör seçmen veya eski sürümü kaldırman gerekmez. İndirme/doğrulama ya da kayıt başarısızsa kurulum başlamaz.

Bu akış 0.0.5 ile gelir; önceki uygulama bir kez yeni kurulumla yükseltilmelidir. Depoya kod göndermek tek başına bildirim oluşturmaz: daha yüksek numaralı kararlı sürümün **Notes.exe** dosyasıyla yayımlanması gerekir. İnternet, geçerli özel depo bağlantısı ve yayının SHA-256 özeti gereklidir. Güçlü yayıncı imzası henüz yoktur; güncellemeler GitHub’daki doğrulanan özel yayına güvenir. Bulut eşitleme veya e-posta bildirimi yapılmaz.

GitHub anahtarını oluştururken yalnızca Notes deposunu ve **Contents → Read-only** iznini seç. Uygulama anahtarın diğer yetkilerini denetlemez. **Bağlantıyı kaldır**, yalnızca bu bilgisayardaki kaydı siler; anahtarı GitHub üzerinde iptal etmez.

[Dosyalar ne işe yarar?](belgeler/dosyalar.md) · [Sürüm notları](belgeler/sürüm-notları.md) · [Geliştirme bilgileri](belgeler/geliştirme.md)
