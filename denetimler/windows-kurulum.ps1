param(
    [string]$KurulumKlasoru = (Join-Path $PSScriptRoot '../kurulum'),
    [switch]$StandartKullaniciGerekli
)
# Yalnızca geçici GitHub Windows denetim makinesinde çalıştırılır.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Bu denetim yalnızca geçici GitHub Windows makinesinde çalıştırılabilir.'
}
$proje = Split-Path $PSScriptRoot -Parent
$hedef = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\Notes'
if (Test-Path $hedef) { throw 'Var olan kurulum konumuna dokunulmayacak.' }
$eskiExe = Join-Path $hedef 'Notes.exe'
$exe = Join-Path $hedef 'Notes.exe'
$veriKlasoru = Join-Path $env:APPDATA 'Not Defterim'
$notDosyasi = Join-Path $veriKlasoru 'notlar.json'
$kurtarmaDosyasi = Join-Path $veriKlasoru 'notlar.yedek.json'
$erisimDosyasi = Join-Path $veriKlasoru 'surum-erisim.bin'
if (Test-Path $veriKlasoru) { throw 'Var olan not klasörüne dokunulmayacak. Denetim durduruldu.' }
$kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
$yonetici = ([Security.Principal.WindowsPrincipal]::new($kimlik)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($StandartKullaniciGerekli -and $yonetici) { throw 'Bu denetim standart kullanıcı yetkisiyle çalışmalı.' }
$cikti = Join-Path $proje 'denetim-çıktıları'
New-Item -ItemType Directory -Path $cikti -Force | Out-Null
@{ yoneticiTokeni = $yonetici; standartKullaniciOturumu = -not $yonetici; kurulumKaldirmaGecti = $false } |
    ConvertTo-Json | Set-Content (Join-Path $cikti 'windows-yetki.json') -Encoding utf8
if ($yonetici) { Write-Warning 'Bu oturum yükseltilmiş. Yönetici gerektirmeyen kurulum henüz doğrulanmış sayılmaz; temiz VM standart hesap deneyi gerekir.' }
$onceki = Get-ChildItem (Join-Path $proje 'onceki-kurulum') -Filter '*.exe'
$yeni = Get-ChildItem -LiteralPath $KurulumKlasoru -Filter '*.exe'
if ($onceki.Count -ne 1 -or $yeni.Count -ne 1 -or $yeni.Name -ne 'Notes.exe') { throw 'Beklenen kurulum dosyaları bulunamadı.' }

function UygulamayiDurdur {
    Get-Process -Name 'Not Defterim', 'Notes' -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path -in @($exe, $eskiExe) } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
function Kur([string]$dosya) {
    Write-Host "Kurulum başlıyor: $dosya"
    $surec = Start-Process -FilePath $dosya -ArgumentList @('/S', "/D=$hedef") -PassThru
    if (-not $surec.WaitForExit(120000)) { $surec.Kill(); throw 'Kurulum zamanında tamamlanmadı.' }
    if ($surec.ExitCode -notin @(0, 3010)) {
        Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'Notes|uninstall' } |
            Select-Object Name, ProcessId, ParentProcessId, ExecutablePath | Format-Table | Out-Host
        throw "Kurulum başarısız: $dosya; çıkış kodu: $($surec.ExitCode)"
    }
    Start-Sleep -Seconds 2
    UygulamayiDurdur
}
function SurumuOku {
    $paket = Join-Path $hedef 'resources/app.asar'
    $surum = & node -e "const a=require('@electron/asar'); process.stdout.write(JSON.parse(a.extractFile(process.argv[1], 'package.json').toString()).version)" $paket
    if ($LASTEXITCODE -ne 0) { throw 'Kurulu uygulamanın paket sürümü okunamadı.' }
    return $surum.Trim()
}
function VerileriDogrula {
    foreach ($dosya in $veriOzetleri.Keys) {
        if (-not (Test-Path $dosya) -or (Get-FileHash $dosya -Algorithm SHA256).Hash -ne $veriOzetleri[$dosya]) {
            throw "Sentetik veri korunmadı: $([IO.Path]::GetFileName($dosya))"
        }
    }
}
function IzinleriDogrula {
    $izinli = @($kimlik.User.Value, 'S-1-5-18', 'S-1-5-32-544', 'S-1-3-0', 'S-1-3-4')
    $kayitlar = foreach ($dosya in @($veriKlasoru, $notDosyasi, $kurtarmaDosyasi, $erisimDosyasi, $hedef, $exe)) {
        $acl = Get-Acl -LiteralPath $dosya
        foreach ($kural in $acl.Access) {
            $sid = $kural.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            @{ dosya = [IO.Path]::GetFileName($dosya); sid = $sid; tur = "$($kural.AccessControlType)"; hak = "$($kural.FileSystemRights)"; sayisalHak = [int]$kural.FileSystemRights; veri = $dosya -notin @($hedef, $exe) }
        }
    }
    $kayitlar | ConvertTo-Json | Set-Content (Join-Path $cikti 'windows-acl.json') -Encoding utf8
    $yazmaHaklari = [Security.AccessControl.FileSystemRights]::Write -bor
        [Security.AccessControl.FileSystemRights]::Delete -bor
        [Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor
        [Security.AccessControl.FileSystemRights]::ChangePermissions -bor
        [Security.AccessControl.FileSystemRights]::TakeOwnership
    foreach ($kayit in $kayitlar) {
        if ($kayit.tur -eq 'Allow' -and $kayit.sid -notin $izinli -and
            ($kayit.veri -or ($kayit.sayisalHak -band [int]$yazmaHaklari) -ne 0)) {
            throw "Beklenmeyen izin: $($kayit.sid); $($kayit.dosya); $($kayit.hak)"
        }
    }
    # ACL listeleme başka hesapla etkin erişim denemesinin yerini tutmaz.
}
function Kaldir {
    UygulamayiDurdur
    $kaldiricilar = @(Get-ChildItem -LiteralPath $hedef -Filter 'Uninstall*.exe')
    if ($kaldiricilar.Count -ne 1) { throw 'Tek kaldırıcı bekleniyor.' }
    # KEEP_APP_DATA eklenmez: ürünün varsayılan kaldırma politikası sınanır.
    $surec = Start-Process -FilePath $kaldiricilar[0].FullName -ArgumentList @('/S', '/currentuser', "_?=$hedef") -PassThru
    if (-not $surec.WaitForExit(120000)) { $surec.Kill(); throw 'Kaldırma zamanında tamamlanmadı.' }
    if ($surec.ExitCode -ne 0 -or (Test-Path $exe)) { throw 'Uygulama kaldırılamadı.' }
    VerileriDogrula
}
try {
    # İlk kurulum, kaldırma ve yeniden kurma; yalnız sentetik profil verileri.
    Kur $yeni.FullName
    New-Item -ItemType Directory -Path $veriKlasoru -Force | Out-Null
    $veri = '{"surum":1,"notlar":[{"id":"korunacak-not","title":"Güncelleme denetimi","body":"İğdır ve İstanbul: bu not korunmalı.","updated":1000}]}'
    [IO.File]::WriteAllText($notDosyasi, $veri, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($kurtarmaDosyasi, $veri, [Text.UTF8Encoding]::new($false))
    # Gerçek erişim anahtarı değil; kurulumun baytları korumasını sınayan işaret.
    [IO.File]::WriteAllBytes($erisimDosyasi, [Text.Encoding]::UTF8.GetBytes('sentetik-kasa-koruma-denetimi'))
    $veriOzetleri = @{}
    foreach ($dosya in @($notDosyasi, $kurtarmaDosyasi, $erisimDosyasi)) {
        $veriOzetleri[$dosya] = (Get-FileHash $dosya -Algorithm SHA256).Hash
    }
    IzinleriDogrula
    Kaldir
    Kur $yeni.FullName
    VerileriDogrula
    IzinleriDogrula
    Kaldir

    Kur $onceki.FullName
    if (-not (Test-Path $eskiExe)) { throw 'Önceki uygulama kurulamadı.' }
    $eskiSurum = SurumuOku
    $eskiExeOzeti = (Get-FileHash $eskiExe -Algorithm SHA256).Hash
    if ($eskiSurum -ne '0.0.3') { throw "Başlangıç sürümü beklenen sürüm değil: $eskiSurum" }
    VerileriDogrula
    $oncekiOzet = (Get-FileHash $notDosyasi -Algorithm SHA256).Hash

    # Eski sürümü kaldırmadan aynı konuma yeni kurulum yapılır.
    Kur $yeni.FullName
    $beklenen = (Get-Content (Join-Path $proje 'package.json') -Raw | ConvertFrom-Json).version
    $kurulu = SurumuOku
    if ($kurulu -ne $beklenen) { throw "Kurulu uygulamanın sürümü yenilenmedi: $kurulu" }
    if ((Get-FileHash $exe -Algorithm SHA256).Hash -eq $eskiExeOzeti) {
        throw 'Kurulum eski çalıştırılabilir dosyayı yenilemedi.'
    }
    $kisayol = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Notes.lnk'
    if (-not (Test-Path $kisayol)) { throw 'Notes masaüstü kısayolu oluşturulmadı.' }
    $kabuk = New-Object -ComObject WScript.Shell
    if ($kabuk.CreateShortcut($kisayol).TargetPath -ne $exe) { throw 'Notes kısayolu yeni uygulamayı açmıyor.' }
    if ((Get-FileHash $notDosyasi -Algorithm SHA256).Hash -ne $oncekiOzet) {
        throw 'Yeni kurulum not dosyasını değiştirdi.'
    }
    VerileriDogrula
    IzinleriDogrula
    # Aynı adlı yeni kaldırıcıyla sonraki kurulumlar da çakışmamalı.
    Kur $yeni.FullName
    if ((SurumuOku) -ne $beklenen -or (Get-FileHash $notDosyasi -Algorithm SHA256).Hash -ne $oncekiOzet) {
        throw 'Yeniden kurulum sürümü veya notları değiştirdi.'
    }
    VerileriDogrula
    # Açık uygulama zorla kapatılmamalı; kullanıcıya kapatma uyarısı verilmeli.
    $uygulama = Start-Process -FilePath $exe -PassThru
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 500
        $uygulama.Refresh()
        if ($uygulama.HasExited) { throw 'Kurulu uygulama açılamadı.' }
        if ($uygulama.MainWindowHandle -ne 0) { break }
    }
    if ($uygulama.MainWindowHandle -eq 0) { throw 'Uygulama penceresi açılmadı.' }
    $engellenen = Start-Process -FilePath $yeni.FullName -ArgumentList @('/S', "/D=$hedef") -PassThru
    if (-not $engellenen.WaitForExit(30000)) { $engellenen.Kill(); throw 'Açık uygulama denetimi tamamlanmadı.' }
    $uygulama.Refresh()
    if ($engellenen.ExitCode -eq 0 -or $uygulama.HasExited) { throw 'Açık uygulama korunarak kurulum engellenmedi.' }
    if ((Get-FileHash $notDosyasi -Algorithm SHA256).Hash -ne $oncekiOzet) { throw 'Açık uygulama denetiminde not değişti.' }
    VerileriDogrula
    # Ürünün gerçek güncelleme yardımcısı: bekleme, normal kapanış, /S ve aynı hedef.
    $guncellemeKoku = Join-Path $env:TEMP ('notes-guncelleme-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $guncellemeKoku | Out-Null
    $testKurulum = Join-Path $guncellemeKoku 'Kurulum.exe'
    Copy-Item -LiteralPath $yeni.FullName -Destination $testKurulum
    $ayarDosyasi = Join-Path $guncellemeKoku 'ayar.json'
    $hazir = Join-Path $guncellemeKoku 'hazir'
    $guncellemeSonucu = Join-Path $guncellemeKoku 'sonuc.json'
    @{ dosya = $testKurulum; hedef = $hedef; pid = $uygulama.Id; ozet = (Get-FileHash $testKurulum -Algorithm SHA256).Hash.ToLowerInvariant(); sonuc = $guncellemeSonucu; hazir = $hazir } |
        ConvertTo-Json | Set-Content -LiteralPath $ayarDosyasi -Encoding utf8
    $kod = & node -e "const fs=require('fs');const g=require('./masaüstü/güncelleme.cjs');process.stdout.write(Buffer.from(g.yardimciMetni(JSON.parse(fs.readFileSync(process.argv[1],'utf8').replace(/^\uFEFF/,''))),'utf16le').toString('base64'))" $ayarDosyasi
    if ($LASTEXITCODE -ne 0) { throw 'Gerçek güncelleme yardımcısı üretilemedi.' }
    $ps = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
    $yardimci = Start-Process -FilePath $ps -ArgumentList @('-NoProfile', '-NonInteractive', '-EncodedCommand', $kod) -WindowStyle Hidden -PassThru
    $saat = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-Path $hazir)) {
        if ($yardimci.HasExited -or $saat.Elapsed.TotalSeconds -gt 20) { throw 'Güncelleme yardımcısı hazır olmadı.' }
        Start-Sleep -Milliseconds 200
    }
    Start-Sleep -Seconds 2
    $uygulama.Refresh()
    if ($uygulama.HasExited -or (Test-Path $guncellemeSonucu)) { throw 'Yardımcı uygulamanın normal kapanışını beklemedi.' }
    if (-not $uygulama.CloseMainWindow()) { throw 'Notes normal kapanış isteği gönderilemedi.' }
    if (-not $uygulama.WaitForExit(30000)) { throw 'Notes normal kayıttan sonra kapanmadı.' }
    if (-not $yardimci.WaitForExit(180000)) { throw 'Sessiz güncelleme zamanında bitmedi.' }
    $guncellemeKaydi = Get-Content -LiteralPath $guncellemeSonucu -Raw | ConvertFrom-Json
    if (-not $guncellemeKaydi.basarili) { throw 'Gerçek güncelleme yardımcısı kurulumu tamamlayamadı.' }
    $yenidenAcildi = $false
    for ($i = 0; $i -lt 30; $i++) {
        if (@(Get-Process -Name Notes -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe }).Count -gt 0) { $yenidenAcildi = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $yenidenAcildi -or (SurumuOku) -ne $beklenen) { throw 'Güncellemeden sonra aynı klasördeki Notes açılmadı.' }
    VerileriDogrula
    @{ basarili = $true; standartYetki = -not $yonetici; ayniKlasor = $true; normalKapanisBeklendi = $true; yenidenAcildi = $true; notlarKorundu = $true } |
        ConvertTo-Json | Set-Content (Join-Path $cikti 'windows-guncelleme.json') -Encoding utf8
    Remove-Item -LiteralPath $guncellemeKoku -Recurse -Force
    Write-Host 'Yeniden kurulum başarılı; açık uygulama zorla kapatılmadan kurulum engellendi.'
    Write-Host "Windows üzerinde $eskiSurum sürümünden $kurulu sürümüne geçiş başarılı; Türkçe not dosyası aynen korundu."
    @{ yoneticiTokeni = $yonetici; standartKullaniciOturumu = -not $yonetici; kurulumKaldirmaGecti = $true; yoneticiGerektirmeyenKurulumDogrulandi = -not $yonetici; testDosyalari = @($notDosyasi, $kurtarmaDosyasi, $erisimDosyasi, $exe) } |
        ConvertTo-Json | Set-Content (Join-Path $cikti 'windows-yetki.json') -Encoding utf8
} finally {
    UygulamayiDurdur
}
