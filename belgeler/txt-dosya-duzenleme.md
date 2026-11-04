# TXT açma ve yerinde düzenleme — 0.0.10 adayı

Kullanıcı tercihleri: Dosyalar menüsünde yalnız Farklı kaydet ve Dosya aç; açılmış dosyanın üzerine kayıt; otomatik JSON düzenini koruma. Veri geçişi ve toplu dönüştürme yapılmaz.

Farklı kaydet seçilen notun gövdesini UTF-8/CRLF TXT olarak yazar, başlığı dosya adı olarak önerir ve sonraki düzenlemeleri yeni hedefe bağlar. Dosya aç tüm metni gövde olarak açar, başlığı dosya adından alır. İlk satır başlık sanılıp atılmaz. Başlık değişikliği dosyayı yeniden adlandırmaz. Aynı hedef ikinci kez açılınca mevcut nota dönülür. Kayıtlar 650 ms gecikme, Ctrl+S ve kapanış kuyruğunu kullanır. Mevcut not listesi ve kurtarma dosyası biçimi değişmez.

Bağlantılar kullanıcı verisi içindeki txt-baglantilari.json içinde, ana işlemde tutulur: not kimliği, mutlak yol, içerik özetleri, kodlama ve satır sonu. Renderer dosya yolu belirleyemez; yalnız yerel seçicinin onayladığı TXT bağlanır. Köprü genel dosya sistemi yetkisi vermez. Eski kullanılmayan menü/IPC çağrıları kaldırılır; IPC gönderen denetimi, sandbox, contextIsolation, CSP ve ağ engeli korunur.

TXT açma UTF-8 (BOM isteğe bağlı), BOM içeren UTF-16 LE/BE destekler. Hatalı kodlama, NUL, normal dosya olmayan hedefler, simgesel bağlantı ve 4 MB/bir milyon karakter sınırını aşan veri reddedilir. Açılan dosyanın kodlama/BOM ve ilk satır sonu biçimi korunur; karışık satır sonları ilk düzenlemede ilk kullanılan biçime normalize edilir. Değişmeyen TXT yeniden yazılmaz. Dosya yazılırken geçici dosya eşitlenir ve yeniden adlandırılır. Öncesinde ve hemen öncesinde SHA-256 karşılaştırması dış düzenlemeyi saptar. İşbirliği yapmayan başka bir süreçle son kontrol ve yeniden adlandırma arasında tam kilitleme garantisi yoktur. Ağ/senkronizasyon klasörleri ve tüm dosya sistemlerinde atomiklik garanti edilmez.

Önce JSON kurtarılabilir kaydı tamamlanır. Dış TXT veya bağlantı kaydı başarısızsa hata döner ve kapanış/güncelleme bekler. Birden çok dosya için toplu atomik işlem garantisi yoktur; tamamlanan dosyaların özetleri kaydedilir, tekrar deneme yalnız kalan değişiklikleri işler. Bağlantı kaydı bozuksa otomatik kayıt durur; sessizce boş bağlantı listesiyle devam edilmez. Farklı kaydet bekleyen kayıt başarısız olsa bile güncel düzenleyici metniyle başka bir hedefe kurtarma sağlar. Başka açık TXT hedefine Farklı kaydet engellenir. Notun silinmesi dış TXT’yi silmez; Geri al bağlantıyı korur.

TXT, JSON ve bağlantı yolları şifrelenmez. Dış yedeklerde/kurtarma kopyasında silinen metin kalabilir. Güvenli imha iddiası yoktur. Yalnız sentetik verilerle test yapılır.

Geri dönüş: değişen kaynaklar PR11 öncesi kaynakla dosya bazında karşılaştırılarak geri alınabilir. Kullanıcı notları, TXT dosyaları ve bağlantı kaydı silinmez. Eski uygulama JSON kopyalarını açar ancak dış TXT’ye eşzamanlı yazmayı bilmez. Dış dosyalar eski sürümde düzenlenmişse yeni sürümde tekrar kayıt öncesinde içerikler karşılaştırılmalıdır. Bu aday kullanıcı ayrıca yayın istemeden birleştirilmez veya yayımlanmaz.
