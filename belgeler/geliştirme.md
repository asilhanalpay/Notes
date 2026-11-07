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

Electron, sistemde ayrı bir tarayıcı veya Node.js kurulumuna gerek bırakmadan uygulamayı paketler. Masaüstü köprüsü yalnızca tanımlanmış not işlemlerini sunar. Arayüzün Node.js ve dosya sistemi erişimi yoktur. Bağlam yalıtımı ve işlem korumalı alanı açıktır; arayüzün ağ istekleri, yeni pencereler ve sayfa gezintileri engellenir. İsteğe bağlı güncelleme ana işlemde sabit GitHub depo, son sürüm ve varlık API uçlarını HTTPS üzerinden okur. Kurulum indirmesinde yalnız izinli GitHub veri sunucularına yönlendirme izlenir; depo anahtarı bu sunuculara gönderilmez. Not metinleri HTML olarak yorumlanmaz.

Yazı değişiklikleri 650 ms sessizlikten sonra kaydedilir. Her tuşta bütün notlar kopyalanmaz; diske yazılacak son durum kayıt başladığında bir kez kopyalanır. Devam eden kayıt sırasındaki değişiklikler bir sonraki son kopyada birleştirilir. Ctrl+S, kapanış ve dosya işlemleri bekleyen kaydı hemen tamamlar. Yeni not, silme ve geri alma işlemleri hemen kaydedilir. Kayıtlar sırayla işlenir. Geçici dosya diske yazılıp eşitlendikten sonra ana dosyanın yerine geçirilir. Önceki sağlam içerik yedeklenir. Geçersiz dosyalar sessizce boş bir kayıtla değiştirilmez. Kapanış son kaydın onayını bekler; kayıt hatasında pencere açık kalır. İşletim sisteminin zorla kapatması veya güç kesintisi anındaki henüz tamamlanmamış değişikliklerin korunması garanti edilemez.

TXT açma mevcut notları silmez; dosya seçiciden gelen metni yeni bir notla ilişkilendirir. Bir notun başlığı en fazla 500, içeriği 1.000.000 karakterdir; toplam veri 16 MB ve 10.000 not ile sınırlıdır.

## Dağıtım

`main` dalına gönderim, değişiklik isteği veya elle başlatma, Windows sunucusunda denetim ve kurulum üretimini çalıştırır. PR denetiminde kurulum dosyası çıktı olarak saklanır; yayımlanmış kararlı sürümler herkese açıktır. Derleme işlemi yalnızca depo okuma iznine sahiptir. Ana daldaki başarılı derlemenin ardından ayrı bir yayın işi, denetlenmiş `.exe` dosyasını GitHub Sürümler bölümüne ekler. Yalnızca bu iş depo içeriğine yazma izni alır ve GitHub'ın işleme özel erişim anahtarını kullanır; uygulamaya herhangi bir erişim anahtarı eklenmez.

Notes sürüm sırası her hanede 9'dan sonra bir önceki haneye taşar: `0.1.8 → 0.1.9 → 0.2.0`, `0.9.9 → 1.0.0`. Yayımlanmış `0.0.10` tarihsel kayıt olarak korunur; sonraki sürüm `0.1.0` olur. Bu kural uygulama sürümü içindir; bağımlılıkların sürümleri değiştirilmez.

Yeni sürüm yayımlamak için `package.json` ve `package-lock.json` içindeki sürüm numaralarını birlikte artır. Yayın adımı bu numaradan bir sürüm etiketi oluşturur ve kaynak kaydını bu etikete bağlar. Var olan sürüm dosyalarının üzerine yazılmaz. Değişiklik isteklerinden sürüm yayımlanmaz. `belgeler/sürüm-açıklaması.md` dosyasını sürüme uygun tut. Kullanıcılar `.exe` dosyasını doğrudan indirir; GitHub Actions çıktılarındaki ZIP arşivi indirmeleri gerekmez.

Kurulum Türkçedir, yönetici yetkisi gerektirmeyen kullanıcı kurulumunu kullanır ve kaldırma sırasında not verilerini silmez. Görünen ürün adı ve kısayol `Notes`, kurulum dosyası her sürümde `Notes.exe` olarak sabittir. Kurulum kimliği `com.asilhanalpay.notdefterim` olarak korunur. `app.setPath` ile kullanıcı verileri önceki `Not Defterim` klasörüne yönlendirilir; notlar ve şifreli sürüm bağlantısı bu sayede korunur. Bu kimlik ve veri yolu yeni sürümlerde değiştirilmemelidir. Kullanıcı Güncelle düğmesine bastığında mevcut klasöre sessiz güncelleme yapılır; bulut eşitleme yoktur.

