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

Electron, sistemde ayrı bir tarayıcı veya Node.js kurulumuna gerek bırakmadan uygulamayı paketler. Masaüstü köprüsü yalnızca tanımlanmış not işlemlerini sunar. Arayüzün Node.js ve dosya sistemi erişimi yoktur. Bağlam yalıtımı ve işlem korumalı alanı açıktır; ağ istekleri, yeni pencereler ve sayfa gezintileri engellenir. Not metinleri HTML olarak yorumlanmaz.

Kayıtlar sırayla işlenir. Geçici dosya diske yazılıp eşitlendikten sonra ana dosyanın yerine geçirilir. Önceki sağlam içerik yedeklenir. Geçersiz dosyalar sessizce boş bir kayıtla değiştirilmez. Kapanış son kaydın onayını bekler; kayıt hatasında pencere açık kalır. İşletim sisteminin zorla kapatması veya güç kesintisi anındaki henüz tamamlanmamış değişikliklerin korunması garanti edilemez.

İçe aktarma mevcut notların üzerine yazmaz; yedekteki notlara yeni kimlikler verir. Bir notun başlığı en fazla 500, içeriği 1.000.000 karakterdir; toplam veri 16 MB ve 10.000 not ile sınırlıdır.

## Dağıtım

`main` dalına gönderim, değişiklik isteği veya elle başlatma, Windows sunucusunda denetim ve kurulum üretimini çalıştırır. Kurulum dosyası özel depoda çıktı olarak saklanır; herkese açık dağıtım yapılmaz. Derleme işlemi yalnızca depo okuma iznine sahiptir. Ana daldaki başarılı derlemenin ardından ayrı bir yayın işi, denetlenmiş `.exe` dosyasını GitHub Sürümler bölümüne ekler. Yalnızca bu iş depo içeriğine yazma izni alır ve GitHub'ın işleme özel erişim anahtarını kullanır; uygulamaya herhangi bir erişim anahtarı eklenmez.

Yeni sürüm yayımlamak için `package.json` ve `package-lock.json` içindeki sürüm numaralarını birlikte artır. Yayın adımı bu numaradan bir sürüm etiketi oluşturur ve kaynak kaydını bu etikete bağlar. Var olan sürüm dosyalarının üzerine yazılmaz. Değişiklik isteklerinden sürüm yayımlanmaz. `belgeler/YAYIN_NOTU.md` dosyasını sürüme uygun tut. Kullanıcılar `.exe` dosyasını doğrudan indirir; GitHub Actions çıktılarındaki ZIP arşivi indirmeleri gerekmez.

Kurulum Türkçedir, yönetici yetkisi gerektirmeyen kullanıcı kurulumunu kullanır ve kaldırma sırasında not verilerini silmez. Uygulama kimliği ve veri klasörünün adı yeni sürümlerde değiştirilmemelidir. Otomatik güncelleme ve bulut eşitleme bu sürümde yoktur.

Genel kullanıma sunmadan önce Windows üzerinde ilk kurulum, güncelleme, kaldırma/yeniden kurma, yüksek ekran ölçeği, klavye kullanımı ve veri kurtarma elle doğrulanmalı; kod imzalama eklenmelidir.
