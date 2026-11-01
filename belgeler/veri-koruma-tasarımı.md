# Veri koruma kararları — taslak

Bu belge uygulanmış şifreleme veya temizleme özelliği değildir. Mevcut not biçimi ve otomatik kurtarma davranışı korunur. Her özellik için kullanıcı deneyimi ve veri kaybı riski ayrıca onaylanmalıdır.

## Kurtarma kopyasını temizleme

Amaç, kullanıcının geçmiş içeriği barındırabilen yerel `notlar.yedek.json` kopyasını bilinçli olarak kaldırabilmesidir. Dışa aktarılmış dosyalar aranmaz veya silinmez.

Önerilen akış:

1. “Yerel kurtarma kopyasını temizle” ayrı bir menü işlemi olur. Genel amaçlı dosya yolu veya silme IPC'si eklenmez; ana işlem yalnız sabit kurtarma dosyasını hedefler. Mevcut gönderen/ana çerçeve/URL kontrolü korunur.
2. Bekleyen kayıt tamamlanır. Başarısız veya kurtarmadan yeni açılmış bir ana dosya durumunda temizlemeye izin verilmez; önce geçerli ana kopyanın diskte bulunduğu doğrulanır.
3. Ana işlemin yerel onay penceresi “Bu işlem yerel kurtarma kopyasını kaldırır; kurtarma imkânın azalır. Eski dış yedekleri etkilemez ve güvenli imha garantisi vermez.” der. Varsayılan ve Escape seçeneği “Vazgeç” olur.
4. Kullanıcı onaylarsa kayıt kuyruğuyla sıralı işlem yapılır. Onay beklerken veri değişmişse işlem durur; eski onayla yeni durum temizlenmez. Hata sessizce başarıya çevrilmez.
5. “Geri al” belleği ve 10 saniyelik süre ayrı açıklanır. Sonraki normal kayıtta kurtarma kopyasının yeniden oluşacağı belirtilir. Uygulama bunun kalıcı bir “yedeklemeyi kapat” tercihi olduğunu iddia etmez.

Testler: iptal ve yetkisiz IPC hiçbir dosyayı değiştirmemeli; kurtarmadan açılışta/bozuk ana dosyada temizleme reddedilmeli; bekleyen ve hatalı kayıtlar sıralanmalı; izin hatasında veri korunmalı; sentetik silinmiş notun eski dış yedeği değişmemeli. SSD aşınma dengelemesi, dosya sistemi anlık görüntüleri, Windows gölge kopyaları ve eşitlenen/dış yedekler uygulamanın silme yetkisinin dışındadır.

Temizleme geri alınamayabilir. Normal not kaydı veya güncelleme sırasında kendiliğinden çalıştırılmaz.

## Hassas notların şifrelenmesi

Önce kapsam seçilmelidir: bu taslak tüm not deposunu şifrelemeyi önerir. Tek tek not şifreleme; arama, önizleme, dışa aktarma ve karışık açık/şifreli durum için ek kararlar gerektirir. Parola ekranı tek başına dosyaları şifrelemez. Kilidi açık uygulama, pano, ekran görüntüleri, aynı kullanıcı hesabını ele geçirmiş süreçler ve işletim sistemi bellek/swap dökümleri bu korumanın dışındadır.

### Dosya ve anahtar modeli

