# Geliştirme

Bu bölüm geliştiriciler içindir. Uygulamayı kullanmak için Node.js veya bir geliştirme aracı kurman gerekmez.

## Gerekenler ve komutlar

Node.js 24 ve Windows 10/11 x64 kullan. Depo klasöründe:

```sh
npm ci
npm run denetle
npm run baslat
npm run paketle:windows
```

Kurulum dosyası `kurulum/` klasörüne yazılır. Kaynak sürümleri `package-lock.json` ile sabitlenir. Denetimler Node.js üzerinde çalışır; Electron penceresi açmayı gerektirmez. Arayüz denetimleri jsdom kullanır; gerçek bir Windows kurulum denemesinin yerini tutmaz.

## Tasarım kararları

Electron, sistemde ayrı bir tarayıcı veya Node.js kurulumuna gerek bırakmadan uygulamayı paketler. Masaüstü köprüsü yalnızca tanımlanmış not işlemlerini sunar. Arayüzün Node.js ve dosya sistemi erişimi yoktur. Bağlam yalıtımı ve işlem korumalı alanı açıktır; arayüzün ağ istekleri, yeni pencereler ve sayfa gezintileri engellenir. İsteğe bağlı sürüm bildirimi ana işlemde yalnızca sabit GitHub depo ve son sürüm uçlarını HTTPS üzerinden okur. Not metinleri HTML olarak yorumlanmaz.

Kayıtlar sırayla işlenir. Geçici dosya diske yazılıp eşitlendikten sonra ana dosyanın yerine geçirilir. Önceki sağlam içerik yedeklenir. Geçersiz dosyalar sessizce boş bir kayıtla değiştirilmez. Kapanış son kaydın onayını bekler; kayıt hatasında pencere açık kalır. İşletim sisteminin zorla kapatması veya güç kesintisi anındaki henüz tamamlanmamış değişikliklerin korunması garanti edilemez.

İçe aktarma mevcut notların üzerine yazmaz; yedekteki notlara yeni kimlikler verir. Bir notun başlığı en fazla 500, içeriği 1.000.000 karakterdir; toplam veri 16 MB ve 10.000 not ile sınırlıdır.

## Dağıtım

`main` dalına gönderim, değişiklik isteği veya elle başlatma, Windows sunucusunda denetim ve kurulum üretimini çalıştırır. Kurulum dosyası özel depoda çıktı olarak saklanır; herkese açık dağıtım yapılmaz. Derleme işlemi yalnızca depo okuma iznine sahiptir. Ana daldaki başarılı derlemenin ardından ayrı bir yayın işi, denetlenmiş `.exe` dosyasını GitHub Sürümler bölümüne ekler. Yalnızca bu iş depo içeriğine yazma izni alır ve GitHub'ın işleme özel erişim anahtarını kullanır; uygulamaya herhangi bir erişim anahtarı eklenmez.

Yeni sürüm yayımlamak için `package.json` ve `package-lock.json` içindeki sürüm numaralarını birlikte artır. Yayın adımı bu numaradan bir sürüm etiketi oluşturur ve kaynak kaydını bu etikete bağlar. Var olan sürüm dosyalarının üzerine yazılmaz. Değişiklik isteklerinden sürüm yayımlanmaz. `belgeler/sürüm-açıklaması.md` dosyasını sürüme uygun tut. Kullanıcılar `.exe` dosyasını doğrudan indirir; GitHub Actions çıktılarındaki ZIP arşivi indirmeleri gerekmez.

Kurulum Türkçedir, yönetici yetkisi gerektirmeyen kullanıcı kurulumunu kullanır ve kaldırma sırasında not verilerini silmez. Görünen ürün adı ve kısayol `Notes`, kurulum dosyası her sürümde `Notes.exe` olarak sabittir. Kurulum kimliği `com.asilhanalpay.notdefterim` olarak korunur. `app.setPath` ile kullanıcı verileri önceki `Not Defterim` klasörüne yönlendirilir; notlar ve şifreli sürüm bağlantısı bu sayede korunur. Bu kimlik ve veri yolu yeni sürümlerde değiştirilmemelidir. Otomatik güncelleme ve bulut eşitleme bu sürümde yoktur.

Genel kullanıma sunmadan önce Windows üzerinde ilk kurulum, güncelleme, kaldırma/yeniden kurma, yüksek ekran ölçeği, klavye kullanımı ve veri kurtarma elle doğrulanmalı; kod imzalama eklenmelidir.

## Özel sürüm bildirimleri

Uygulama otomatik güncelleme yapmaz. `masaüstü/sürüm-bildirimi.cjs` yalnızca sürüm bilgisi okur; çalıştırılabilir dosya indirmez veya başlatmaz. İndirme düğmesi, doğrulanan sabit depo/sürüm yolunu varsayılan tarayıcıda açar. GitHub erişim anahtarı bu adrese eklenmez; tarayıcının kendi GitHub oturumu kullanılır.

Kullanıcı kendi ayrıntılı, yalnızca seçili depoya `Contents: read` izni olan anahtarını girer. Anahtar `safeStorage` ile Windows hesabına bağlı şifrelenir; şifreleme yoksa açık metinle devam edilmez. Depo kimliği ve gizlilik durumu doğrulanır. Anahtar arayüze geri verilmez ve ham ağ hataları günlüklere aktarılmaz. HTTP yönlendirmeleri izlenmez; anahtar yalnızca `api.github.com` üzerindeki iki sabit uç noktaya gönderilir. Windows hesabını ele geçiren bir süreç aynı kullanıcının şifreli verilerine erişebilir; bu koruma işletim sistemi hesabının güvenliğine dayanır.

Bağlantı kullanıcı tarafından kurulmadan ağ isteği yapılmaz. İki dakikalık denetim sınırı ve işlem kilidi vardır. Bağlantı kaldırıldığında devam eden istek iptal edilir; gecikmiş yanıt bağlantıyı yeniden açamaz. Uygulama içindeki bildirimler GitHub Watch/e-posta aboneliklerinden bağımsızdır ve bu hesap ayarlarını değiştirmez.

Windows iş akışı önce yayımlanmış 0.2.4 sürümünü geçici denetim makinesine kurar, Türkçe bir not dosyası oluşturur ve eski sürümü kaldırmadan yeni kurulumu çalıştırır. Kurulu sürüm, Notes.exe dosyası, masaüstü kısayolu ve not dosyasının korunduğu doğrulanır. Yeniden kurulum da sınanır; uygulama açıkken kurulumun uygulamayı zorla kapatmadan durduğu denetlenir. `denetimler/windows-kurulum.ps1` kişisel bilgisayarlarda çalıştırılmayı reddeder.

## Dosya adları

Klasör ve dosya adları Türkçedir; Türkçe harfler kullanılır. `README.md`, `package.json`, `package-lock.json`, `.gitignore` ve `.github/workflows` araçların tanıdığı adları korur. Klasörlerin görevleri [dosya açıklamalarında](dosyalar.md) bulunur. Ad değiştirirken dosyayı kullanan kodu, denetimleri ve kurulum ayarlarını birlikte güncelle; kullanıcı verisi yolunu değiştirme.
