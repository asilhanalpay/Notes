# 0.0.6 adayı — dosya yapısı ve keskin görünüm

Yayın talimatı: kullanıcı bu adayın şu an yayımlanmamasını istedi. Main'e birleştirme veya sürüm yayını bu çalışma kapsamında yapılmaz. TXT seçenekleri aynı adayda korunur.

## Görünüm

- Windows'un resmi Electron accentColor ayarı #000000; aktif pencere kenarı siyah. Yerel başlık çubuğu ve taşıma/boyutlandırma/düğmeler korunur. Sahte çerçeve veya ayrı pencere kontrol IPC'si eklenmez.
- Web içerik kenarı iki temada da 1 piksel siyahtır. Açık temadaki bölücü çizgiler siyahtır; karanlık temada iç çizgiler görünür nötr gri olarak kalır.
- Büyük yuvarlatmalar 2 piksele indirildi, kart/menü gölgeleri kaldırıldı. Başlık ve yazı alanı sistemin Segoe UI yazı ailesinde tutarlı hâle getirildi. Yapay keskinleştirme filtresi veya harici font yoktur.
- 230 piksel not listesi, klavye odağı, yerel açılır menü ve dar/zoom görünümü korunur. Hareket azaltma tercihi desteklenir.

## Yapı incelemesi

Kaynak, arayüz, kurulum yardımcıları, denetimler, belgeler, manifest/kilit ve .github ayarları tarandı. Node_modules, kurulum ve denetim-çıktıları üretilmiş/indirilen içeriktir; kaynak envanterinden ayrılır ve zaten Git dışında tutulur. Kullanıcı verileri taşınmaz veya silinmez.

Bulunan bakım ihtiyaçları ve uygulama:

- CSS'te logo, çalışma alanı, başlık ve tema kuralları tekrar tanımlanıyordu; eski web yerleşimi sonradan masaüstü bloklarıyla eziliyordu. Tek, okunabilir stil akışında birleştirildi. İşe yarayan zoom/dar görünüm bırakıldı.
- Dosya açıklamalarında TXT modülü ve bazı derleme/denetim girişlerinin rolü eksikti; dosyalar.md tamamlandı. Güncel geliştirme belgesindeki eski iki dakikalık kontrol sınırı 45 saniye/normal bir dakika davranışıyla düzeltildi.
- Editör biçim kuralları eksikti: .editorconfig ve .gitattributes eklendi. UTF-8/LF ve ikili PNG/ICO korunur; PowerShell'in dört boşluk girintisi ayrıdır.
- Kişisel not/kasa/varsayılan yedek adlarının yanlışlıkla projeye kopyalanması için .gitignore koruması eklendi. Gerçek kişisel dosya okunmadı veya silinmedi.
- PNG ve ICO farklı çalışma/kurulum tüketicileri için gereklidir. Linux NSIS, ayrı aday ayarları, güvenlik testleri ve tarihli denetim kayıtlarının kullanım amacı vardır; gereksiz dosya diye silinmedi.

## Kontroller ve sınırlar

İlk envanterde 53 kaynak/ayar/belge dosyası, 23 JS/CJS, 24 yerel require ve 14 yerel Markdown bağlantısı kontrol edildi; eksik referans bulunmadı. HTML script/stil/ikon referansları, yinelenen DOM kimlikleri, YAML ve manifest/kilit sürüm eşleşmesi de kontrol edildi. Bu yeni rapor envantere ayrıca eklenir. Bu inceleme yeni kapsamlı güvenlik taraması değildir.

Yerel 72 birim testi geçti. İlk gerçek Windows/Electron çalıştırmasında siyah pencere kenarı ve açık/karanlık tema kontrolleri geçti; görüntüde yazı alanı odak çizgisinin altı kırpıldığı için alt boşluk düzeltildi. Yüksek yakınlaştırmada dar alanda sayfa kaydırması eklendi ve %200 denetimi hazırlanarak yeniden Windows doğrulamasına alındı. İlk %200 kontrolü, testin kasıtlı engellenmiş gezinme senaryosundan sonra konumlandırılması nedeniyle Playwright gezinme beklemesine takıldı. Kontrol bu senaryonun önüne taşındı; güvenlik beklentileri değiştirilmedi. Son envanter: 54 dosya, 23 JS/CJS, 24 yerel require, 15 yerel Markdown bağı; eksik referans yok. Pencere kenarının Windows 10/11 istemci üzerindeki pasif/yüksek karşıtlık görüntüsü işletim sistemi denetimindedir; burada başarı iddiası yapılmaz. Notlar, TXT/JSON biçimi, güncelleme güvenliği, sandbox/contextIsolation, IPC gönderen doğrulaması, CSP ve ağ kısıtları değişmedi.

Geri dönüş: önceki TXT aday kaydı 039aea1b8eed4db77aacd2d381d66f842dd36c5a ile ana.cjs/görünüm.css/denetim/belge/biçim kuralları dosya bazında karşılaştırılır. Not ve dışa aktarılan dosyalar silinmez. Aday hâlâ 0.0.6; yeni bağımlılık eklenmedi.
