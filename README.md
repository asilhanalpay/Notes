# Notes

**Windows bilgisayarına kurulan, Türkçe ve çevrimdışı çalışan sade bir not defteri.**

Notlarını yaz, ara ve düzenle. Her değişiklik bilgisayarına otomatik kaydedilir.

## İndir ve kur

1. [En güncel sürümün indirme sayfasını aç](https://github.com/asilhanalpay/-lk-Projem/releases/latest). Özel depo olduğu için GitHub hesabınla giriş yapmalısın.
2. Sayfanın altındaki **Assets** (dosyalar) bölümünde **Notes.exe** dosyasına tıkla.
3. İndirilen kurulum dosyasını aç ve Türkçe kurulum adımlarını tamamla.
4. Uygulamayı Başlat menüsünden veya masaüstü kısayolundan aç.

**Kurulum dosyasının adı her sürümde `Notes.exe` olarak kalır.** [Notes.exe dosyasını doğrudan indir](https://github.com/asilhanalpay/-lk-Projem/releases/latest/download/Notes.exe).

**ZIP dosyası indirmen veya çıkartman gerekmiyor.** GitHub'ın otomatik gösterdiği kaynak kodu arşivleri kurulum için gerekli değildir.

Windows 10 ve 11'in 64 bit sürümleri hedeflenir. Kurulum dosyaları **Sürümler** bölümünde saklanır ve otomatik olarak 30 gün sonra silinmez.
Bu ilk sürüm henüz bir kod imzalama sertifikasıyla imzalanmıyor; Windows yayıncıyı doğrulayamayabilir. Güvenlik ayarlarını kapatma. Kişisel kullanım dışı dağıtımdan önce sertifika ve gerçek Windows bilgisayarında kurulum denemesi gerekir.

## Nasıl güncellenir?

Yeni sürüm çıktığında aynı indirme sayfasından en güncel sürümün kurulum dosyasını indir. Uygulamayı kapatıp yeni kurulum dosyasını çalıştır; önceki sürümü kaldırman gerekmez. Notların ayrı bir klasörde tutulur ve güncellemede korunur. Yine de güncellemeden önce **Yedek al** ile bir kopya saklaman iyi olur.

### Uygulama içinden yeni sürüm bildirimi

Uygulamadaki **Yeni sürümler** düğmesinden bu bilgisayarı özel GitHub deposuna bağlayabilirsin. Dosyalar özel olduğu için bu bağlantı gereklidir:

1. **GitHub’da erişim izni oluştur** düğmesine bas.
2. Açılan GitHub sayfasında yalnızca **-lk-Projem** deposunu seç. İzinlerden **Contents → Read-only** seçili olsun; başka izin açma.
3. Oluşturduğun erişim anahtarını yalnızca uygulamanın **GitHub erişim anahtarı** alanına yapıştırıp **Bildirimleri etkinleştir** düğmesine bas. Anahtarı sohbete, kaynak koduna veya bir dosya paylaşımına ekleme.

Bu izin bilgisayarda Windows tarafından şifrelenerek saklanır. Anahtarın süresi dolarsa bağlantıyı aynı yerden yenileyebilirsin. **Bağlantıyı kaldır** seçeneği bu bilgisayardaki kaydı siler ve denetimleri durdurur; anahtarı tamamen iptal etmek istersen GitHub ayarlarından da kaldırabilirsin.

Bağlantı kurulduktan sonra uygulama açılışta, uyku dönüşünde ve açık kaldığı sürece altı saatte bir yeni sürüm denetler. **Yeni sürüm hazır** bildirimi yalnızca uygulamanın içinde görünür. **Kurulum dosyasını indir** düğmesi tarayıcıda özel `.exe` indirmesini açar. Sonrasında uygulamayı kapatıp kurulumu kendin çalıştırırsın. Dosya indirmek veya bildirim görmek tek başına güncelleme yapmaz.

Uygulama e-posta göndermez, otomatik dosya indirmez ve kurulum başlatmaz. Uygulama kapalıyken arka planda çalışmaz. GitHub’da daha önce ayrıca açtığın e-posta bildirimleri varsa bunları deponun **Watch** ayarlarından kapatabilirsin; uygulama bu hesap ayarını değiştirmez.

Kurulu sürümü **Yardım → Notes Hakkında** menüsünden görebilirsin.

## Neler yapabilirsin?

- Yeni not oluştur, başlığını ve içeriğini düzenle.
- Türkçe karakterlerle notlarda ara.
- Bir notu onay vererek sil; 10 saniye içinde **Geri al** düğmesine basabilirsin.
- **Yedek al** ile tüm notlarını seçtiğin yere kaydet.
- **Yedekten ekle** ile mevcut notlarını silmeden yedekteki notları ekle.
- **Not klasörünü aç** ile bilgisayarındaki kayıt konumuna ulaş.

Kısayollar: **Ctrl+N** yeni not, **Ctrl+F** arama, **Ctrl+S** yeniden kaydetme.

## Notların nerede?

Önceki sürümlerden kalan notları korumak için kayıt klasörünün eski adı değişmez. Notlar, Windows kullanıcı hesabının uygulama verileri klasöründeki `Not Defterim/notlar.json` dosyasında tutulur. **Not klasörünü aç** düğmesi doğru konumu gösterir. Tarayıcı verilerini temizlemek bu notları etkilemez. Notlar GitHub'a veya bir sunucuya gönderilmez. İsteğe bağlı sürüm bağlantısı yalnızca depo ve sürüm bilgilerini okur; notlarına dokunmaz.

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
