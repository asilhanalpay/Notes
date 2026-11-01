# Notes 0.0.4 bakım ve doğrulama kaydı

Bu belge ilk bakım aşamasının geçmiş kaydıdır. Sonraki [minimatch düzeltmesi ve 0.0.5 yayın doğrulaması](minimatch-düzeltmesi.md), aşağıdaki eski audit sonucunun yerini alır.

Tarih: 1 Kasım 2026. Bu çalışma bir sürüm yayını veya yeni tam güvenlik taraması değildir. Sağlanan `report.md` raporunda doğrulanmış raporlanabilir açık sayısı sıfırdır. Kaynak bakımına ilişkin değişiklikler bu sonucu yeni açık iddialarına dönüştürmez. Rapordaki kaynak anlık görüntüsünün mevcut çalışma ağacıyla bayt eşitliği ayrıca doğrulanmamıştır.

Bu kayıttaki ilk Linux aşamasından sonra gerçek Windows denetimleri de çalıştırıldı. Güncel sonuçlar [Windows doğrulama kaydındadır](windows-doğrulama.md).

## Uygulanan değişiklikler

- Electron 45.0.0 → 45.2.1; electron-builder 26.15.3 → 26.18.1. Aynı kararlı major serilerinde, tam sürüm sabitlemesi; zorunlu audit fix veya major override yok. Builder `latest` etiketi sorguda 26.18.0, `v26` etiketi 26.18.1 döndürdü; 26.18.1 seçildi. Node.js 24 ile kurulum/derleme değerlendirmesi yapıldı; bu, Windows çalışma zamanı uyumluluğu kanıtı değildir.
- Piksel testi: 230 CSS piksel için en fazla 1 piksel tolerans. Sandbox, contextIsolation, Node erişimi, IPC, CSP ve ağ kontrolü beklentileri gevşetilmedi.
- safeStorage asenkron API'ye geçti. Eski kaydı okuma sırasında dönüştürmez; iptal/kapanış sonrası gecikmiş şifreleme veya açılış işlemi bağlantıyı geri getiremez. Eski şifreli kayıt uyumu daha sonra gerçek Windows sağlayıcısıyla sentetik kayıt üzerinde doğrulandı; ayrıntılar Windows kaydındadır.
- Silme penceresi/README kurtarma kopyası ve eski dış yedeklerde içerik kalabileceğini açıklar. GitHub bağlantısının yerelde kaldırılması, anahtarın uzakta iptali ve en az yetki seçimi birbirinden ayrılır.
- Windows kurulum denetimi ilk kurulum/kaldırma/yeniden kurma ve ana/kurtarma/sentetik kasa korumasıyla genişletildi. ACL gözlemleri ve yükseltilmiş oturum bilgisi ayrı kaydedilir.
- Ayrı fuse adayı, gerçek paket statik denetimi ve yayınsız Windows işi eklendi. Adayın gerçek Windows davranışı geçtikten sonra beş fuse ayarı normal pakete taşındı ve normal paket yeniden doğrulandı.

## Bağımlılık uyarısı ve erişilebilirlik

1 Kasım sorgusunda [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) etkin: kayıt `<11.0.1` sürümlerini kapsıyor; açıklanan mekanizma saldırgan denetimli glob deseni ve `optimizationLevel >= 2` gerektiriyor. Kurulu ana minimatch sürümü 10.2.6; incelenen builder eşleştirme çağrılarında bu seçenek yok, varsayılan 1. Kullanıcı notundan paketleme desenlerine bir akış bulunmadı. Paketleme araçları geliştirici bağımlılıklarıdır; bu değerlendirme güvenilmeyen derleme girdilerinin güvenli olduğu garantisi değildir.

Güncellemeden sonra da `npm audit` 15 orta düzey etkilenen paket kaydı bildiriyor. Bunlar tek minimatch advisory'sinin bağımlılık zincirine yayılmasıdır; 15 bağımsız Notes açığı değildir. Audit'in builder 20.23.1'e düşürme önerisi uygulanmadı. `npm audit --omit=dev` sıfır uyarı verdi; Electron'un yerleşik Chromium/Node çalışma zamanına tam güvenlik denetimi sağlamaz.

Kalan zincirler:

