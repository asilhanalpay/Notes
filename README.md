# Not Defterim

**Windows bilgisayarına kurulan, Türkçe ve çevrimdışı çalışan sade bir not defteri.**

Notlarını yaz, ara ve düzenle. Her değişiklik bilgisayarına otomatik kaydedilir. Hesap açman veya kodlama bilmen gerekmez.

## İndir ve kur

1. [Windows kurulumu sayfasını aç](https://github.com/asilhanalpay/-lk-Projem/actions/workflows/windows-kurulum.yml).
2. En üstteki başarılı çalıştırmayı aç. Yeşil onay işareti, dosyanın hazır olduğunu gösterir.
3. Sayfanın altındaki **Artifacts** (çıktılar) bölümünden **Not-Defterim-Windows-Kurulumu** dosyasını indir. Özel depo olduğu için GitHub hesabınla giriş yapmalısın.
4. İndirilen ZIP dosyasını çıkart ve içindeki **Not-Defterim-…-Windows-x64-Kurulum.exe** dosyasını aç.
5. Türkçe kurulum adımlarını tamamla. Uygulamayı Başlat menüsünden veya masaüstü kısayolundan aç.

Windows 10 ve 11'in 64 bit sürümleri hedeflenir. Kurulum çıktısı yalnızca başarılı derlemeden sonra görünür ve 30 gün saklanır. Henüz başarılı bir çalıştırma yoksa indirilebilir kurulum dosyası hazır değildir.

Bu ilk sürüm henüz bir kod imzalama sertifikasıyla imzalanmıyor; Windows yayıncıyı doğrulayamayabilir. Güvenlik ayarlarını kapatma. Kişisel kullanım dışı dağıtımdan önce sertifika ve gerçek Windows bilgisayarında kurulum denemesi gerekir.

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
