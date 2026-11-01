# Minimatch düzeltmesi ve 0.0.5 yayın doğrulaması

1 Kasım 2026. Sağlanan uygulama denetiminin sıfır doğrulanmış açık sonucu korunur. Bu çalışma derleme bağımlılığı GHSA-g3hv-75wg-m249 uyarısını giderir; yeni uygulama açığı iddiası değildir.

## Kaynak ve sınır

[GitHub advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), `<11.0.1` sürümlerini etkilenmiş kabul eder. Anlatılan sorun saldırgan denetimli örüntü ve `optimizationLevel >= 2` ile ilk aşama örüntü çoğalması ve sonraki ikili karşılaştırmadır. [Üst kaynak düzeltmesi](https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8) örüntü sayısını sınırlar ve büyük kümelerde ikili taramayı atlar.

Notes not metninden bu derleme eşleştiricisine veri akışı bulunmadı. Paketleme örüntüleri geliştiricinin build.files ayarından gelir. Bağımlılıklar geliştirici kapsamındadır ve uygulamaya alınmaz.

## Değişiklik

- Sabitlenmiş resmi minimatch 11.0.3 doğrudan geliştirici bağımlılığıdır. `overrides.minimatch: "$minimatch"` bütün eski kopyaları aynı düzeltilmiş sürüme yönlendirir. Sürüm veya paket adı sahte biçimde değiştirilmez; audit istisnası yoktur.
- Bu kontrollü major geçiş körlemesine yapılmadı: ASAR3/dir-compare callable varsayılan dışa aktarım, glob7 ise RegExp benzeri String.match segmentleri ister. `kurulum-kaynakları/minimatch-uyumu.cjs` yalnız Node derleme sürecinde bu çağrı biçimlerini korur. Segmentler RegExp'e çevrilmez; resmi özyinelemesiz Matcher.test kullanılır. Windows FileList örüntülerinin ayırıcıları uyarlanır; açık escape seçenekleri korunur.
- Node `--require` ile gerçek electron-builder CLI'si çalıştırılır. NODE_OPTIONS, uygulama fuse'ları veya renderer ağ/IPC yetkileri değiştirilmez. Linux NSIS ve statik paket denetimi de aynı hazırlığı kullanır. Yardımcı kaynaklar uygulama ASAR'ına alınmaz.
- Electron/builder sürümleri 45.2.1/26.18.1 olarak kalır; alpha builder'a geçilmedi. Üst paketler minimatch11'i henüz kendi aralıklarında ilan etmiyor; köprü ve uyumun bakım sorumluluğu bu depodadır. Üst zincirler düzeltildiğinde override/köprü kaldırılıp tekrar doğrulanmalıdır. Desteklenen derleme girişi npm paketleme komutlarıdır; bunları atlayan doğrudan npx builder/asar girişleri bu köprüyü yüklemez.

Değişen dosyalar: package.json, package-lock.json; yeni minimatch-uyumu.cjs ve minimatch.denetim.cjs; linux-nsis.cjs ve paket.cjs hazırlık çağrıları. Yayın audit adımı değiştirilmedi.

## Doğrulama

- Önce: minimatch10.2.6, on adet **/../a/b örüntüsü, optimizationLevel2 ve braceExpandMax64 ile 1.024 örüntü oluşturdu. Deneme 3 saniye/256 MB sınırlandırılmış alt süreçteydi.
- Sonra: aynı kontrol 64'te durur; ikinci örüntü sınıfı 32 sınırında durur. 1.001 girdili kümede ikinci aşamanın ikili karşılaştırmaya girmediği doğrulanır.
- Yedi odaklı test; gerçek glob7/filelist, ASAR glob/unpack, dir-compare ve builder'ın kaynak dosyası sınırlarını denetler. Dot/Unicode/extglob/defaults ve Windows ayırıcı/escape kontrolleri vardır. İlk yalnız callable köprü glob7'nin Matcher farkını kaçırdı; gerçek tüketici testleri bunu yakaladı. Bağımsız incelemenin Windows FileList hatası da düzeltildi.
- Kilitte tek minimatch11.0.3; bütün altı tüketici aynı modülü çözer. npm audit --audit-level=moderate sıfır bulgu verdi. Temiz npm ci geçti; diğer kullanım dışı dolaylı paketlerin uyarıları kaldı.
- 62 birim ve 1 gerçek Electron testi temiz Windows Server 2025 x64 üzerinde de geçti. [41314078270](https://github.com/asilhanalpay/Notes/actions/runs/41314078270), doğrulanan kaynak `5fa654d869f6b35232d54fb4a69cab83a4954fc8`, başarıyla tamamlandı. Audit sıfır bulgu; NSIS üretimi; gerçek fuse/ASAR davranışı; canlı özel yayın indirmesi; standart yetkide sessiz güncelleme/normal kapanış/yeniden açma ve veri koruma; 0.0.3 yükseltmesi; ayrı standart hesabın kurulum/izin deneyleri geçti.
- [Kanıt arşivi](https://github.com/asilhanalpay/Notes/actions/runs/41314078270/artifacts/13085484907) ZIP SHA-256: `ffec14dd44bb79b6259622419c845e2b759e914d814c7ddf65ee8a5269e584e3`. Bu adayın kurulum çıktısı ayrı ZIP kimliği 13085599438; son yayımlanan EXE, main üzerindeki yeniden doğrulanan üretimden gelir ve özeti değişebilir.
- Yayın hattı artık oluşturduğu gerçek EXE/ASAR davranışını da zorunlu olarak sınar. Npm audit --audit-level=moderate adımı olduğu gibi korunur; advisory istisnası veya continue-on-error eklenmedi.
- Yayının güncel durumu [PR6](https://github.com/asilhanalpay/Notes/pull/6), [normal iş akışı](https://github.com/asilhanalpay/Notes/actions/workflows/windows-kurulum.yml) ve [v0.0.5 sürüm kaydından](https://github.com/asilhanalpay/Notes/releases/tag/v0.0.5) izlenir. Yayın yalnız main denetimleri geçtikten sonra normal iş akışıyla yapılır.

Atlanan kapsam: Windows 10/11 istemci görseli ve macOS/universal paketlemesi bu Windows yayınının doğrulaması değildir. İsteğe bağlı Linux NSIS yardımcısının yeni bağımlılıkla tam arşiv üretimi yeniden çalıştırılmadı; hazırlık kodu ve Linux'taki gerçek API tüketicileri sınandı. Paket hâlâ yayıncı imzasızdır. Npm audit sonucu Electron içine gömülü tüm Chromium/Node kodunun güvenlik sertifikası değildir.

## Geri dönüş

Yayın öncesi bilinen aday kaynak 4cbfe9037a61d8f848f1da93e9aaa947dcc3708b. Geri dönüşte manifest/kilit ve derleme köprüsü çağrıları birlikte geri alınır; temiz kurulum/yeni paket gerekir. Kullanıcı notlarına dokunulmaz. Eski zincire dönüş bilinen audit uyarısını geri getirir; bu kapı kapatılmamalıdır. Uygulama veri biçimi değişmedi.
