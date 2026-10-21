# Yalnızca geçici GitHub Windows denetim makinesinde çalıştırılır.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'Bu denetim yalnızca geçici GitHub Windows makinesinde çalıştırılabilir.'
}
$proje = Split-Path $PSScriptRoot -Parent
$hedef = Join-Path $env:RUNNER_TEMP 'not-defterim-kurulum-denetimi'
$exe = Join-Path $hedef 'Not Defterim.exe'
$veriKlasoru = Join-Path $env:APPDATA 'Not Defterim'
$notDosyasi = Join-Path $veriKlasoru 'notlar.json'
if (Test-Path $veriKlasoru) { throw 'Var olan not klasörüne dokunulmayacak. Denetim durduruldu.' }
$onceki = Get-ChildItem (Join-Path $proje 'onceki-kurulum') -Filter '*.exe'
$yeni = Get-ChildItem (Join-Path $proje 'kurulum') -Filter '*.exe'
if ($onceki.Count -ne 1 -or $yeni.Count -ne 1) { throw 'Beklenen kurulum dosyaları bulunamadı.' }

function UygulamayiDurdur {
    Get-Process -Name 'Not Defterim' -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -and $_.Path -eq $exe } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
function Kur([string]$dosya) {
    $surec = Start-Process -FilePath $dosya -ArgumentList @('/S', "/D=$hedef") -PassThru
    if (-not $surec.WaitForExit(120000)) { $surec.Kill(); throw 'Kurulum zamanında tamamlanmadı.' }
    if ($surec.ExitCode -notin @(0, 3010)) { throw "Kurulum başarısız: $($surec.ExitCode)" }
    Start-Sleep -Seconds 2
    UygulamayiDurdur
}
try {
    Kur $onceki.FullName
    if (-not (Test-Path $exe)) { throw 'Önceki uygulama kurulamadı.' }
    $eskiSurum = [Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion
    if ($eskiSurum -ne '0.2.2') { throw 'Başlangıç sürümü beklenen sürüm değil.' }
    New-Item -ItemType Directory -Path $veriKlasoru -Force | Out-Null
    $veri = '{"surum":1,"notlar":[{"id":"korunacak-not","title":"Güncelleme denetimi","body":"İğdır ve İstanbul: bu not korunmalı.","updated":1000}]}'
    [IO.File]::WriteAllText($notDosyasi, $veri, [Text.UTF8Encoding]::new($false))
    $oncekiOzet = (Get-FileHash $notDosyasi -Algorithm SHA256).Hash

    # Eski sürümü kaldırmadan aynı konuma yeni kurulum yapılır.
    Kur $yeni.FullName
    $beklenen = (Get-Content (Join-Path $proje 'package.json') -Raw | ConvertFrom-Json).version
    $kurulu = [Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion
    if ($kurulu -ne $beklenen) { throw 'Kurulu uygulamanın sürümü yenilenmedi.' }
    if ((Get-FileHash $notDosyasi -Algorithm SHA256).Hash -ne $oncekiOzet) {
        throw 'Yeni kurulum not dosyasını değiştirdi.'
    }
    Write-Host "Windows üzerinde $eskiSurum sürümünden $kurulu sürümüne geçiş başarılı; Türkçe not dosyası aynen korundu."
} finally {
    UygulamayiDurdur
}
