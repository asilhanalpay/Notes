# Gerçek Windows doğrulaması

Bu belge 0.0.4 bakım aşamasının kaydıdır. Sonraki ikon ve 0.0.5 tek tuş güncelleme sonuçları [ayrı kayıttadır](tek-tuş-güncelleme.md).

1 Kasım 2026. Bu kayıt, mevcut Notes 0.0.4 güvenlik raporuna dayalı bakımın gerçek Windows denemelerini açıklar. Yeni tam güvenlik taraması veya yayın onayı değildir. Raporda doğrulanmış uygulama açığı bulunmadığı sonucu yeni varsayımsal açık iddialarına dönüştürülmedi.

## Ortam ve sınırlar

- Her çalıştırmada temiz GitHub-hosted Windows Server 2025 Datacenter x64, Windows sürümü 10.0.26100; Node.js 24, Electron 45.2.1, electron-builder 26.18.1.
- Kullanıcı ücretsiz kota sonrası harcamayı durduran sınırın hazır olduğunu bildirdi. Bu koşulla standart hosted işler çalıştırıldı; bütçe değiştirilmedi veya ayrı ücretli Windows hizmeti açılmadı. Bağlı araçlardan bağımsız fatura doğrulaması yapılmadı.
- Test dalı: `codex/windows-denetimi-20261101`. İş akışının yalnız depo okuma yetkisi var; yayın işi yok. Main dalına birleştirme yapılmadı.
- Yalnız sentetik notlar ve erişim işaretleri kullanıldı. Kripto denemesi gerçek Windows sağlayıcısıyla üretilen sentetik anahtarı kullanır; GitHub'a anahtar göndermez. Kişisel veri veya mevcut kullanıcı profili kopyalanmadı.

## Çalıştırmalar

