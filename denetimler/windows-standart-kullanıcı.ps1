param(
    [string]$KurulumKlasoru = (Join-Path $PSScriptRoot '../kurulum'),
    [switch]$GuncellemeKonumu
)
# Yalnız geçici hosted Windows makinesinde; kişisel hesap veya parola kullanılmaz.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Yalnızca geçici GitHub-hosted Windows makinesinde çalıştırılabilir.'
}
$proje = Split-Path $PSScriptRoot -Parent
$cikti = Join-Path $proje 'denetim-çıktıları'
New-Item -ItemType Directory -Path $cikti -Force | Out-Null
$pwsh = (Get-Process -Id $PID).Path
$sonuc = Join-Path $cikti 'windows-standart-sonuc.json'
if (Test-Path $sonuc) { throw 'Önceki denetim sonucu üzerine yazılmayacak.' }
$altBetik = Join-Path $env:RUNNER_TEMP ('notes-standart-' + [guid]::NewGuid().ToString('N') + '.ps1')
$surecKimligi = "$altBetik.pid"
# JSON dizgileri PowerShell tek tırnaklı sabitine çevrilir; komut kodu olarak birleştirilmez.
function Sabit([string]$s) { return "'" + $s.Replace("'", "''") + "'" }
$altIcerik = @'
$ErrorActionPreference = 'Stop'
$PID | Set-Content -LiteralPath __PIDFILE__
$ok = $false
try {
    Start-Transcript -Path __LOG__ | Out-Null
    $kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
    if (([Security.Principal.WindowsPrincipal]::new($kimlik)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Kısıtlı süreç hâlâ yönetici yetkisine sahip.'
    }
    Set-Location -LiteralPath __PROJECT__
    & __SCRIPT__ -KurulumKlasoru __PACKAGE__ -StandartKullaniciGerekli
    $ok = $true
} catch { Write-Host $_; $hata = $_.Exception.Message }
finally {
    try { Stop-Transcript | Out-Null } catch {}
    $geciciSonuc = __RESULT__ + '.tmp'
    $json = @{ basarili = $ok; hata = $hata } | ConvertTo-Json
    [IO.File]::WriteAllText($geciciSonuc, $json, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $geciciSonuc -Destination __RESULT__
}
if (-not $ok) { exit 1 }
'@
$yerler = @{
    '__PIDFILE__' = $surecKimligi
    '__LOG__' = (Join-Path $cikti 'windows-standart.log')
    '__PROJECT__' = $proje
    '__SCRIPT__' = (Join-Path $PSScriptRoot $(if ($GuncellemeKonumu) { 'windows-guncelleme-konumu.ps1' } else { 'windows-kurulum.ps1' }))
    '__PACKAGE__' = (Resolve-Path -LiteralPath $KurulumKlasoru).Path
    '__RESULT__' = $sonuc
}
foreach ($ad in $yerler.Keys) { $altIcerik = $altIcerik.Replace($ad, (Sabit $yerler[$ad])) }
[IO.File]::WriteAllText($altBetik, $altIcerik, [Text.UTF8Encoding]::new($false))
try {
    # SAFER NormalUser: aynı geçici CI profili, yönetici yetkileri kaldırılmış belirteç.
    # Parola, UAC otomasyonu veya ürüne özel test kapısı gerekmez.
    $komut = '"' + $pwsh + '" -NoLogo -NoProfile -NonInteractive -File "' + $altBetik + '"'
    & runas.exe /trustlevel:0x20000 $komut
    if ($LASTEXITCODE -ne 0) { throw 'Standart yetkili test süreci başlatılamadı.' }
    $sure = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-Path $sonuc)) {
        if ($sure.Elapsed.TotalMinutes -ge 10) { throw 'Standart kullanıcı denetimi zamanında bitmedi.' }
        Start-Sleep -Seconds 2
    }
    $durum = Get-Content -LiteralPath $sonuc -Raw | ConvertFrom-Json
    if (-not $durum.basarili) { throw "Standart kullanıcı denetimi başarısız: $($durum.hata)" }
    if ($GuncellemeKonumu) {
        $yetki = Get-Content (Join-Path $cikti 'windows-guncelleme-konumu.json') -Raw | ConvertFrom-Json
        if (-not $yetki.basarili -or -not $yetki.standartYetki) { throw 'Güncelleme konumu kanıtı eksik.' }
    } else {
        $yetki = Get-Content (Join-Path $cikti 'windows-yetki.json') -Raw | ConvertFrom-Json
        if (-not $yetki.yoneticiGerektirmeyenKurulumDogrulandi) { throw 'Yönetici gerektirmeyen kurulum kanıtı eksik.' }
    }
} finally {
    if (Test-Path $surecKimligi) {
        $altPid = [int](Get-Content -LiteralPath $surecKimligi)
        $altSurec = Get-CimInstance Win32_Process -Filter "ProcessId=$altPid" -ErrorAction SilentlyContinue
        if ($altSurec -and $altSurec.CommandLine -and $altSurec.CommandLine.Contains($altBetik)) { Stop-Process -Id $altPid -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $altBetik, $surecKimligi -Force -ErrorAction SilentlyContinue
}
Write-Host 'Kısıtlı kullanıcı belirteciyle kurulum, yükseltme, kaldırma ve yeniden kurma geçti.'