Genel kullanıma sunmadan önce Windows üzerinde ilk kurulum, güncelleme, kaldırma/yeniden kurma, yüksek ekran ölçeği, klavye kullanımı ve veri kurtarma elle doğrulanmalı; kod imzalama eklenmelidir.

## Yeni sürüm bildirimleri

`masaüstü/sürüm-bildirimi.cjs` yaklaşık 3 dakikada bir kararlı sürüm denetler. `masaüstü/güncelleme.cjs`, kullanıcı Güncelle dediğinde doğrulanan varlık kimliğiyle indirme yapar; boyutu ve GitHub API SHA-256 özetini kontrol eder. İstekler erişim anahtarı veya Cookie göndermez. Yönlendirme HTTPS ile release-assets.githubusercontent.com veya objects.githubusercontent.com üzerinde olabilir; kullanıcı bilgisi, özel port ve farklı sunucu reddedilir. Eksik özetli yayın çalıştırılmaz.

`güncelleme-yardımcısı.ps1`, ana işlemin normal kayıt/kapanışını bekler, özeti tekrar doğrular, `/S --updated /currentuser /D=<mevcut klasör>` ile kurar ve aynı EXE’yi yeniden açar. Hedef ve indirme yolu renderer tarafından alınmaz; komut dizgileri PowerShell sabiti olarak kodlanır. Kayıt hatası kapanışı ve kurulumu engeller. Yardımcı başlatılamazsa düzenleyici açık kalır. Sonraki açılış başarısız kurulum kaydını gösterir. Authenticode yayıncı doğrulaması henüz yoktur; TLS ve herkese açık GitHub yayınının özeti bağımsız bir yayıncı imzası değildir.

Güncelleme için kullanıcı anahtarı veya hesap bağlantısı istenmez. Depo kimliği ve herkese açıklık her denetimde doğrulanır. Meta veri isteklerinde HTTP yönlendirmeleri izlenmez. İndirme için sabit varlık API yolu kullanılır; yalnız izinli veri sunucularına HTTPS yönlendirme izlenir. Eski safeStorage kasası yalnız geçmiş şifreli kayıt uyumu testleri için tutulur; açık depo güncelleyicisi bu kaydı okumaz, yeniden şifrelemez veya silmez. Not dosyaları şifreli değildir.

Bağlantı kullanıcı tarafından kurulmadan ağ isteği yapılmaz. Arka plan denetimleri normalde dakikada bir yapılır; art arda istekler için en az 45 saniye sınırı vardır. Kullanıcının düğmeyle başlattığı denetim bu süreyi beklemeden GitHub’a yeniden istek gönderir; ana işlem elle denetim seçeneğini kendisi belirler. Eşzamanlı istek kilidi her iki yolda korunur. GitHub istekleri `Cache-Control: no-cache` ile yeniden doğrulama ister. Bağlantı kaldırıldığında devam eden istek iptal edilir; gecikmiş yanıt bağlantıyı yeniden açamaz. Uygulama içindeki bildirimler GitHub’ın izleme ve e-posta aboneliklerinden bağımsızdır ve bu hesap ayarlarını değiştirmez.

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

## Denetim raporuna dayalı bakım

Electron 45.2.1 ve electron-builder 26.18.1 sabitlenmiştir. Kasa `isAsyncEncryptionAvailable`, `encryptStringAsync` ve `decryptStringAsync` kullanır. `decryptStringAsync` sonucunun `result` alanı doğrulanır; eski şifreli kayıtlar açılışta yeniden yazılmaz. Şifreleme beklerken bağlantıyı kaldırma veya kapanış, gecikmiş dosya yazımını iptal eder. Asenkron kasa okuması not düzenleyicisini bekletmez. Gerçek Windows şifreleme uyumu için sentetik test `denetimler/electron.cjs` içindedir; Linux üzerinde atlanır. Yeni asenkron API ile açıkça kurulan bağlantının eski Electron ile okunacağı varsayılmaz; sürüm geri dönüşünde GitHub bağlantısını yeniden kurmak gerekebilir. Bu değişiklik not dosyalarını şifrelemez.