| Çalıştırma | Sonuç |
| --- | --- |
| [41305577655](https://github.com/asilhanalpay/Notes/actions/runs/41305577655), `9b3e8c6` | 46 birim testi, gerçek Electron/safeStorage ve paket davranışı geçti. Kurulum testi ortak CI geçici klasörünün izinlerini reddetti. Audit de başarısız. |
| [41306029915](https://github.com/asilhanalpay/Notes/actions/runs/41306029915), `e5a37d6` | Kurulum hedefi kullanıcının `LocalAppData/Programs/Notes` konumuna taşındı. Yönetici yetkisi kaldırılmış süreçte ilk kurulum, yükseltme, kaldırma/yeniden kurma ve ACL denetimi geçti. Yalnız audit kırmızı. |
| [41306525147](https://github.com/asilhanalpay/Notes/actions/runs/41306525147), `3851864` | Yukarıdakilere ek olarak ayrı standart hesabın sekiz dosya erişim deneyi geçti. Test edilen aday Windows kurulumu saklandı. Yalnız audit kırmızı. |
| [41307027428](https://github.com/asilhanalpay/Notes/actions/runs/41307027428), `b468b39` | Doğrulanan beş fuse normal yapılandırmaya taşındı; normal Windows paketiyle aynı testler tekrar geçti. Yalnız audit kırmızı. |
| [41307557486](https://github.com/asilhanalpay/Notes/actions/runs/41307557486), `9f29f39` | İlk kontroller geçti. Ayrı hesabın kendi kurulum deneyi, test sürecinin başlatan hesabın profil ortamını devralması yüzünden durdu; erişim reddi ürün açığı olarak yorumlanmadı. |
| [41308037215](https://github.com/asilhanalpay/Notes/actions/runs/41308037215), `5b1b7ac` | SID üzerinden ayrı profil ortamı düzeltildi. Ayrı standart hesabın kendi profilinde kurulum, yeniden kurma ve notları koruyan kaldırması dahil bütün işlev testleri geçti. Yalnız minimatch audit kırmızı. |

Son çalıştırmada doğrulanan kaynak SHA: `5b1b7aca93b5c7492293c687d1f9c108c39e5afa`. Bu belgenin sonraki güncellemesi yalnız belge değişikliğidir.

## Doğrulanan davranışlar

1. **Kaynak ve gerçek Electron:** 46 birim testi ve 1 birleşik gerçek Electron testi geçti. Sandbox, contextIsolation, kapalı Node.js erişimi, yetkisiz IPC göndereni, geçersiz veri, ağ engeli, gezinme/yeni pencere engeli ve kayıt/kapanış davranışı korunuyor. Piksel toleransı yalnız 230 CSS piksel ölçümündedir.
2. **Gerçek Windows kriptosu:** Sentetik erişim anahtarı eski senkron `safeStorage.encryptString` biçiminde üretildi; asenkron API ile okundu. Okuma eski kaydın baytlarını değiştirmedi. Yeni asenkron kayıt da açıldı. Bu, mevcut kullanıcıya ait gerçek bir anahtarın okunması veya bütün eski Electron sürümlerinin ayrı ayrı denenmesi değildir. Not dosyaları şifrelenmedi.
3. **Windows NSIS üretimi:** Normal Windows derleme komutu gerçek Windows üzerinde çalıştı. Linux yerel NSIS uyarlayıcısı bu Windows yolunda kullanılmadı. Kurulumun Authenticode durumu `NotSigned`; imzalama satın alınmadı.
4. **Paket güçlendirmesi:** Gerçek EXE fuse değerleri ve gömülü ASAR özeti/dosya bütünlükleri geçti. Sağlam paket açılıp normal kapandı; `ELECTRON_RUN_AS_NODE` ve `NODE_OPTIONS` işaret dosyasını çalıştırmadı. Başlığı değiştirilmiş ASAR, bütünlük hatasıyla reddedildi. ASAR yokken alternatif `resources/app` kodu çalışmadı. Node inspector argümanı fuse değeri statik olarak kapalı doğrulandı; ağa açık inspector port taraması yapılmadı.
5. **Kurulum yaşam döngüsü:** Yönetici yetkileri SAFER NormalUser belirteciyle kaldırılmış CI hesabında ilk kurulum, aynı sürüm üzerine kurma, 0.0.3'ten kaldırmadan yükseltme, kaldırma/yeniden kurma ve masaüstü kısayolu doğrulandı. Açık uygulama zorla kapatılmadan kurulum reddedildi. Not, kurtarma ve sentetik kasa dosyaları hash karşılaştırmalarıyla korundu. Kasa koruma işareti gerçek token değildir; şifreleme uyumu ayrı kripto denemesindedir. Ayrıca Administrators grubunda olmayan, ayrı ve geçici bir standart hesap kendi profilinde ilk kurulum, aynı sürümü yeniden kurma ve notu koruyan kaldırmayı geçti. Bu hesap için başlatan sürecin ortamı yerine SID kayıt defteri girdisinden bulunan profil kullanıldı; ürünün veri yolları veya ACL'leri değiştirilmedi.
6. **İzinler:** Not/veri ve uygulama konumlarında sahip kullanıcı, SYSTEM ve yöneticiler dışında izin görülmedi. Ayrı, yönetici olmayan geçici Windows hesabından üç veri dosyasının okuma/yazma ve uygulama EXE'sinin okuma/yazma denemeleri reddedildi. Uygulama EXE'sine okuma izni tek başına açık sayılmaz; test gizli veri erişimini ve yetkisiz yazmayı ayırır. Testi geçirmek için ürün/veri ACL'leri değiştirilmedi.

İlk ortak klasör hatası ürün açığı olarak raporlanmadı: test, ortak CI geçici klasörüne kurulum yapıyordu. Güncel test gerçek kullanıcı kurulum konumunu kullanır. Not dosyalarına yönelik gizlilik kontrolü, uygulamaya yönelik yazma kontrolü ve Electron güvenlik beklentileri korunur.

## Kanıtlar ve geri dönüş

Her çalıştırmanın `Guclendirme-adayi-denetimleri` çıktısı test JSON'larını, ACL'leri, normal kullanıcı sonucu ve günlükleri içerir. `Notes-Windows-test` yalnız işlev denetimleri geçtikten sonra yüklenir ve 1 gün saklanır; özel test çıktısıdır, GitHub sürüm yayını değildir. Sonraki paketleme dosya özetlerini değiştirebilir; özet ve kaynak SHA `windows-kurulum-paket.json` içindedir.

Son normal Windows kurulumunun kanıtları:

- İşlev denetimlerinin tamamı geçti; iş akışı `npm audit` nedeniyle **başarısız** sonuçlandı. Başarılı bütün iş akışı iddiası yoktur.
- Kurulum: `Notes.exe`, 121.519.040 bayt; SHA-256 `73de2faa0dda01868df918886a6422b24a971aa1ca1b52604cac41ee5efe26e3`; Authenticode `NotSigned`.
- [Windows kurulum çıktısı](https://github.com/asilhanalpay/Notes/actions/runs/41308037215/artifacts/13084177723): ZIP SHA-256 `9c125006dd3b4e2b52319dea51fae488fa30d5504c2b4a295b290eaace040b78`; GitHub saklama sonu 2 Kasım 2026 12:51 UTC. Çalışma alanındaki doğrulanmış kopya `kurulum/Notes-Windows-test.exe` adındadır; eski Linux çıktısıyla karıştırılmamalı.
- [Denetim kanıtları](https://github.com/asilhanalpay/Notes/actions/runs/41308037215/artifacts/13084117996): ZIP SHA-256 `522c76caab8831108617ba60611d08171207161e0a1498cb3dea45151cc87b77`; saklama sonu 15 Kasım 2026 12:51 UTC. Yerel kopyaları `denetim-çıktıları/windows-son/` altındadır.
- `windows-yetki.json`: yönetici belirteci yok, yönetici gerektirmeyen yaşam döngüsü başarılı. `windows-diger-hesap.json`: ayrı hesap yönetici değil, `standartHesapKurulumu: true`, sekiz dosya erişimi reddedildi. `windows-paket.json`: gerçek paket davranışı başarılı. Arşiv ve kurulum özetleri indirdikten sonra ayrıca doğrulandı.

Normal yapılandırmada `RunAsNode`, Node ortam seçenekleri ve Node inspector argümanları kapalıdır; `OnlyLoadAppFromAsar` ve gömülü ASAR bütünlük doğrulaması açıktır. Cookie/snapshot gibi diğer fuse seçenekleri varsayılan bırakıldı; bunlar not şifrelemesi olarak sunulmaz. Geri dönüş, `build.electronFuses` değişikliğini geri alıp paket üretmektir. Not biçimi, kurulum kimliği ve veri yolu değişmedi.

## Kalanlar

- Audit, tek minimatch advisory'sinin bağımlılık zincirindeki 15 orta düzey etkilenen kaydı nedeniyle başarısızdır. Bu, 15 doğrulanmış Notes uygulama açığı değildir. Uyarı bastırılmadı, major override/force fix yapılmadı; normal yayın kapısı hâlâ başarısız olur.
- Windows 10/11 istemci sistemleri ve etkileşimli kurulum sihirbazının bütün seçenekleri ayrıca denenmedi. Bu kayıt Windows Server 2025 ve sessiz kurulum akışının kanıtıdır. Yükseltme örneği 0.0.3'tür; 0.2.4 özel kaldırıcı dalı için örnek yoktur.
- Yayıncı imzası/zaman damgası ve SmartScreen sonucu yoktur. ASAR kontrolü imzalı dağıtımın veya işletim sistemi hesap güvenliğinin yerini tutmaz.
- Hassas not şifrelemesi ve kurtarma kopyasını temizleme yalnız [tasarım](veri-koruma-tasarımı.md) düzeyindedir; veri geçişi/temizleme uygulanmadı. Yeni asenkron kaydın eski uygulamayla geri okunması garanti edilmedi; sürüm geri dönüşünde GitHub bağlantısını yeniden kurmak gerekebilir.
