# 0.0.7 — 2 Kasım 2026

- Windows güncelleme yardımcısının hazır olmadan kapanmasına neden olan başlatma biçimi düzeltildi. Asıl yardımcı Windows Start-Process ile gizli açılır; hazır işareti olmadan Notes kapanmaz.
- Güncelleme mevcut kişisel kurulum klasörüne sessizce yapılır. Tek kurulum kaydı, kısayollar, Türkçe karakterli özel konum ve sentetik veri koruması Windows üzerinde doğrulandı.
- Yayın öncesi paket testine, paketin kendi ASAR koduyla gerçek Electron üzerinden hazırlama ve başlatma denetimi eklendi.
- Eski sürümden ilk geçişte Notes.exe dosyasını bir kez elle çalıştırmak gerekebilir. Notların konumu ve veri biçimi değişmedi.

# 0.0.6

- Siyah pencere kenarı, belirgin ayırıcılar, keskin köşeler ve sade tipografi.
- Yinelenen CSS düzenlendi; dosya rolleri ve kaynak biçim kuralları güncellendi.

- Farklı kaydet: seçili notu konumu seçilen UTF-8 .txt dosyasına kaydetme.
- Kaydet ve klasörü aç: kullanıcı veri klasöründe numaralandırılmış .txt kopyası ve otomatik klasör açılışı.
- Son değişikliklerin önce saklanması; iptal, hata ve dosya çakışması yönetimi.

# 0.0.5

- Minimatch uyarısı 11.0.3 ve eski API uyumluluk katmanıyla giderildi; audit sıfır uyarı, 62 birim ve gerçek Windows denetimleri geçti.
- Logo çevresindeki boşluk azaltıldı; görev çubuğu ve kurulum için 16–256 piksel ICO katmanları yenilendi.
- Yeni kararlı sürümler yaklaşık dakikada bir denetlenir. Güncelle düğmesi doğrulanan kurulumu indirir, son notları kaydeder ve mevcut klasöre sessiz kurar.
- Bu kayıt yayın yapıldığı anlamına gelmez. Önceki kurulum bir kez yeni sürümle yükseltilmelidir.

# Sürüm notları

## 0.0.4 — 29 Ekim 2026

- Sol bölüm 305 yerine 230 piksel oldu; not yazma alanı genişledi.
- Not listesinde başlık ve tek satırlık önizleme kaldı. Tarih yalnızca açık notta gösterilir.
- Yedekleme, yedekten ekleme ve not klasörü işlemleri sol alttaki ⋯ menüsünde toplandı. Menü klavyeyle kullanılabilir; Esc ve dışarı tıklamayla kapanır.
- Süs metinleri kaldırıldı. Kayıt durumu ve kelime sayısı korundu.


## 0.0.3 — 25 Ekim 2026

- Yeni sürümü denetle düğmesi bekleme sınırını atlayarak GitHub’dan güncel bilgiyi hemen alır.
- Altı saatlik aralık yalnızca otomatik denetim için korunur; aynı anda birden fazla istek başlatılmaz.
- Yeni sürüm bulunduğunda bildirim ve indirme düğmesi hemen gösterilir. Kurulum yine kullanıcı tarafından yapılır.


## 0.0.2 — 25 Ekim 2026

- Yazı değişiklikleri kısa bir aradan sonra tek kayıtta birleştirilir. Ctrl+S ve kapanışta kayıt hemen tamamlanır.
- Yeşil renkler kaldırıldı; saf açık ve koyu temalar, koyu temada hafif krem kenarlıklar eklendi.
- Siyah-beyaz defter simgesi uygulama ve Windows kurulumu için yenilendi.
- Güncelleme bağlantısı Notes depo adına uyarlandı.
- Gerçek Windows/Electron güvenlik ve kayıt denetimleri eklendi.
- Haftalık bileşen güvenliği taraması ve güncelleme takibi eklendi.
- Notların, kurtarma kopyalarının ve yedeklerin şifrelenmediği açıklandı. Şifreleme ve dijital imza sonraki değerlendirmeye bırakıldı.


## 0.0.1 — 21 Ekim 2026

- Açık ve karanlık tema seçimi eklendi. Seçilen tema sonraki açılışta hatırlanır.
- Sürüm numarası kullanıcının tercihiyle 0.0.1 olarak yeniden başlatıldı. Eski sürümler arşivde korunur.
- 0.2.4 üzerinden elle kurulumda notların korunması Windows üzerinde denetlenir.
- Notes.exe kurulum adıyla eski kaldırıcı arasındaki işlem adı çakışması giderildi. Açık uygulama zorla kapatılmaz.
- Eski sürümden bu sürüme geçmek için Notes.exe bir kez elle kurulmalıdır. 0.0.1 sonrasında daha yüksek sürümler için mevcut uygulama içi bildirimler çalışır; GitHub bağlantısı gerekir.

## 0.2.4 — 21 Ekim 2026

- Uygulama adı, pencere başlığı ve kısayol Notes olarak değiştirildi.
- Kurulum dosyasının adı sürüm numarası eklenmeden Notes.exe olarak sabitlendi.
- Önceki kurulum kimliği ve kullanıcı verisi konumu korunarak ad değişikliğinde veri kaybı önlendi.
- Sürüm denetimi Notes.exe dosyasını ve geçmiş sürümlerin eski kurulum adını okuyabilir hale getirildi.
- Windows üzerine kurulum denetimi Notes dosyasını ve kısayolunu da doğrulayacak şekilde güncellendi.

## 0.2.3 — 21 Ekim 2026

- İsteğe bağlı, yalnızca uygulama içinde görünen yeni sürüm bildirimleri eklendi.
- Özel GitHub erişimi Windows'un şifreli depolamasıyla korundu; uygulamaya ortak anahtar eklenmedi.
- Sürüm bildiriminden kurulum dosyasını tarayıcıda açma eklendi; otomatik kurulum yapılmaz.
- Kurulu sürümü gösteren Türkçe Hakkında menüsü eklendi.
- Önceki sürüm üzerine kurulum ve not dosyasının korunması için Windows denetimi eklendi.

## 0.2.2 — 21 Ekim 2026

- Windows kurulum dosyası GitHub Sürümler bölümünden doğrudan indirilebilir hale getirildi.
- ZIP çıkartmayı gerektiren indirme adımları sadeleştirildi.
- Başarılı Windows derlemesinden sonra sürüm yayımlayan ayrı bir işlem eklendi.

## 0.2.1 — 21 Ekim 2026

- Kurulum dosyasının adı “Windows Masaüstü Uygulaması.exe” olarak kısaltıldı.
- GitHub indirme çıktısının adı kurulum adıyla eşleştirildi.
- Depo açıklaması sadeleştirildi ve mevcut sürümü güncelleme adımları eklendi.

## 0.2.0 — 21 Ekim 2026

- Tarayıcı sayfası yerine Windows'a kurulabilen masaüstü uygulaması hazırlandı.
- Uygulama ve kurulum menüleri Türkçeleştirildi.
- Notlar tarayıcı deposu yerine bilgisayardaki dosyaya taşındı.
- Atomik kayıt, son sağlam kopyadan kurtarma ve kapanışta kayıt denetimi eklendi.
- Elle yedek alma ve mevcut notları koruyarak yedekten ekleme eklendi.
- Kaynak kodu amaçlarına göre klasörlere ayrıldı.
- Veri koruma ve arayüz denetimleri ile Windows kurulum iş akışı eklendi.

## 0.1.0

- Not oluşturma, düzenleme, arama, silme ve geri alma özelliklerine sahip ilk tarayıcı sürümü hazırlandı.