| Üst bağımlılık | Dolaylı paketler | Sonuç |
| --- | --- | --- |
| builder → app-builder-lib → ASAR 3.4.1 | glob 7.2.3 → inflight 1.0.6; minimatch 3.1.5 | Güncel builder 26.x bu zinciri koruyor. |
| builder → app-builder-lib → Squirrel → electron-winstaller → temp | rimraf 2.6.3 → glob | NSIS hedefinde kurulmuş olması çalıştırıldığını kanıtlamaz; desteklenmeyen zincir kaldırılmadı. |
| builder → app-builder-lib → @electron/get → global-agent | boolean 3.2.0 | Üst güncelleme kullanım dışı paketi gidermedi. |
| builder → app-builder-lib ve diğer araçlar | minimatch 10.2.6/9.0.9/5.1.9/3.1.5 | Advisory sürüm eşleşmeleri devam ediyor. |

ASAR 4.x'e veya minimatch 11.x'e zorla geçmek üst araçların API beklentilerini değiştirebilir. Desteklenen üst bağımlılık çözümü olmadan override eklenmedi; uyarı bastırılmadı. Mevcut normal yayın hattındaki audit kapısı bu uyarı nedeniyle kırmızı kalacaktır.

## Bu ortamda elde edilen sonuçlar

| Denetim | Sonuç |
| --- | --- |
| `npm run denetle` | 46 test geçti; 0 başarısız. |
| `npm ci --no-audit --no-fund` | Kilit dosyasından 324 paket ve kurulum betikleriyle temiz kurulum geçti; kullanım dışı dolaylı paket uyarıları kaldı. |
| `npm run denetle:electron` | Linux nedeniyle Windows testi atlanır; geçmiş rapordaki piksel hatası burada yeniden üretilmedi. |
| `npm audit --audit-level=moderate` | Başarısız: 15 orta düzey etkilenen paket, tek advisory. |
| `npm audit --omit=dev` | 0 uyarı; sınırlı kapsam. |
| `npm run paketle:windows:aday:dizin` | Windows x64 uygulama klasörü üretildi. |
| `npm run denetle:paket` | Gerçek aday EXE üzerinde 5 fuse; EXE/ASAR başlık özeti; 11 dosyanın bütünlüğü ve kaynak koduyla eşitliği geçti. |
| Statik denetimin olumsuz örnekleri | Geçici kopyalarda yanlış fuse, değiştirilmiş ASAR başlığı ve değiştirilmiş dosya içeriği statik denetim tarafından reddedildi; Windows çalışma zamanı reddi değildir. |
| İlk doğrudan NSIS denemesi | `spawn wine ENOENT` ile başarısız oldu. Aşağıdaki ek çalışmada ayrı Linux yolu ile üretim tamamlandı. |
| `paketle:windows:linux` / `paketle:windows:linux:aday` | Ağsız konteynerde iki tam NSIS kurulum dosyası ve blockmap üretildi; çıkış kodu 0. |
| Kurulum/kaldırıcı arşivleri | İki kurulum ve içlerinden çıkarılan iki kaldırıcı `7zz t` denetiminden geçti. Gömülü ASAR'lar denetlenen unpacked paketlerle bayt eşit. Bu bir kurulum/kaldırma çalıştırması değildir. |
| PowerShell 7.6.9 ayrıştırıcısı | İki Windows test betiği sözdizimi kontrolünden geçti; bu, Windows çalıştırması değildir. |
| İş akışı YAML / manifest-kilit eşleşmesi / `git diff --check` | Geçti. YAML ayrıştırması GitHub Actions çalıştırması değildir. |
| Windows kurulum/ACL/safeStorage ve bozuk ASAR davranışı | İlk Linux aşamasında çalıştırılamadı; sonrasında temiz Windows Server 2025 üzerinde çalıştırıldı. Ayrıntılar Windows kaydında. |

Statik denetim yapılan EXE SHA-256: `00ed9cc921420416f8b9cf90ca7614ff73607ef76f460a3111dee537137d5303`. ASAR başlık SHA-256: `a338604a1900fdf7aad4ac206c62b0cba30dec013de8b928cc5828935685b558`. Bunlar bu yerel aday çıktısını tanımlar; Authenticode imzası veya yayımlanmış kurulum doğrulaması değildir. Yeniden paketlemede özetler değişebilir.

