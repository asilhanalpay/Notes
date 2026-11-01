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
- Yeni tam birim sayısı 62'dir. Gerçek Windows ve yayın sonuçları bu kaydın sonuna eklenecektir; henüz bu yeni bağımlılık zinciriyle Windows/yayın tamamlandı sayılmaz.

## Geri dönüş

Yayın öncesi bilinen aday kaynak 4cbfe9037a61d8f848f1da93e9aaa947dcc3708b. Geri dönüşte manifest/kilit ve derleme köprüsü çağrıları birlikte geri alınır; temiz kurulum/yeni paket gerekir. Kullanıcı notlarına dokunulmaz. Eski zincire dönüş bilinen audit uyarısını geri getirir; bu kapı kapatılmamalıdır. Uygulama veri biçimi değişmedi.
