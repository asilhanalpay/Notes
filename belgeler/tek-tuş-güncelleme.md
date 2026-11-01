# İkon ve tek tuş güncelleme — 0.0.5 adayı

Logo yeniden çizilmeden, 512 piksel kaynakta 48 piksel civarındaki kenar boşluğu azaltıldı. Dolu alan yaklaşık %81’den %96’ya çıktı. PNG ve 16/20/24/32/40/48/64/128/256 boyutlarında ICO aynı kaynaktan üretildi. Windows ikon önbelleği/pinlenmiş kısayolun yenilenmesi gerekebilir.

Güncelleme bildirimi bir kod gönderimini değil, daha yüksek kararlı GitHub yayını ve geçerli Notes.exe varlığını izler. Uygulama açık, çevrimiçi ve özel depoya bağlıyken yaklaşık dakikada bir kontrol yapılır; cihaz uykudayken anlık teslim garantisi yoktur. Kullanıcı tek Güncelle tıklamasıyla indirir. Dosyanın boyutu ve SHA-256 özeti doğrulanır. Anahtar yalnız API isteğinde kullanılır; GitHub veri sunucularına aktarılmaz. Gizli notlar ağa gönderilmez.

Yardımcı, son kaydın bitip Notes’un normal kapanmasını bekler; işlem zorla öldürülmez. Sessiz kurulum mevcut EXE klasörünü hedefler ve Notes’u yeniden açar. Kişisel not yolu değişmez. Kayıt/indirme hatasında kurulum başlamaz. Yardımcı hazırlığı başarısızsa düzenleyici açık kalır. Yardımcı kurulum hatasını yerel sonuç dosyasına yazar; sonraki açılışta görünür. İşletim sistemi ilkesi PowerShell’i engellerse sessiz güncelleme kullanılamaz. Kullanıcı tarafından makine geneline kurulmuş veya yazılamayan kurulum hedefi için ayrı yükseltme desteği yoktur; standart kullanıcı kurulumu hedeflenir.

İlk geçiş: 0.0.4 ve daha eski uygulamalarda bu kod bulunmadığı için 0.0.5 adayı bir kez elle kurulmalıdır. Sonraki yayımlanmış sürümlerde tek tuş akışı kullanılabilir. Bu çalışma main’e birleştirme/yayın yapmaz. Mevcut minimatch audit kapısı korunur.

## Doğrulama

Temiz GitHub-hosted Windows Server 2025 x64 (10.0.26100), Node.js 24, Electron 45.2.1. Gerçek kullanıcı verisi kullanılmadı; bütçe artırılmadı. Ücretsiz kota sonrası harcamayı engelleyen sınırın hazır olduğu kullanıcı bildirimi önceki Windows çalışmasıyla aynıdır.

