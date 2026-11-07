# İlk kurulum, tema ve güncelleme incelemesi — 7 Kasım 2026

Başlangıç kaynağı 8c78e0ca0fd2dc37636e5a98ce1a89df0fb52e94, yayımlanmış sürüm 0.1.0. Önceki güvenlik raporunda raporlanabilir uygulama açığı yoktu; aşağıdaki davranış farkları ürün/bakım konusudur.

| İstek | 0.1.0 kaynağındaki durum | 0.1.1 adayında değişiklik |
| --- | --- | --- |
| İlk kurulum | Türkçe, kullanıcı başına NSIS; sessiz yaşam döngüsü/izin testleri vardı. Görünen sihirbaz kontrol edilmiyordu. | Kurulum öncesi gerçek NSIS sayfalarının standart yetkiyle metin/konum ve ekran görüntüsü denetimi. Gerçek ilk dosya yerleştirme sessiz testte ayrıca yapılır. |
| Temaya uygun kenar | Arayüz ve Windows aktif kenarı siyaha sabitlenmişti. | Açık #d0d0d0, koyu #202020; nativeTheme ve arka plan korunur. Tema değişimi ve sonraki açılış gerçek Electron testinde doğrulanır. |
| Hızlı yeni sürüm bildirimi | İlk denetim 10 saniye, periyodik 15 dakika; Yeni sürümler yalnız pencere açıyordu. | İlk denetim 1 saniye, periyodik 3 dakika, odak dönüşünde süreye bağlı denetim ve pencere açıldığında elle denetim. Bilinen bildirim yeniden kontrol sırasında kaybolmaz. |
| Aynı kurulum konumu | Hedef gerçek Notes.exe dizininden alınır; /S --updated /currentuser /D ile sessiz kurulur. | Ürün kurulum yolu değiştirilmez. Güncel adayın kendi ASAR kodu varsayılan/özel dizinde aynı sürüme yerinde güncelleme ve tek uygulama/kayıt/kısayol için sınanır. Önceki v0.0.3 → aday yükseltme testi de korunur. |

Kontroller yalnız sentetik profiller ve geçici hosted Windows'ta yapılır. Pencere/IPC yalıtımı, CSP, ağ kısıtları, depo/varlık kimliği ve dosya özeti doğrulamaları gevşetilmez. Not dosya biçimi/depolama yolu ve uygulama kurulum kimliği değişmez. Bağımlılık güncellemesi yoktur. Aday ayrıca onay alınmadan yayımlanmaz.

Ücretsiz ve anahtarsız GitHub erişimi gerçek zamanlı yayın bildirimi sunmaz. Ağ, ortak IP kotası, 403/429 bekleme süreleri ve uyku durumunda anında veya kesin üç dakika içinde bildirim garantisi yoktur. İstek sınırı geldiğinde bekleme korunur. Dijital imza/SmartScreen ve her fiziksel Windows 10/11 cihazının görünümü bu değişiklikle garanti edilmez. Özel ACL, ağ diski ve tüm kurumsal kurulum çeşitleri test edilmiş sayılmaz.

Geri dönüş: bu adayın kaynak/test/iş akışı/manifest dosyaları temel kaynakla karşılaştırılarak geri alınabilir. Notlara, kurtarma dosyalarına ve dış TXT dosyalarına dokunulmaz. Eski sürüm bildirim aralığına ve siyah kenara dönülür. Yayınlanmış sürüm dosyaları değiştirilmez.

Sonuçlar ancak tamamlanan Windows çalışmasının kaynak SHA’sı ve kanıtlarıyla raporlanır; önceki sürümün başarılı testleri bu yeni kodun kanıtı sayılmaz.
