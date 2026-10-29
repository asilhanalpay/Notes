# Geliştirme

Bu bölüm geliştiriciler içindir. Uygulamayı kullanmak için Node.js veya bir geliştirme aracı kurman gerekmez.

## Gerekenler ve komutlar

Node.js 24 ve Windows 10/11’in 64 bit sürümünü kullan. Depo klasöründe:

```sh
npm ci
npm run denetle
npm run denetle:electron
npm run baslat
npm run paketle:windows
```

Kurulum dosyası `kurulum/` klasörüne yazılır. Yardımcı yazılımların sürümleri `package-lock.json` ile sabitlenir. Birim denetimleri Node.js ve jsdom üzerinde çalışır. `denetle:electron`, Windows üzerinde gerçek Electron penceresini ve ürünün ana işlem/köprü kodunu çalıştırır. Geçici bir kullanıcı profili kullanır; kişisel not klasörüne dokunmaz.

## Tasarım kararları

Electron, sistemde ayrı bir tarayıcı veya Node.js kurulumuna gerek bırakmadan uygulamayı paketler. Masaüstü köprüsü yalnızca tanımlanmış not işlemlerini sunar. Arayüzün Node.js ve dosya sistemi erişimi yoktur. Bağlam yalıtımı ve işlem korumalı alanı açıktır; arayüzün ağ istekleri, yeni pencereler ve sayfa gezintileri engellenir. İsteğe bağlı sürüm bildirimi ana işlemde yalnızca sabit GitHub depo ve son sürüm uçlarını HTTPS üzerinden okur. Not metinleri HTML olarak yorumlanmaz.

Yazı değişiklikleri 650 ms sessizlikten sonra kaydedilir. Her tuşta bütün notlar kopyalanmaz; diske yazılacak son durum kayıt başladığında bir kez kopyalanır. Devam eden kayıt sırasındaki değişiklikler bir sonraki son kopyada birleştirilir. Ctrl+S, kapanış ve yedekleme bekleyen kaydı hemen tamamlar. Yeni not, silme ve geri alma işlemleri hemen kaydedilir. Kayıtlar sırayla işlenir. Geçici dosya diske yazılıp eşitlendikten sonra ana dosyanın yerine geçirilir. Önceki sağlam içerik yedeklenir. Geçersiz dosyalar sessizce boş bir kayıtla değiştirilmez. Kapanış son kaydın onayını bekler; kayıt hatasında pencere açık kalır. İşletim sisteminin zorla kapatması veya güç kesintisi anındaki henüz tamamlanmamış değişikliklerin korunması garanti edilemez.

İçe aktarma mevcut notların üzerine yazmaz; yedekteki notlara yeni kimlikler verir. Bir notun başlığı en fazla 500, içeriği 1.000.000 karakterdir; toplam veri 16 MB ve 10.000 not ile sınırlıdır.

## Dağıtım

`main` dalına gönderim, değişiklik isteği veya elle başlatma, Windows sunucusunda denetim ve kurulum üretimini çalıştırır. Kurulum dosyası özel depoda çıktı olarak saklanır; herkese açık dağıtım yapılmaz. Derleme işlemi yalnızca depo okuma iznine sahiptir. Ana daldaki başarılı derlemenin ardından ayrı bir yayın işi, denetlenmiş `.exe` dosyasını GitHub Sürümler bölümüne ekler. Yalnızca bu iş depo içeriğine yazma izni alır ve GitHub'ın işleme özel erişim anahtarını kullanır; uygulamaya herhangi bir erişim anahtarı eklenmez.

Yeni sürüm yayımlamak için `package.json` ve `package-lock.json` içindeki sürüm numaralarını birlikte artır. Yayın adımı bu numaradan bir sürüm etiketi oluşturur ve kaynak kaydını bu etikete bağlar. Var olan sürüm dosyalarının üzerine yazılmaz. Değişiklik isteklerinden sürüm yayımlanmaz. `belgeler/sürüm-açıklaması.md` dosyasını sürüme uygun tut. Kullanıcılar `.exe` dosyasını doğrudan indirir; GitHub Actions çıktılarındaki ZIP arşivi indirmeleri gerekmez.