| Çalıştırma | Sonuç |
| --- | --- |
| [41310158152](https://github.com/asilhanalpay/Notes/actions/runs/41310158152), `2b402e1` | 55 birim ve 1 gerçek Electron testi, paket/fuse/ASAR davranışı geçti. Yardımcı başarısız sonuç verdi; ilk denemede aşama ayrıntısı yoktu. Audit de başarısız. |
| [41310707897](https://github.com/asilhanalpay/Notes/actions/runs/41310707897), `47ad1ee` | Canlı özel yayın indirmesi ve SHA-256 geçti. Yardımcı `ozet / CommandNotFoundException` kaydetti: Windows PowerShell oturumunda Get-FileHash bulunamadı. Kurulum başlamadan durdu. |
| [41311181155](https://github.com/asilhanalpay/Notes/actions/runs/41311181155), `8a83a92` | Aynı SHA-256 kontrolü doğrudan .NET ile yapıldı. Tüm işlev denetimleri geçti; yalnız bilinen minimatch audit başarısız. |

Son çalıştırmada doğrulanan kaynak: `8a83a9223be4c7e630265ab1db85bde7fb131664`. Sonraki rapor güncellemesi ürün kodunu değiştirmez.

- 55 birim testi, 1 gerçek Electron testi: ağ/IPC/yalıtım/kayıt kontrolleri ve eski şifreli safeStorage kayıt uyumu geçti.
- Canlı özel GitHub varlık indirmesi gerçek v0.0.4 yayınıyla (111.607.992 bayt, API SHA-256 ile) geçti; indirilen eski paket bu adımda çalıştırılmadı. Anahtar günlük/artifakta yazılmadı.
- Standart yetkili süreçte gerçek ürün yardımcısı, açık uygulamayı zorla kapatmadan bekledi. Normal kapanıştan sonra 0.0.5 adayını aynı kurulum klasörüne sessizce yeniden kurdu ve Notes’u açtı. Ana not, kurtarma ve sentetik kasa dosyaları değişmedi. `windows-guncelleme.json` bütün beklentileri `true` kaydeder.
- Ayrı yaşam döngüsü testi 0.0.3 → 0.0.5 yükseltmesini, ilk kurulum/kaldırma/yeniden kurmayı ve ACL'leri doğruladı. Ayrı gerçek standart hesap, kendi profilindeki kurulum yaşam döngüsünü geçti; sahibin verilerine sekiz dosya erişimi reddedildi.
- Gerçek EXE fuse değerleri, ASAR bütünlüğü ve saldırgan alternatif uygulama/ortam değişkeni örneklerinin reddi geçti. Güvenlik kontrolleri gevşetilmedi.
- Windows'ta test edilen kurulumdan uygulama EXE'si yerelde çıkarıldı. EXE içindeki 16/20/24/32/40/48/64/128/256 piksel ikon katmanlarının kaynak ICO katmanlarıyla SHA-256/bayt eşitliği doğrulandı. Bu kontrol, Windows görev çubuğunun doğrudan görsel ölçümü değildir.
- Yayımlanmamış 0.0.5’in canlı yayın bildirimi ve gerçek bir sonraki sürüme düğmeden kesintisiz geçişi test edilmiş sayılmaz. Canlı indirme, arayüz/koordinatör testleri ve gerçek kurulum yardımcısı ayrı doğrulandı.

### Çıktılar

- [Test edilen kurulum](https://github.com/asilhanalpay/Notes/actions/runs/41311181155/artifacts/13085641272): 121.699.327 bayt; EXE SHA-256 `cea139fca3ba667efbe30870167f0ad075a15af5e6c24bcbb6cacc8e20a42b39`. İmza `NotSigned`. Çalışma alanındaki kopya: `kurulum/Notes-0.0.5-test.exe`. GitHub çıktısı 2 Kasım 2026 13:30 UTC'ye kadar saklanır.
- Kurulum ZIP SHA-256 `3294f9419b2e52850b91a40455e7e5a78e27d0d82215eac041a518af7e4b5381`.
- [Windows kanıtları](https://github.com/asilhanalpay/Notes/actions/runs/41311181155/artifacts/13085024984): ZIP SHA-256 `13f090b497160a5133eb6c0424b438fc3241d137ae15d5d5e0ed5002aa2ed9c0`; saklama sonu 15 Kasım 2026 13:30 UTC. Yerel kopya `denetim-çıktıları/windows-0.0.5/`. İndirilen ZIP ve EXE özetleri ayrıca doğrulandı.

Genel iş akışı **başarısızdır**: bilinen tek minimatch advisory'si 15 orta düzey bağımlılık kaydına yansır. Bu 15 yeni uygulama açığı değildir. Uyarı bastırılmadı, audit kapısı korunur. Yayın yapılmadı.

## Sınırlar ve geri dönüş

SHA-256 GitHub’daki yayından gelir; bağımsız yayıncı imzası değildir. Paket hâlâ imzasızdır. Windows 10/11 istemci ve görev çubuğu görüntüsü bu Linux ortamında doğrudan gözlenmedi. Yeni bağımlılık eklenmedi; not biçimi veya şifreleme biçimi değiştirilmedi. Geri dönüşte bu özelliğin kaynak değişiklikleri ve iki ikon dosyası önceki test dalı kaydı d715c7b4 ile dosya bazında geri alınabilir; package.json ve kilit sürümü birlikte geri alınmalıdır. Kullanıcı notları sıfırlanmamalıdır.
