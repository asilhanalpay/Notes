# Beni Oku

Notes, Türkçe bir Windows not defteridir. İnternet olmadan çalışır; notlarını bilgisayarında saklar.

## İndir ve kur

1. [İndirme sayfasını aç](https://github.com/asilhanalpay/Notes/releases/latest) ve **Notes.exe** dosyasını indir.
2. Dosyayı açıp kurulumu tamamla.

Windows 10/11 (64 bit). Yayıncı imzası olmadığı için Windows uyarı gösterebilir.

## Kullan

- **+** ile not oluştur, arama kutusuyla bul. Yazmaya kısa süre ara verdiğinde kaydedilir. **Ctrl+S** ile beklemeden kaydedebilirsin.
- **Tema** bölümünden açık veya karanlık görünümü seç. Siyah pencere kenarı ve belirgin çizgiler iki görünümde de korunur; karanlık temanın iç ayırıcıları görünür gri tonundadır.
- Sol alttaki **Dosyalar (☰)** menüsünde yalnız **Farklı kaydet…** ve **Dosya aç…** bulunur.
- **Farklı kaydet…**, seçtiğin notun içeriğini varsayılan olarak UTF-8 `.txt` dosyasına kaydeder. Başlık dosya adı olarak önerilir. Bundan sonraki düzenlemeler seçtiğin dosyaya yazılır.
- **Dosya aç…**, seçtiğin TXT'nin tüm içeriğini düzenleyicide açar. Değişiklikler aynı dosyaya otomatik kaydedilir; dosya bağlantısı yeniden açılışta da korunur. Başlığı değiştirmek dış dosyanın adını değiştirmez.
- Notes'un otomatik JSON kaydı ve kurtarma kopyası korunur. TXT dışarıda değiştirilmiş, silinmiş veya yazılamıyorsa hata gösterilir ve düzenleme Notes içinde saklanır. **Farklı kaydet…** ile başka bir ad seçerek kurtarabilirsin. Notu Notes'tan silmek dış TXT'yi silmez.
- Yanlışlıkla sildiğin notu 10 saniye içinde **Geri al** ile kurtar.

## Gizlilik

Notların, kurtarma kopyaları ve aldığın yedekler **şifrelenmez**. Bu dosyalara erişen biri yazdıklarını okuyabilir. Güncelleme için GitHub erişim anahtarı veya hesap bağlantısı gerekmez.

Bir notu silmek, bütün kopyalarını silmez. Önceki içerik otomatik kurtarma kopyasında ve daha önce aldığın dış yedeklerde kalabilir. 10 saniyelik geri alma süresinin bitmesi bu kopyaların yok edildiği anlamına gelmez. Dosya silmek; SSD, Windows gölge kopyaları veya dış yedeklerde garantili güvenli imha sağlamaz.

## Güncelle

0.0.8 ile sürüm denetimi ve indirme herkese açık Notes deposundan, **erişim anahtarı olmadan** yapılır. Eski sürümler özel depo bağlantısı istediğinden bu sürüme ilk geçişte indirme sayfasından bir kez elle kurulum gerekebilir.

Yeni sürümler uygulama açıldıktan kısa süre sonra ve uygulama açıkken yaklaşık **3 dakikada bir** denetlenir. **Yeni sürümler** açılınca da denetim başlar; pencereye geri dönmek son kontrol yeterince eskiyse yeni bir denetim ister. Yayımlandığı saniyede bildirim garanti edilmez. **Yeni sürümü denetle** beklemeden kontrol eder; GitHub istek sınırı bildirdiyse bekleme süresine uyulur.

Bildirimdeki **Güncelle**, kurulumu indirip boyutunu ve SHA-256 özetini doğrular, notlarını kaydeder, Notes’u kapatır ve **mevcut kişisel kurulum klasörüne sessizce kurar**. Ardından Notes yeniden açılır; klasör seçmen veya eski sürümü kaldırman gerekmez. İndirme/doğrulama ya da kayıt başarısızsa kurulum başlamaz. İndirme iptal edilebilir; yazarken uygulama kendiliğinden kapatılıp güncellenmez.

Depoya kod göndermek tek başına bildirim oluşturmaz: daha yüksek numaralı kararlı sürümün **Notes.exe** dosyasıyla yayımlanması gerekir. Güçlü yayıncı imzası henüz yoktur; güncellemeler GitHub yayınının özetiyle doğrulanır. Bulut eşitleme yapılmaz. Tüm kullanıcılar için kurulum bu akışın kapsamı değildir.

Eski yerel erişim anahtarı kaydı kullanılmaz, yeniden şifrelenmez ve kendiliğinden silinmez. Anahtarı GitHub hesabından iptal edebilirsin. Not dosyalarının biçimi ve konumu değişmez.

## İletişim

Soru, öneri ve geri bildirim için: [asilhan.alpay@agentmail.to](mailto:asilhan.alpay@agentmail.to).

[Dosyalar ne işe yarar?](belgeler/dosyalar.md) · [Sürüm notları](belgeler/sürüm-notları.md) · [Geliştirme bilgileri](belgeler/geliştirme.md)