Kurulum Türkçedir, yönetici yetkisi gerektirmeyen kullanıcı kurulumunu kullanır ve kaldırma sırasında not verilerini silmez. Görünen ürün adı ve kısayol `Notes`, kurulum dosyası her sürümde `Notes.exe` olarak sabittir. Kurulum kimliği `com.asilhanalpay.notdefterim` olarak korunur. `app.setPath` ile kullanıcı verileri önceki `Not Defterim` klasörüne yönlendirilir; notlar ve şifreli sürüm bağlantısı bu sayede korunur. Bu kimlik ve veri yolu yeni sürümlerde değiştirilmemelidir. Otomatik güncelleme ve bulut eşitleme bu sürümde yoktur.

Genel kullanıma sunmadan önce Windows üzerinde ilk kurulum, güncelleme, kaldırma/yeniden kurma, yüksek ekran ölçeği, klavye kullanımı ve veri kurtarma elle doğrulanmalı; kod imzalama eklenmelidir.

## Özel sürüm bildirimleri

Uygulama otomatik güncelleme yapmaz. `masaüstü/sürüm-bildirimi.cjs` yalnızca sürüm bilgisi okur; çalıştırılabilir dosya indirmez veya başlatmaz. İndirme düğmesi, doğrulanan sabit depo/sürüm yolunu varsayılan tarayıcıda açar. GitHub erişim anahtarı bu adrese eklenmez; tarayıcının kendi GitHub oturumu kullanılır.

Kullanıcı kendi ayrıntılı, yalnızca seçili depoya `Contents: read` izni olan anahtarını girer. Anahtar `safeStorage` ile Windows hesabına bağlı şifrelenir; şifreleme yoksa açık metinle devam edilmez. Depo kimliği ve gizlilik durumu doğrulanır. Anahtar arayüze geri verilmez ve ham ağ hataları günlüklere aktarılmaz. HTTP yönlendirmeleri izlenmez; anahtar yalnızca `api.github.com` üzerindeki iki sabit uç noktaya gönderilir. Windows hesabını ele geçiren bir süreç aynı kullanıcının şifreli verilerine erişebilir; bu koruma işletim sistemi hesabının güvenliğine dayanır.

Bağlantı kullanıcı tarafından kurulmadan ağ isteği yapılmaz. Arka plan denetiminde iki dakikalık sınır vardır. Kullanıcının düğmeyle başlattığı denetim bu süreyi beklemeden GitHub’a yeniden istek gönderir; ana işlem elle denetim seçeneğini kendisi belirler. Eşzamanlı istek kilidi her iki yolda korunur. GitHub istekleri `Cache-Control: no-cache` ile yeniden doğrulama ister. Bağlantı kaldırıldığında devam eden istek iptal edilir; gecikmiş yanıt bağlantıyı yeniden açamaz. Uygulama içindeki bildirimler GitHub’ın izleme ve e-posta aboneliklerinden bağımsızdır ve bu hesap ayarlarını değiştirmez.

Windows iş akışı önce yayımlanmış 0.0.3 sürümünü geçici denetim makinesine kurar, Türkçe bir not dosyası oluşturur ve eski sürümü kaldırmadan yeni kurulumu çalıştırır. Kurulu sürüm, Notes.exe dosyası, masaüstü kısayolu ve not dosyasının korunduğu doğrulanır. Yeniden kurulum da sınanır; uygulama açıkken kurulumun uygulamayı zorla kapatmadan durduğu denetlenir. `denetimler/windows-kurulum.ps1` kişisel bilgisayarlarda çalıştırılmayı reddeder.

