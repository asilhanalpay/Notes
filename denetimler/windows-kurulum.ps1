# Yalnızca geçici GitHub Windows denetim makinesinde çalıştırılır.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'Bu denetim yalnızca geçici GitHub Windows makinesinde çalıştırılabilir.'
}
$proje = Split-Path $PSScriptRoot -Parent
$hedef = Join-Path $env:RUNNER_TEMP 'not-defterim-kurulum-denetimi'
$eskiExe = Join-Path $hedef 'Not Defterim.exe'
$exe = Join-Path $hedef 'Notes.exe'
$veriKlasoru = Join-Path $env:APPDATA 'Not Defterim'
$notDosyasi = Join-Path $veriKlasoru 'notlar.json'
if (Test-Path $veriKlasoru) { throw 'Var olan not klasörüne dokunulmayacak. Denetim durduruldu.' }
$onceki = Get-ChildItem (Join-Path $proje 'onceki-kurulum') -Filter '*.exe'
$yeni = Get-ChildItem (Join-Path $proje 'kurulum') -Filter '*.exe'
if ($onceki.Count -ne 1 -or $yeni.Count -ne 1 -or $yeni.Name -ne 'Notes.exe') { throw 'Beklenen kurulum dosyaları bulunamadı.' }

function UygulamayiDurdur {
    Get-Process -Name 'Not Defterim', 'Notes' -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path -in @($exe, $eskiExe) } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
function Kur([string]$dosya) {
    $surec = Start-Process -FilePath $dosya -ArgumentList @('/S', "/D=$hedef") -PassThru
    if (-not $surec.WaitForExit(120000)) { $surec.Kill(); throw 'Kurulum zamanında tamamlanmadı.' }
    if ($surec.ExitCode -notin @(0, 3010)) { throw "Kurulum başarısız: $($surec.ExitCode)" }
    Start-Sleep -Seconds 2
    UygulamayiDurdur
}
function SurumuOku {
    $paket = Join-Path $hedef 'resources/app.asar'
    $surum = & node -e "const a=require('@electron/asar'); process.stdout.write(JSON.parse(a.extractFile(process.argv[1], 'package.json').toString()).version)" $paket
    if ($LASTEXITCODE -ne 0) { throw 'Kurulu uygulamanın paket sürümü okunamadı.' }
    return $surum.Trim()
}
try {
    Kur $onceki.FullName
    if (-not (Test-Path $eskiExe)) { throw 'Önceki uygulama kurulamadı.' }
    $eskiSurum = SurumuOku
    $eskiExeOzeti = (Get-FileHash $eskiExe -Algorithm SHA256).Hash
    if ($eskiSurum -ne '0.2.2') { throw "Başlangıç sürümü beklenen sürüm değil: $eskiSurum" }
    New-Item -ItemType Directory -Path $veriKlasoru -Force | Out-Null
    $veri = '{"surum":1,"notlar":[{"id":"korunacak-not","title":"Güncelleme denetimi","body":"İğdır ve İstanbul: bu not korunmalı.","updated":1000}]}'
    [IO.File]::WriteAllText($notDosyasi, $veri, [Text.UTF8Encoding]::new($false))
    $oncekiOzet = (Get-FileHash $notDosyasi -Algorithm SHA256).Hash

    # Eski sürümü kaldırmadan aynı konuma yeni kurulum yapılır.
    Kur $yeni.FullName
    $beklenen = (Get-Content (Join-Path $proje 'package.json') -Raw | ConvertFrom-Json).version
    $kurulu = SurumuOku
    if ($kurulu -ne $beklenen) { throw "Kurulu uygulamanın sürümü yenilenmedi: $kurulu" }
    if ((Get-FileHash $exe -Algorithm SHA256).Hash -eq $eskiExeOzeti) {
        throw 'Kurulum eski çalıştırılabilir dosyayı yenilemedi.'
    }
    if (Test-Path $eskiExe) { throw 'Eski adlı uygulama dosyası kaldırılmadı.' }
    $kisayol = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Notes.lnk'
    if (-not (Test-Path $kisayol)) { throw 'Notes masaüstü kısayolu oluşturulmadı.' }
    $kabuk = New-Object -ComObject WScript.Shell
    if ($kabuk.CreateShortcut($kisayol).TargetPath -ne $exe) { throw 'Notes kısayolu yeni uygulamayı açmıyor.' }
    if ((Get-FileHash $notDosyasi -Algorithm SHA256).Hash -ne $oncekiOzet) {
        throw 'Yeni kurulum not dosyasını değiştirdi.'
    }
    Write-Host "Windows üzerinde $eskiSurum sürümünden $kurulu sürümüne geçiş başarılı; Türkçe not dosyası aynen korundu."
} finally {
    UygulamayiDurdur
}
