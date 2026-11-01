# İkon ve tek tuş güncelleme — 0.0.5 adayı

Logo yeniden çizilmeden, 512 piksel kaynakta 48 piksel civarındaki kenar boşluğu azaltıldı. Dolu alan yaklaşık %81’den %96’ya çıktı. PNG ve 16/20/24/32/40/48/64/128/256 boyutlarında ICO aynı kaynaktan üretildi. Windows ikon önbelleği/pinlenmiş kısayolun yenilenmesi gerekebilir.

Güncelleme bildirimi bir kod gönderimini değil, daha yüksek kararlı GitHub yayını ve geçerli Notes.exe varlığını izler. Uygulama açık, çevrimiçi ve özel depoya bağlıyken yaklaşık dakikada bir kontrol yapılır; cihaz uykudayken anlık teslim garantisi yoktur. Kullanıcı tek Güncelle tıklamasıyla indirir. Dosyanın boyutu ve SHA-256 özeti doğrulanır. Anahtar yalnız API isteğinde kullanılır; GitHub veri sunucularına aktarılmaz. Gizli notlar ağa gönderilmez.

Yardımcı, son kaydın bitip Notes’un normal kapanmasını bekler; işlem zorla öldürülmez. Sessiz kurulum mevcut EXE klasörünü hedefler ve Notes’u yeniden açar. Kişisel not yolu değişmez. Kayıt/indirme hatasında kurulum başlamaz. Yardımcı hazırlığı başarısızsa düzenleyici açık kalır. Yardımcı kurulum hatasını yerel sonuç dosyasına yazar; sonraki açılışta görünür. İşletim sistemi ilkesi PowerShell’i engellerse sessiz güncelleme kullanılamaz. Kullanıcı tarafından makine geneline kurulmuş veya yazılamayan kurulum hedefi için ayrı yükseltme desteği yoktur; standart kullanıcı kurulumu hedeflenir.

İlk geçiş: 0.0.4 ve daha eski uygulamalarda bu kod bulunmadığı için 0.0.5 adayı bir kez elle kurulmalıdır. Sonraki yayımlanmış sürümlerde tek tuş akışı kullanılabilir. Bu çalışma main’e birleştirme/yayın yapmaz. Mevcut minimatch audit kapısı korunur.

## Doğrulama

Yerel birim testleri: 55 geçti. İlk Windows çalıştırması [41310158152](https://github.com/asilhanalpay/Notes/actions/runs/41310158152), kaynak `2b402e1`, paket/ASAR ve gerçek Electron kontrollerinden geçti; yardımcı kurulum sonucu başarısızdı. İlk sonuç ayrıntılı aşama kaydı içermediğinden neden doğrulanmış sayılmaz. Yardımcıya aşama/çıkış kodu kaydı ve Windows PowerShell süreç tanıtıcısının açık tutulması eklendi; yeniden doğrulanıyor. İkinci Windows denemesinde [41310707897](https://github.com/asilhanalpay/Notes/actions/runs/41310707897), kaynak `47ad1ee`, canlı özel yayın indirmesi ve SHA-256 kontrolü geçti. Yardımcı aşama kaydı `ozet / CommandNotFoundException` gösterdi: Windows PowerShell oturumunda Get-FileHash işlevi bulunamadı. Yardımcıda aynı SHA-256 kontrolü doğrudan .NET üzerinden yapılacak şekilde düzeltildi; kurulum/kapanış/yeniden açma yeniden doğrulanıyor. Yayımlanmamış 0.0.5’in canlı yayın bildirimi test edilmiş sayılmaz.

## Sınırlar ve geri dönüş

SHA-256 GitHub’daki yayından gelir; bağımsız yayıncı imzası değildir. Paket hâlâ imzasızdır. Windows 10/11 istemci ve görev çubuğu görüntüsü bu Linux ortamında doğrudan gözlenmedi. Yeni bağımlılık eklenmedi; not biçimi veya şifreleme biçimi değiştirilmedi. Geri dönüşte bu özelliğin kaynak değişiklikleri ve iki ikon dosyası önceki test dalı kaydı d715c7b4 ile dosya bazında geri alınabilir; package.json ve kilit sürümü birlikte geri alınmalıdır. Kullanıcı notları sıfırlanmamalıdır.