Kurulum betiği yalnız GitHub-hosted geçici Windows ortamında çalışır; mevcut not klasörü varsa durur. İlk kurulum, kaldırıp yeniden kurma, 0.0.3 üzerinden yükseltme ve aynı sürümün üzerine kurma sırasında sentetik ana/kurtarma/kasa dosyalarını karşılaştırır. ACL ve oturum yetkisini `denetim-çıktıları/windows-*.json` altında kaydeder. Yükseltilmiş oturumda geçen kurulum testi, standart kullanıcıda yönetici gerektirmeyen kurulum kanıtı sayılmaz. Normal `npm run baslat` gerçek kullanıcı veri yolunu kullanır; deneme amacıyla kişisel profilde başlatma.

Windows davranış denetimleri geçen fuse/ASAR ayarları normal paket yapılandırmasındadır. `RunAsNode`, `NODE_OPTIONS` ve Node inspector argümanları kapalı; gömülü ASAR doğrulaması ve yalnız ASAR'dan yükleme açıktır:

```sh
npm run paketle:windows
npm run denetle:paket
```

İlk komut NSIS kurulumunu ve uygulama klasörünü üretir. `denetle:paket` gerçek EXE fuse değerlerini, EXE'ye gömülü ASAR başlık özetini ve dosya bütünlüklerini statik olarak kontrol eder; uygulamayı çalıştırmaz. `denetimler/windows-paket.ps1` normal paketin açılış/kapanışını, Node ortam değişkenlerini, değiştirilmiş ASAR'ı ve alternatif app klasörünü geçici Windows hesabında sınar. Inspector kapalı olduğundan paketli uygulamaya Playwright ana işlem bağlantısı açılmaz; kaynak Electron güvenlik testleri ayrı kalır. Ayrı çıktı için `paketle:windows:aday` ve `paketle:windows:aday:dizin` komutları korunur; o klasörün statik denetimi `npm run denetle:paket -- kurulum/güçlendirme-adayı/win-unpacked` ile yapılır.

`Windows veri koruma — yayınsız denetim` iş akışı elle veya `codex/windows-denetimi-*` test dallarında kod/ayar değişince çalışır, depo okuma yetkisi kullanır ve yayın işi içermez. Belge değişiklikleri bu ayrı işi tekrar başlatmaz. Bağımlılık audit'i hata verirse iş akışı başarısız olur; Windows işlev testleri daha önce toplanır. Main dalının mevcut yayın kapısındaki audit kontrolü korunur.

`windows-standart-kullanıcı.ps1`, geçici hosted hesabın yönetici yetkilerini SAFER NormalUser belirteciyle kaldırarak kurulum yaşam döngüsünü çalıştırır. `windows-diğer-hesap.ps1`, rastgele parolalı ayrı bir standart test hesabıyla etkin dosya erişimini ve hesabın kendi profilindeki kurulumu sınar. Gerçek kullanıcı hesabı/parolası kullanılmaz; not/uygulama ACL'leri testi geçirmek için değiştirilmez. Test yardım dosyalarını paylaşan geçici dizinin izinleri yalnız iki test hesabı, SYSTEM ve yöneticilerle sınırlandırılır; hesap sonunda kaldırılır. Testler kişisel bilgisayarda çalıştırılmayı reddeder.

[Gerçek Windows sonuçları ve kalan sınırlar](windows-doğrulama.md).

### Linux bulut ortamında NSIS üretimi

32 bit Wine çalıştıramayan Linux ortamları için ayrı komutlar vardır:

```sh
npm run paketle:windows:linux
npm run paketle:windows:linux:aday
```

`kurulum-kaynakları/linux-nsis.cjs`, electron-builder'ın macOS NSIS yolunda da kullandığı `UninstallerReader` ile derleme sırasında kaldırıcıyı çıkarır. Son kurulum yine aynı NSIS derleyicisi ve ürünün mevcut kurulum betiğiyle oluşturulur. Bu uyarlayıcı yalnız kendi derleme sürecinde, beklenen tek NSIS çağrısını değiştirir; `node_modules` dosyalarını değiştirmez. İç API kullandığı için builder ve app-builder-lib sürümleri tam olarak 26.18.1 değilse durur. Sürüm yükseltildiğinde gerçek kurulum/kaldırıcı arşiv kontrolleri yeniden yapılmalıdır. Standart Windows komutları bu uyarlayıcıyı kullanmaz. Yardımcı betik uygulamaya paketlenmez; yayın her iki komutta da kapalıdır.

