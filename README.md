# Not Defterim

**Windows bilgisayarına kurulan, Türkçe ve çevrimdışı çalışan sade bir not defteri.**

Notlarını yaz, ara ve düzenle. Her değişiklik bilgisayarına otomatik kaydedilir.

## İndir ve kur

1. [En güncel sürümün indirme sayfasını aç](https://github.com/asilhanalpay/-lk-Projem/releases/latest). Özel depo olduğu için GitHub hesabınla giriş yapmalısın.
2. Sayfanın altındaki **Assets** (dosyalar) bölümünde **.exe ile biten Windows Masaüstü Uygulaması kurulum dosyasına** tıkla.
3. İndirilen kurulum dosyasını aç ve Türkçe kurulum adımlarını tamamla.
4. Uygulamayı Başlat menüsünden veya masaüstü kısayolundan aç.

**ZIP dosyası indirmen veya çıkartman gerekmiyor.** GitHub'ın otomatik gösterdiği kaynak kodu arşivleri kurulum için gerekli değildir.

Windows 10 ve 11'in 64 bit sürümleri hedeflenir. Kurulum dosyaları **Sürümler** bölümünde saklanır ve otomatik olarak 30 gün sonra silinmez.
Bu ilk sürüm henüz bir kod imzalama sertifikasıyla imzalanmıyor; Windows yayıncıyı doğrulayamayabilir. Güvenlik ayarlarını kapatma. Kişisel kullanım dışı dağıtımdan önce sertifika ve gerçek Windows bilgisayarında kurulum denemesi gerekir.

## Nasıl güncellenir?

Yeni sürüm çıktığında aynı indirme sayfasından en güncel sürümün kurulum dosyasını indir. Uygulamayı kapatıp yeni kurulum dosyasını çalıştır; önceki sürümü kaldırman gerekmez. Notların ayrı bir klasörde tutulur ve güncellemede korunur. Yine de güncellemeden önce **Yedek al** ile bir kopya saklaman iyi olur.

Bu sürümde uygulama içinden güncelleme denetimi ve otomatik güncelleme henüz yoktur. Yeni bir kurulum dosyasının hazırlanması, bilgisayarındaki uygulamayı kendiliğinden değiştirmez.

## Neler yapabilirsin?

- Yeni not oluştur, başlığını ve içeriğini düzenle.
- Türkçe karakterlerle notlarda ara.
- Bir notu onay vererek sil; 10 saniye içinde **Geri al** düğmesine basabilirsin.
- **Yedek al** ile tüm notlarını seçtiğin yere kaydet.
- **Yedekten ekle** ile mevcut notlarını silmeden yedekteki notları ekle.
- **Not klasörünü aç** ile bilgisayarındaki kayıt konumuna ulaş.

Kısayollar: **Ctrl+N** yeni not, **Ctrl+F** arama, **Ctrl+S** yeniden kaydetme.

## Notların nerede?

Notlar, Windows kullanıcı hesabının uygulama verileri klasöründeki `Not Defterim/notlar.json` dosyasında tutulur. **Not klasörünü aç** düğmesi doğru konumu gösterir. Tarayıcı verilerini temizlemek bu notları etkilemez. Notlar GitHub'a veya bir sunucuya gönderilmez.

Her başarılı kayıtta bir önceki sağlam sürüm `notlar.yedek.json` dosyasında saklanır. Ana dosya bozulursa bu yedek denenir. Bu koruma disk arızasına karşı ayrı bir yedeğin yerini tutmaz; ara sıra **Yedek al** düğmesiyle başka bir konuma kopya kaydet. Dosyalar şifreli değildir; bilgisayar hesabını korumalısın.

Eski tarayıcı sürümündeki notlar kendiliğinden taşınmaz; o sayfayı açıp notlarını yeni uygulamaya kopyalayabilirsin.

## Proje düzeni

| Klasör | İçeriği |
| --- | --- |
| `arayuz/` | Türkçe kullanıcı arayüzü |
| `masaustu/` | Masaüstü penceresi, dosya kaydı ve yedekleme |
| `denetimler/` | Veri koruma ve arayüz denetimleri |
| `belgeler/` | Geliştirme ve sürüm bilgileri |
| `varliklar/` | Uygulama simgesi |
| `.github/workflows/` | Windows kurulumunu hazırlayan otomatik işlem |

Geliştirme komutları için [geliştirme belgesine](belgeler/GELISTIRME.md), yapılan değişiklikler için [sürüm notlarına](belgeler/SURUM_NOTLARI.md) bakabilirsin.
