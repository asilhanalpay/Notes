# 0.0.6 adayı — açık notu TXT olarak kaydetme

Kullanıcının seçimi: iki işlem de açık notu .txt olarak kaydeder; tüm notlar JSON yedeği değildir.

- Farklı kaydet: sistemin kaydet penceresi kullanıcıdan konum alır. Açık notun başlığı ve gövdesi UTF-8, Windows satır sonlarıyla yazılır. Vazgeçildiğinde dosya yazılmaz. .txt dışındaki uzantılar reddedilir; onaylanan yola sonradan başka uzantı eklenmez.
- Kaydet ve klasörü aç: `%APPDATA%\Not Defterim\Kaydedilen notlar` altına yazar, tamamlandığında klasörü açar. Kurulum klasörüne yazılmaz ve mevcut not verileri taşınmaz. Aynı başlıklı dosya varsa (2), (3) eklenerek önceki dosyalar korunur.
- Her iki işlem öncesinde bekleyen not değişiklikleri saklanır. Kayıt hatasında dışa aktarma yapılmaz. Not seçilmediyse iki düğme devre dışıdır. Yazma hatasında klasör açılmaz. Dosya kaydedilip Explorer açılamazsa bu iki sonuç ayrı bildirilir.
- Eski yedekleme/ekleme/klasör açma seçenekleri korunur. Yeni dosyalar şifreli değildir; notu uygulamadan silmek bu TXT kopyalarını silmez.

IPC yalnız seçili not kimliğini alır; içerik doğrulanan not deposundan okunur. Renderer'a dosya yolu veya genel dosya sistemi yetkisi verilmez. Yeni kanallar mevcut gönderen/ana çerçeve doğrulamasını kullanır. Dosya başlığı yol olamaz; geçersiz Windows adları düzeltilir. Sandbox, contextIsolation, CSP ve ağ kısıtları değişmedi.

## Kontroller

Yerel 72 test geçti. Seçili not/son değişiklik, Türkçe metin, iptal, JSON üzerine yazmayı reddetme, çakışmada önceki kopyaları koruma, başarısız yazma/açma ve Windows dosya adları testleri eklendi. Gerçek Electron testine menü→IPC→disk akışı eklendi; yalnız yerel konum seçicisi ve Explorer çağrısı sentetik hedeflerle taklit edilir. Ürün kodunda test kapısı yoktur. Gerçek Windows sonucu henüz bekleniyor; fiziksel işletim sistemi dosya seçicisi/Explorer penceresi elle denenmiş sayılmaz.

Bu aday henüz yayımlanmadı. Geri dönüşte bu özelliğin dosyaları, köprü/menü çağrıları ve sürüm manifest/kilidi 0.0.5 kaynak kaydı 807f65c7ad152a9e4ba9ce83fea2ea647eddeaa3 ile dosya bazında karşılaştırılarak geri alınabilir. Kullanıcının not ve dışa aktarılan TXT dosyaları silinmemelidir. Veri biçimi değişmedi.