### İlk Linux aşamasında kurulum üretimini tamamlayan ek çalışma

Normal çıktı `kurulum/Notes.exe`: 121.519.085 bayt, SHA-256 `4c57629d523bac1cefcc0914643140f13a47a01af04ff1cd1759d38ced6882e9`.

Güçlendirme adayı `kurulum/güçlendirme-adayı/Notes.exe`: 121.518.975 bayt, SHA-256 `f593a515c935e35250ec86e808a8f256572050ae21e7edbf5be076996a506757`.

İki dosya da NSIS-3 Unicode arşivi olarak açıldı; kaldırıcılar da NSIS-3 Unicode (Uninstall) olarak test edildi. PE imza tablosu boyutu her ikisinde sıfırdır; yayıncı imzası eklenmedi. Çıktılar yereldir ve yayımlanmadı. Özetler ayrıca `denetim-çıktıları/kurulum-ozetleri.json` dosyasındadır.

Wine araştırması: sistem Wine 10'un 32 bit Linux programı `Exec format error` verdi. electron-builder Wine 11 araç arşivinin SHA-256'sı yerleşik değerle eşleşti; bu ortamda DLL/profil ve 32 bit başlatma aşamaları tamamlanamadı. Tam Wine 11 WoW64 paketiyle 64 bit komut deneyi geçti, 32 bit komut deneyi `ShellExecuteEx failed` ile başarısız oldu. Bunlar gerçek Windows deneyi değildir; 32 bit başarısızlığın bütün nedenleri doğrulanmadı. Karışık Wine sürümleriyle bir ürün dağıtımı hazırlanmadı.

Üretim için `linux-nsis.cjs` eklendi: yalnız Linux'ta, tam 26.18.1 sürümüyle, beklenen NSIS çağrısında vendor'ın mevcut yerel çıkarıcısını kullanır. Kaldırıcının PE başlığı ve çağrı bağlamı doğrulanır; başka Wine işlemleri bu yolla çalıştırılmaz. İç API değişikliği riski sürüm kilidiyle görünür tutulur. Bu Linux yardımcısı uygulama koduna, kurulum kimliğine, veri yoluna veya normal Windows derleme komutuna müdahale etmez. Daha sonraki Windows aşamasında doğrulanan fuse ayarları normal pakete alındı.

Kaynak derlemesi Docker'da `network=none`, kapalı ek yetkiler ve host dizini bağlamadan yapıldı. Açık sistem araçları ayrı bir aşamada hazırlandı; özel kaynaklı derleme konteynerine proxy sertifikası veya erişim anahtarı verilmedi. Ağ erişimli ilk konteyner önerisi otomatik onay denetimince veri aktarımı riski nedeniyle reddedildi; ağsız yöntemle üretim tamamlandı. Çalışan uygulama veya kişisel Windows profili kullanılmadı.

Ek kontrolde 46 birim testi geçti (`node --test --test-isolation=none denetimler/*.denetim.cjs`); yeni derleme betiğinin sözdizimi, manifest/kilit eşleşmesi ve `git diff --check` de geçti. Test sürecinin bu çalıştırma seçimi ürünün Electron sandbox ayarını değiştirmez.

İlk Linux aşamasında Windows işi, kullanıcının yalnız ücretsiz kota koşulu nedeniyle bekletildi. Kullanıcı ücretli aşımı durduran sınırın hazır olduğunu bildirdikten sonra ayrı test dalında yayınsız Windows işleri başlatıldı. Bütçe sınırı artırılmadı, ücretli yeni ortam sağlanmadı. Gerçek sonuçlar ve her çalıştırmanın bağlantısı Windows kaydında tutulur.

## Temiz Windows VM kabul matrisi

Kişisel bilgisayar yerine geri alınabilir temiz Windows 10/11 x64 VM ve yalnız bu test için oluşturulmuş standart kullanıcı hesabı kullanılmalı. Kişisel notlar/PAT kopyalanmamalı. GitHub test betiklerinin ortam korumaları, elle sahte ortam değişkenleri ayarlanarak aşılmamalı; VM'de aşağıdaki adımlar elle uygulanmalı.

