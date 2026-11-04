# Anahtarsız güncelleme — 0.0.8 adayı

Notes deposunun herkese açık olduğu, depo kimliğinin 1427086629 olarak kaldığı 4 Kasım 2026 tarihinde doğrulandı. Yeni sürüm açılışta ve 15 dakikada bir kimliği sabit açık depodan denetlenir. Yeni sürümü denetle elle kontrol eder. GitHub 403/429 döndürürse bekleme süresine uyulur; elle denetim de bu kotayı atlamaz.

Güncelle düğmesi kurulumu indirip boyut ve SHA-256 kontrolünden geçirir; son not kaydı başarıyla tamamlanınca Notes kapanır. Kurucu mevcut kişisel kurulum klasörüne /S --updated /currentuser /D parametreleriyle sessizce kurar, sonra Notes yeniden açılır. İndirme sırasında iptal edilebilir. Yeni sürüm bulunduğunda yazı alanı kendiliğinden kapatılmaz veya onaysız kurulum başlatılmaz. Ayrı uygulama kimliği veya farklı kalıcı kurulum yolu eklenmedi.

Ürün sürüm ve indirme isteklerinde Authorization veya Cookie göndermez. Erişim anahtarı formu ve hesap bağlama IPC yöntemleri kaldırıldı. Güncelleme Windows safeStorage kullanılabilirliğine bağlı değildir. Eski surum-erisim.bin dosyası güncelleyici tarafından okunmaz, yeniden şifrelenmez veya otomatik silinmez; kayıt uyumu sınıfı ve ilgili şifreleme testleri korunmuştur. Eski erişim anahtarı GitHub hesabından iptal edilebilir.

Depo kimliği/adı, açık olma koşulu, kararlı sürüm, dosya adresi, boyut ve SHA-256 kontrolleri korunur. Sandbox, contextIsolation, IPC gönderen kontrolü, CSP, ağ kısıtları, Electron fuses ve ASAR ayarları değiştirilmedi. Not/şifreleme biçimi geçişi yoktur. Bu işlev değişikliği yeni bir güvenlik açığı olarak sunulmaz.

Değişen ana dosyalar: masaüstü/sürüm-bildirimi.cjs, güncelleme.cjs, ana.cjs, köprü.cjs; arayüz/pencere.html ve sürüm-bildirimi.js. Birim, arayüz, gerçek Electron ve Windows paket denetimleri güncellendi. Windows iş akışına anahtarsız canlı indirme kontrolü eklendi. Bağımlılık değişikliği yapılmadı; yalnız paket sürümü 0.0.8 adayıdır.

Windows paket testi yalnız ağ cevabını yerel kurucu fikstürüyle sağlar; gerçek ASAR başlatıcısını, kurucuyu, normal kapanışı, aynı klasörde yeniden açılmayı ve sentetik verilerin korunmasını çalıştırır. Canlı indirme testi ise açık yayından gerçekten, anahtarsız indirir; kurucuyu çalıştırmaz. Bu iki kanıt birbirinin yerine sunulmaz. Gerçek kullanıcı verileri kullanılmaz. Windows 10/11 istemci, tüm kullanıcılar kurulumu ve kullanıcının kişisel bilgisayarı test edilmiş sayılmaz.

0.0.7 ve önceki özel depo akışında açık depo reddedildiği için bu yeni sürüme ilk geçişte yeni kurulum bir kez elle çalıştırılmalıdır. Sonraki sürümler için anahtarsız uygulama içi Güncelle kullanılır. Yayımlama bu hazırlık kapsamına dahil değildir; aday PR üzerinden incelenebilir.

Geri dönüş: uygulama kaynakları önceki ff0926306027b3406e357218b24a04e3bfda4a50 tabanına dosya bazında alınabilir. Paket ve kilit sürümleri birlikte değiştirilmelidir. Eski sürüm açık depoyu reddettiğinden geri dönüş güncellemeyi yeniden çalışır hale getirmez. Not klasörü ve eski kasa dosyası geri dönüşte silinmez.