İnternetsiz kullanımda `NOTES_ELECTRON_CACHE` Electron arşivinin önbelleğini, `ELECTRON_BUILDER_CACHE` NSIS/7zip araç önbelleğini seçebilir. Electron önbelleğine resmî `SHASUMS256.txt-45.2.1` de konulmalı; sağlama veya TLS doğrulaması kapatılmamalıdır. Bu komutlar ağsız konteynerde normal ve aday kurulum için doğrulanmıştır. Kurulum üretimi ve arşiv bütünlüğü, gerçek Windows kurulum/veri/ACL/DPAPI testlerinin yerini tutmaz.

[Bakım sonuçları ve kalan doğrulamalar](bakım-doğrulama.md) · [Veri koruma taslakları](veri-koruma-tasarımı.md)

## Minimatch derleme uyumu

Minimatch 11.0.3 sabittir; eski dolaylı kopyalar aynı sürüme yönlendirilir. npm paketleme komutları, resmi builder CLI'sinden önce yalnız Node derleme sürecinde `minimatch-uyumu.cjs` yükler. Uygulama NODE_OPTIONS/fuse ayarları değiştirilmez. Callable/Matcher ve Windows ayırıcı köprüsü üst paketlerin API farklarını korur; sürüm değişiminde yeniden sınanmalıdır. [Düzeltme, testler ve geri dönüş](minimatch-düzeltmesi.md).

## Pencere kenarı ve stil düzeni

Windows penceresi resmi Electron accentColor ayarıyla siyah aktif kenar kullanır; yerel taşıma, büyütme/küçültme ve boyutlandırma korunur. İçerik alanının dış kenarı iki temada da siyahtır. Karanlık temadaki iç ayırıcılar okunurluk için nötr gridir. OS tarafından çizilen pasif pencere kenarı ve yüksek karşıtlık davranışı işletim sistemi tercihine bağlıdır. Görünüm tek CSS dosyasında, yinelenen sonradan ekleme blokları olmadan düzenlenir.


## İlk kurulum, tema ve güncelleme kontrolleri

0.1.1 adayında pencere kenarı açık temada #d0d0d0, karanlık temada #202020 olur. Windows yerel başlık çubuğu nativeTheme üzerinden, aktif kenar setAccentColor üzerinden temayı izler. Arayüzün dış çizgisi aynı renkleri kullanır; iç ayraç ve odak kontrastları korunur.

Güncelleme denetimi açılışta 1 saniye sonra ve 3 dakikada bir çalışır. Odak dönüşü otomatik denetim ister; son otomatik istekten 45 saniye geçmediyse birleşir. Yeni sürümler penceresi açılınca elle denetim yapılır. GitHub'ın 403/429 bekleme süresi elle istekle de aşılamaz. Depo kimliği/herkese açıklık, sürüm/varlık adresi, boyut ve SHA-256 denetimleri korunur. Her normal periyotta iki metadata isteği yaklaşık saatte 40 istektir; ortak IP, ek elle/odak istekleri ve ağ gecikmesi bildirim süresini uzatabilir. Sunucu tarafından itilen anlık bildirim yoktur.

Windows iş akışı NSIS sihirbazını standart yetkiyle kurulum başlamadan önce görüntüler; varsayılan kullanıcı klasörünü ve Kur düğmesine ulaşmayı denetler, ekran görüntülerini saklar. Kur düğmesine basmaz; gerçek dosya yerleştirme ayrı sessiz ilk kurulum/yeniden kurulum testinde sınanır. Varsayılan ve Türkçe/boşluk/tek tırnak içeren özel klasörde gerçek paket ASAR'ının güncelleme başlatıcısı, tek kayıt/kısayol/hedef, geçici EXE temizliği ve sentetik veriler kontrol edilir. Ağ yanıtı testte yerel kurulum dosyasıdır; canlı anahtarsız indirme ayrı testtir.

Dijital yayıncı imzası ve SmartScreen itibarı bu değişiklikte sağlanmaz. Hosted Windows Server üzerinde geçen otomasyon fiziksel Windows 10/11 makinelerinde elle test yerine geçmez. Ayrıntı: kurulum-tema-guncelleme.md.