1. Boş test hesabında ilk kurulum: yönetici olarak çalıştırmadan kur; UAC/yönetici parola istemini kaydet. Türkçe not oluştur, kapat/aç; otomatik kayıt ve kurtarma dosyasını kontrol et.
2. Ayrı sentetik profilde 0.0.3 kur; not ve kurtarma dosyalarının özetlerini al; kaldırmadan yeni sürümü kur. Notları ve kısayol hedefini kontrol et. Aynı sürümün üzerine kurulumu da dene.
3. Varsayılan kaldırmayı uygula; not/kurtarma dosyalarının ve sentetik kasa baytlarının kaldığını doğrula. Yeniden kur ve notu aç. Kaldırmada özel “veriyi tut” parametresi kullanarak ürünün varsayılanını gizleme.
4. `Get-Acl` ile veri, kurtarma, kasa ve kurulum yollarını incele; ikinci standart Windows hesabından not okuma/değiştirme ve EXE değiştirme girişimlerinin reddedildiğini kontrol et. SYSTEM/yönetici erişimi ayrı yetkidir. ACL listesi tek başına etkin erişim deneyi değildir.
5. `npm run denetle:electron`: gerçek DPAPI sağlayıcısı altında sentetik eski kayıt → asenkron okuma; okurken eski baytların korunması; yeni asenkron kayıt döngüsü. Bu test unpackaged geçici profili kullanır ve GitHub isteği yapmaz.
6. Adayın gerçek açılış/kapanışı; RunAsNode/NODE_OPTIONS engeli; değiştirilmiş ASAR başlığının bütünlük nedeniyle reddi; ASAR yokken alternatif app klasörünün yüklenmemesi. `windows-paket.ps1` bunları geçici hosted Windows hesabında otomatik denemek içindir. Inspector kapalı aday için Playwright bağlantısı açılmamalı veya fuse gevşetilmemelidir.
7. İmza eklenirse `Get-AuthenticodeSignature`, yayıncı ve zaman damgası gerçek installer/EXE üzerinde ayrıca doğrulanmalı. Bu çalışma sertifika veya hizmet satın almaz. SmartScreen/Defender davranışı hakkında sonuç yoktur.

0.2.4 eski kaldırıcı uyumluluk dalı için uygun eski kurulum örneği yoktur; 0.0.3 testi bu dalın kanıtı değildir. Windows Server 2025 sonuçları yukarıdaki Windows 10/11 istemci matrisinin tamamının çalıştırıldığı anlamına gelmez.

## Geri dönüş ve kapsam sınırı

Değişiklikleri çalışma öncesi kaynak kaydı `901b90f` ile dosya bazında karşılaştır. Kullanıcının başka değişikliklerini topluca sıfırlama. Bağımlılık geri dönüşünde `package.json` ve `package-lock.json` birlikte geri alınmalı, temiz kurulum yapılmalı; yeni paket üretmek gerekir. Yeni manifestte eski kilit dosyasını kullanma.

Not depolama biçimi, uygulama kimliği ve `Not Defterim` veri yolu değişmedi. Mevcut şifreli GitHub kaydı okurken yeniden yazılmaz. Kullanıcı yeni bağlantı oluşturursa asenkron biçimin eski Electron tarafından okunacağı henüz doğrulanmadığından eski sürüme dönüşte bağlantıyı yeniden kurmak gerekebilir; notlara bunun için dokunulmaz. Gerçek anahtarlar depoya veya test kanıtlarına eklenmemeli.

Fuse değişikliğini geri almak için `build.electronFuses` alanı önceki yapılandırmaya döndürülüp yeni paket üretilmelidir; mevcut EXE üzerinde fuse yamalama, daha sonra eklenecek imzayı geçersiz kılabilir. Veri şifreleme/temizleme taslağı için [ayrı karar belgesine](veri-koruma-tasarımı.md) bak. Bu özellikler uygulanmadı; geri döndürülemez kullanıcı verisi geçişi yapılmadı. Kaynak değişiklikleri ayrı test dalına gönderildi ve yayınsız denetimler çalıştırıldı; main dalına birleştirme veya sürüm yayını yapılmadı.

Linux derleme uyarlayıcısını geri almak için iki `paketle:windows:linux*` komutu ve `kurulum-kaynakları/linux-nsis.cjs` kaldırılabilir. Standart Windows derleme yolu ve kullanıcı verileri bu geri dönüşten etkilenmez; yerel üretilmiş kurulumlar ayrıca silinebilir.