- Rastgele 256 bit veri anahtarı; AES-256-GCM kimliği doğrulanmış şifreleme. Her yazımda kriptografik rastgele, benzersiz 96 bit nonce; 128 bit doğrulama etiketi. Başlıkta biçim sürümü, algoritma ve anahtar kimliği bulunur ve AAD ile doğrulanır. Kriptografik tasarım uygulama öncesi ayrıca gözden geçirilmelidir.
- Paroladan elde edilen anahtar yalnız veri anahtarını sarar. Yerel Node.js `scrypt`, rastgele en az 128 bit salt ve dosyada kayıtlı, sınırlandırılmış parametreler kullanılır. Bellek/zaman bütçesi hedef Windows donanımında ölçülmeden sayısal maliyet seçilmez. Parola ve ham anahtar diske/günlüklere yazılmaz; parola değişimi notları topluca yeniden şifrelemek yerine sarılmış anahtarı değiştirir.
- İsteğe bağlı Windows safeStorage ile hızlı açılış, parola/kurtarma mekanizmasından ayrı bir anahtar sarmasıdır. Windows hesabına bağlı kopya taşınabilir yedeğin tek anahtarı olamaz; Windows hesabı kaybı ve başka bilgisayara taşıma ayrıca sınanır.
- Rastgele kurtarma anahtarı ayrı sarmalama sağlar; kullanıcı bunu çevrimdışı saklar ve doğrular. Parola ve kurtarma anahtarı birlikte kaybolursa veriler kurtarılamaz; gizli arka kapı veya parola sıfırlama vaadi verilmez. Kurtarmasız kullanım ancak bu kayıp açıkça kabul edilirse seçilebilir.
- Yanlış parola, bozuk veri veya oynanmış etiket kayıtların üzerine boş veri yazılmasına yol açmaz. İçe aktarmadan önce şifreli dosya boyutu, KDF maliyeti ve doğrulanmış içerik boyutu sınırlanır; sıkıştırma zorunlu değildir.

### Geçiş ve yedekleme

1. Sentetik profillerle çalışan prototip ve biçim testleri hazırlanır. Ürün başlangıcı eski biçimi kendiliğinden dönüştürmez.
2. Kullanıcı, eski açık metin ana/kurtarma/dış yedeklerinin kalacağı ve yeni biçimin eski Notes sürümlerinde açılamayacağı konusunda bilgilendirilir. Şifreleme ve eski kopyaları kaldırma ayrı onaylardır.
3. Mevcut geçerli veri okunur; ana dosya ve kurtarma verisi ayrı ayrı yeni dosyalara şifrelenir. Her dosya yeniden açılır, etiketi doğrulanır ve notlar karşılaştırılır. Geçici dosyalara açık metin yazılmaz. Kesintide eski sağlam kopyaya dönüş sağlanır; iki dosyanın birlikte atomik değiştiği varsayılmaz, sürümlü geçiş günlüğü gerekir.
4. Yeni dosya seti doğrulandıktan sonra etkinleştirilir. Hata veya güç kesintisinde eski dosyalar sessizce silinmez. Kullanıcı şifreli dış yedeği farklı profilde parola/kurtarma anahtarıyla açabildiğini doğrular.
5. Dış yedek, başka cihazda açılabilen sarılmış anahtar ve kimliği doğrulanmış şifreli içerik içerir. Otomatik kurtarma da şifrelenir. Açık metin dışa aktarma ayrı ve açıkça adlandırılmış kullanıcı işlemidir.
6. Eski açık kopyaları kaldırma ayrıca onaylanır; güvenli fiziksel imha garanti edilmez. Kullanıcıya ait eski dış yedekler kendiliğinden değiştirilmez.

Geri dönüş: eski açık dosyalar korunurken geçiş iptal edilebilir. Bunlar kaldırıldıktan sonra eski uygulama sürümüne dönmek için yeni sürümde kullanıcının açıkça seçtiği çözülmüş dışa aktarma gerekir; bu işlem gizlilik sonucuyla birlikte anlatılır. Parola/kurtarma anahtarı kaybı bir yazılım geri alma işlemiyle giderilemez.

Zorunlu doğrulamalar: yanlış parola, etiket/başlık/içerik değişikliği, nonce üretimi, aşırı KDF parametreleri, disk dolması/izin hatası, her geçiş adımında kesinti, bozuk ana dosyadan şifreli kurtarma, parola değişimi, kurtarma anahtarı ve başka Windows hesabında/cihazda yedek açma. Gerçek kullanıcı verileri kullanılmaz.