## Dosya adları

Klasör ve dosya adları Türkçedir; Türkçe harfler kullanılır. `README.md`, `package.json`, `package-lock.json`, `.gitignore` ve `.github/workflows` araçların tanıdığı adları korur. Klasörlerin görevleri [dosya açıklamalarında](dosyalar.md) bulunur. Ad değiştirirken dosyayı kullanan kodu, denetimleri ve kurulum ayarlarını birlikte güncelle; kullanıcı verisi yolunu değiştirme.

## Şifreleme sınırı

`notlar.json`, otomatik kurtarma kopyası ve dışa aktarılan JSON yedekleri uygulama tarafından şifrelenmez. Dosya erişim yetkisi olan biri notları okuyabilir. GitHub erişim anahtarının Windows hesabına bağlı şifrelenmesi not dosyalarını şifrelemez. Kişisel notları, yedekleri ve erişim anahtarını depoya ekleme. Not şifreleme ve yayıncı imzası bu sürüme dahil değildir; ayrıca değerlendirilecektir.

## Sürekli güvenlik takibi ve gerçek ortam denetimleri

`.github/dependabot.yml` yardımcı bileşenleri ve GitHub iş akışlarını haftalık takip eder, uygun olduğunda güncelleme isteği açar. Kendiliğinden birleştirme veya sürüm yayımlama yapılmaz. `Bileşen güvenliği` iş akışı pazartesi Türkiye saatiyle 10.00 civarında, ayrıca bileşen listesi değiştiğinde çalışır. GitHub zamanlanmış işleri gecikebilir. `npm audit` orta ve üzeri bir açık bildirirse işlem başarısız olur; Windows yayın hattı da aynı denetimi içerir. Bu tarama npm’nin güncel açık kayıtlarıyla sınırlıdır, tam güvenlik incelemesinin yerini tutmaz. Bileşen adları/sürümleri npm hizmetine gönderilir; kaynak kod ve kullanıcı verileri gönderilmez.

`denetimler/electron.cjs` Windows üzerinde gerçek Electron ile korumalı alanı, bağlam yalıtımını, yazı alanında Node.js erişiminin kapalı olmasını, başka pencereden gelen yetkisiz kayıt isteğini, geçersiz kayıt verisini, ağ erişiminin engellenmesini, sayfa gezintisi ve yeni pencere engelini doğrular. Kısa süre sonra kayıt, Ctrl+S, kapanışta son kaydın tamamlanması, yeniden açılışta notların/temanın korunması ve iki tema görüntüsü de sınanır. Yardımcı saldırgan pencereler sadece denetim sürecinde oluşturulur; ürünün koruma ayarları değiştirilmez. Denetim kapısı veya özel yetkili denetim kanalı ürüne eklenmez. Windows kurulum denetimi ayrıca 0.0.3 üzerinden kurulum, yeniden kurulum, kısayol ve not korumasını sınar.

Depo adı `asilhanalpay/Notes` olarak kullanılır; sabit sayısal depo kimliği korunur. Eski 0.0.1 kurulumu eski adrese yönlendirmeyi izlemediği için 0.0.2 bir kez elle kurulmalıdır. Sonraki daha yüksek sürümler isteğe bağlı mevcut bağlantı üzerinden bildirilir.

## Sade görünüm

Masaüstünde not listesi 230 piksel genişliğindedir. Kartlar başlık ve tek satırlık önizleme içerir; tarih yalnızca düzenleyicide gösterilir. Dosya işlemleri yerleşik açılır menüde toplanır. Bu menü, CSS bağlama konumlandırmasıyla ⋯ düğmesinin üzerinde ve üst katmanda açılır; kenar çubuğunun taşma sınırında kırpılmaz. Gerçek Electron denetimi klavyeyle açma, Tab ile ilk işleme ulaşma, Esc ile kapatma/odağı geri verme ve dışarı tıklamayı sınar.
