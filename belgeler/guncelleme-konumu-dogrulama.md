# Güncelleme ve kurulum konumu — 2 Kasım 2026

**0.0.7 hazırlığı:** aşağıdaki kayıt `e205eea` adayının doğrulamasını anlatır. Başlatma düzeltmesi 0.0.7 kaynaklarına dahil edilmiştir. Yeni paket denetimi, üretilen kurucuyla kurulan uygulamanın kendi ASAR'ındaki `kurulumHazirla().baslat()` yolunu gerçek Electron'da çalıştırır. Bu ek paket denetiminde yalnız ağ cevabı yerel kurucu fikstürüdür; aşağıdaki canlı indirme testinin yerine geçmez. Güncel yayın durumu [0.0.7 sürüm sayfasından](https://github.com/asilhanalpay/Notes/releases/tag/v0.0.7) doğrulanabilir. Aşağıdaki “henüz yayımlanmadı” ifadeleri önceki aday kaydının durumudur.

**Sonuç:** yayımlanmış güncelleme kodunun gerçek Electron altında başlatma hatası doğrulandı. Çalışma dalındaki düzeltmeyle varsayılan ve özel kişisel kurulum klasörlerinde gerçek 0.0.5 → 0.0.6 yükseltmesi geçti. Düzeltme henüz ana dala alınmadı, yeni bir kurulum dosyası olarak paketlenmedi veya yayımlanmadı. Yayımdaki 0.0.6 dosyası değiştirilmedi.

Bu sonuç bir işlev hatasıdır; yeni bir uygulama güvenlik açığı olarak sınıflandırılmadı.

## Doğrulanan sorun ve değişiklik

Önceki test, yardımcı PowerShell betiğini testin kendisinden başlatıyordu. Yeni test, güncelleme modülünün kendi `kurulumHazirla().baslat()` yolunu da çalıştırdı. Yayımlanmış 0.0.5 ASAR'ındaki kod, gerçek Electron ana sürecinde indirmenin ardından PowerShell'i doğrudan `detached: true` ile açtığında yardımcı sıfır çıkış koduyla kapandı; hazır işareti oluşmadı ve kurulum başlamadı. Aynı hedef Notes sürecine ayrı Windows sorgusu erişebildi. Bu durum [41534448465](https://github.com/asilhanalpay/Notes/actions/runs/41534448465) çalıştırmasında kaydedildi. Ana daldaki 0.0.6 başlatma kodu da aynıydı. Bu, her Windows makinesinde aynı hatanın gözlendiği anlamına gelmez.

`masaüstü/güncelleme.cjs` artık kısa bir PowerShell başlatıcısı üzerinden Windows `Start-Process -WindowStyle Hidden` ile asıl yardımcıyı açıyor. Başlatıcının sıfır koduyla çıkması başarı kabul edilmiyor: gerçek yardımcı hazır işaretini yazmadan Notes kapanmıyor. Başlatıcı ve uygulama kapandıktan sonra yardımcı normal kapanışı bekleme ve kurulum işini sürdürüyor. PowerShell yürütme ilkesi atlanmadı, yönetici yükseltmesi eklenmedi.

Hedef hâlâ çalışan uygulamanın EXE klasöründen türetilir. Yardımcı `/S --updated /currentuser /D=<mevcut klasör>` ile kurar; `/D` son parametredir. Kullanıcıya yeni klasör seçimi gösterilmez. Not yolu `%APPDATA%\Not Defterim` olarak kalır. İndirilen `guncellemeler\paket-*\Kurulum.exe` geçici önbellektir; kurulu uygulamanın konumu değildir ve başarılı kurulumda kaldırılır. Küçük sonuç dosyası ve boş paket klasörü kalabilir.

## Başarılı Windows kanıtı

[41536057756](https://github.com/asilhanalpay/Notes/actions/runs/41536057756), test kaynağı `e205eea88e203983bff92700630d5faf73a29de5`, Windows işi `125588055051`: **başarılı**. Temiz GitHub-hosted Windows Server 2025, `windows-2025-vs2026`, NT 10.0.26100.0. Test, aynı geçici hesapta yönetici yetkileri kaldırılmış SAFER belirteciyle çalıştı. Yalnız sentetik not/kurtarma/kasa dosyaları kullanıldı. Ürün erişim anahtarı kaydedilmedi; indirmede işe özel salt okunur GitHub token'ı kullanıldı.

| Kontrol | Varsayılan klasör | Özel klasör |
| --- | --- | --- |
| Kurulum yolu | `%LOCALAPPDATA%\Programs\Notes` | `%LOCALAPPDATA%\Notes Güncelleme Denetimi\Özel klasör 'İğdır'\Notes` |
| Başlangıç ve sonuç ASAR sürümü | 0.0.5 → 0.0.6 | 0.0.5 → 0.0.6 |
| Normal kapanışı bekleme | Geçti | Geçti |
| Aynı EXE yolunda yeniden açılma | Geçti; tek ana pencere | Geçti; tek ana pencere |
| Windows kurulum kaydı | Aynı kayıt kimliği, tek kayıt | Aynı kayıt kimliği, tek kayıt |
| Masaüstü ve Başlat menüsü kısayolları | İkisi de aynı EXE | İkisi de aynı Unicode EXE yolu |
| Ana not, kurtarma ve sentetik kasa SHA-256 | Değişmedi | Değişmedi |
| Geçici kurulum EXE'sinin temizlenmesi | Geçti | Geçti |
| Varsayılan yerde ikinci Notes.exe | Tek varsayılan kurulum | Oluşmadı |
| Senaryo sonrası kaldırmada notların korunması | Geçti | Geçti |

Kurulum kaydı kimliği `CurrentUser/Registry64/8b4edf87-c4b7-5866-9b2f-9ccc2f292fa0` olarak kaldı; görünen ad `Notes 0.0.5` yerine `Notes 0.0.6` oldu. HKCU ve HKLM kaldırma kayıtları tarandı; HKCU'nun ortak 32/64 bit görünümü iki kez sayılmadı. Renderer/GPU alt süreçleri ikinci uygulama olarak sayılmadı.

Kısayol denetimi `IShellLinkW` ile Unicode yolu okur ve beklenen EXE yoluyla `OrdinalIgnoreCase` karşılaştırır. Aynı kısayol için WScript.Shell, Türkçe `İğdır` bölümünü `Igdir` olarak döndürürken Windows'un Unicode arayüzü doğru yolu döndürdü. Bu yanlış negatif, konum beklentisi gevşetilmeden testte giderildi. Kısayol dosyaları da kanıt paketine alındı.

Testte kullanılan **kurucular yayımlanmış 0.0.5 ve 0.0.6'dır**. Başlatma düzeltmesi, ayrı geçici Electron sürücüsünde çalışma dalından yüklenmiştir; gerçek kurulu Notes süreci hedeflenmiş, eski ASAR'daki yardımcı betik aynen kullanılmıştır. Test, yayımdaki 0.0.6'nın kendiliğinden düzeldiğini veya yeni düzeltilmiş bir EXE üretildiğini göstermez.

- 0.0.5 kurucu SHA-256: `b07e9f52cc42c72fb2eb74b29a5c388d1845f779791a563feeff2320f21573ed`.
- Gerçek API indirmesiyle kurulan 0.0.6, varlık `703221193`, SHA-256: `a2638a83718a07943e6708aef6d7e7941ce9f4ffc2d5d6dd06b0292d9c6af7f5`. Boyut ve özet ürün indiricisi tarafından doğrulandı.
- [Kanıt paketi](https://github.com/asilhanalpay/Notes/actions/runs/41536057756/artifacts/13184527139), ZIP SHA-256: `3750ea8354855ecc0130d58fef2bd17a7acb7d239f674055cc4fcf843482537f`. İndirilip özeti ayrıca doğrulandı. GitHub saklama sonu: 16 Kasım 2026 22:20 UTC.
- Yerel kanıt: `denetim-çıktıları/guncelleme-konumu-son/windows-guncelleme-konumu.json` ve aynı klasördeki ZIP/günlük/kısayol dosyaları.
- Güncelleme birim dosyası doğrudan çalıştırılarak **7/7 test** geçti; sözdizimi ve `git diff --check` geçti. İlk yerel `npm run denetle` de başarılı bitti; bu değişikliğe ait yeni tam Windows paket/fuse/ASAR veya tüm Electron arayüz denetimi sonucu olarak sunulmaz.

## Başarısız denemeler

| Çalıştırma | Sonuç / değerlendirme |
| --- | --- |
| [41530955135](https://github.com/asilhanalpay/Notes/actions/runs/41530955135) | Test yalnız `Notes` adlı kayıt aradı; NSIS'in sürüm içeren adını tanımadığı için durdu. Test beklentisi düzeltildi. |
| [41531336085](https://github.com/asilhanalpay/Notes/actions/runs/41531336085), [41532038126](https://github.com/asilhanalpay/Notes/actions/runs/41532038126) | Node sürücüsünde yayımlanmış yardımcı hazır olmadı. Tanılama toplandı; tek başına gerçek Electron kanıtı sayılmadı. |
| [41532907254](https://github.com/asilhanalpay/Notes/actions/runs/41532907254) | Yalnız `detached: false` adayı hazır aşamasını geçti, kurulum sonucu yazılmadı. Bu aday geri alındı; mevcut son düzeltme farklıdır. |
| [41534068344](https://github.com/asilhanalpay/Notes/actions/runs/41534068344) | Electron geliştirme ikilisi ilk kullanıma kadar indirilmediğinden sürücü bulunamadı. Ortam hazırlığı düzeltildi. |
| [41534448465](https://github.com/asilhanalpay/Notes/actions/runs/41534448465) | Değiştirilmemiş yayımlanmış kodun gerçek Electron altında hazır olmadan çıkması doğrulandı. |
| [41535215499](https://github.com/asilhanalpay/Notes/actions/runs/41535215499) | Son başlatıcıyla varsayılan konumda tüm yükseltme kontrolleri geçti; özel konum ilk kurulumunda WScript'in karakter dönüşümü denetimi durdurdu. Genel çalışma başarısızdır. Unicode denetimi sonraki koşuda iki konumu da doğruladı. |

## Dosyalar, sınırlar ve geri dönüş

Ürün değişikliği yalnız `masaüstü/güncelleme.cjs` içindeki başlatmadır. Yeni `denetimler/windows-guncelleme-konumu.cjs` ve `.ps1`, mevcut standart kullanıcı sarmalayıcısındaki seçim ve `.github/workflows/guncelleme-konumu.yml` testi çalıştırır. İş akışı yalnız `contents: read` iznine sahip, 20 dakika sınırlı ve yayın işi içermez. Ek hizmet veya ücretli kapasite açılmadı; kullanıcının ücretsiz kota sonrası harcamayı durduran sınırın hazır olduğuna ilişkin mevcut onayı kapsamında standart hosted Windows kullanıldı.

Sandbox, contextIsolation, IPC gönderen doğrulaması, CSP, ağ izinleri, fuse ayarları ve ASAR bütünlük ayarları değiştirilmedi. Şifreleme/veri biçimi göçü yapılmadı. Sentetik kasa işareti bir dosya koruma testidir; yeni bir gerçek parola/şifreleme uyumu testi değildir.

Bu çalışma kişisel, yönetici gerektirmeyen kurulum içindir. Tüm kullanıcılar için kurulum, Program Files yükseltmesi, Windows 10/11 istemci ve kullanıcının kendi bilgisayarı test edilmedi. Güncelleme düğmesinden gerçek kişisel GitHub anahtarıyla başlayan bütün arayüz akışı kesintisiz otomasyonla çalıştırılmadı; canlı indirme, gerçek yardımcı/kurucu/yeniden açılma sınandı ve ana süreçteki mevcut EXE bağlantısı koddan incelendi. Yeni düzeltilmiş kurucunun paketlenmesi ve test edilmesi yayın öncesinde ayrıca gerekir.

Eski sürümlerin kendi başlatıcısı bu testte başarısız olduğundan, düzeltmenin eski otomatik güncelleyiciyle ilk kez ulaştırılması doğrulanmış değildir. İlk düzeltilmiş sürüme geçişte bir kez elle, mevcut kurulumun üzerine kurulum gerekebilir. Yeni sürüm henüz yayımlanmadı.

Ana dal tabanı `626d6af2cd90ea726db6865827ad39052db4a4d7`, çalışma dalı `codex/guncelleme-konumu-20261102`. Yayın/kurulu uygulama değişmediğinden kullanıcı tarafında geri dönüş işlemi yoktur. Kaynak düzeltmesi geri alınacaksa yalnız `masaüstü/güncelleme.cjs` ana dal tabanındaki sürümüne dosya bazında döndürülür; bu eski başlatma hatasını da geri getirir. Not klasörü, kurtarma dosyaları veya erişim kasası silinmez.
