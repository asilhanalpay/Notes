param([string]$KurulumKlasoru, [switch]$StandartKullaniciGerekli)
# Aday paketin aynı sürümle yerinde güncellemesi; kaynak sürümü sabitlenmez.
# Sadece temiz, geçici hosted VM; önceden var olan kurulum/veriye dokunulmaz.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') { throw 'Geçici hosted Windows gerekir.' }
$kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
$yonetici = ([Security.Principal.WindowsPrincipal]::new($kimlik)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $StandartKullaniciGerekli -or $yonetici) { throw 'Standart yetkili test gerekir.' }
$proje = Split-Path $PSScriptRoot -Parent
$nodeBetik = Join-Path $PSScriptRoot 'windows-paket-guncellemesi.cjs'
$beklenen = (Get-Content (Join-Path $proje 'package.json') -Raw | ConvertFrom-Json).version
$cikti = Join-Path $proje 'denetim-çıktıları'
$varsayilan = Join-Path $env:LOCALAPPDATA 'Programs\Notes'
$ozel = Join-Path $env:LOCALAPPDATA "Notes Güncelleme Denetimi\Özel klasör 'İğdır'\Notes"
$veri = Join-Path $env:APPDATA 'Not Defterim'
$rapor = @{ basarili = $false; standartYetki = -not $yonetici; os = [Environment]::OSVersion.VersionString; baslatmaKaynagi = 'aday-paket-ASAR-gercek-Electron'; kurulumlar = $beklenen; yerelAgFiksturu = $true; senaryolar = @() }
# WScript.Shell.TargetPath bazı karakterleri ANSI kod sayfasına çevirebilir.
# Dosya yolunu Windows'un Unicode kısayol arayüzünden oku; aynı konum beklentisi korunur.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
public static class NotesShortcutUnicode {
    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    private class ShellLink { }
    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("000214F9-0000-0000-C000-000000000046")]
    private interface IShellLinkW {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int length, IntPtr findData, uint flags);
    }
    public static string Target(string file) {
        var link = new ShellLink();
        try {
            ((IPersistFile)link).Load(file, 0);
            var path = new StringBuilder(32768);
            ((IShellLinkW)link).GetPath(path, path.Capacity, IntPtr.Zero, 4);
            return path.ToString();
        } finally { Marshal.FinalReleaseComObject(link); }
    }
}
'@
function Kayitlar {
    foreach ($kovan in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {
        foreach ($gorunum in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {
            # HKCU\Software iki görünümde ortaktır; aynı kaydı iki kez sayma.
            if ($kovan -eq [Microsoft.Win32.RegistryHive]::CurrentUser -and $gorunum -eq [Microsoft.Win32.RegistryView]::Registry32) { continue }
            $kok = [Microsoft.Win32.RegistryKey]::OpenBaseKey($kovan, $gorunum)
            try {
                $ana = $kok.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall')
                if ($null -eq $ana) { continue }
                try {
                    foreach ($ad in $ana.GetSubKeyNames()) {
                        $alt = $ana.OpenSubKey($ad)
                        try {
                            if ($alt.GetValue('DisplayName') -match '^Notes(?: \d+\.\d+\.\d+)?$') {
                                [pscustomobject]@{ kimlik = "$kovan/$gorunum/$ad"; ad = $alt.GetValue('DisplayName'); surum = $alt.GetValue('DisplayVersion'); kaldir = $alt.GetValue('UninstallString') }
                            }
                        } finally { if ($alt) { $alt.Dispose() } }
                    }
                } finally { $ana.Dispose() }
            } finally { $kok.Dispose() }
        }
    }
}
function Durdur([string]$exe) {
    Get-Process -Name Notes -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
function Surum([string]$hedef) {
    $s = & node -e "process.stdout.write(JSON.parse(require('@electron/asar').extractFile(process.argv[1],'package.json')).version)" (Join-Path $hedef 'resources/app.asar')
    if ($LASTEXITCODE -ne 0) { throw 'ASAR sürümü okunamadı.' }
    return $s.Trim()
}
function Kisayollar([string]$exe) {
    $kabuk = New-Object -ComObject WScript.Shell
    $bulunan = @()
    foreach ($klasor in @('DesktopDirectory', 'Programs', 'CommonDesktopDirectory', 'CommonPrograms')) {
        $yol = [Environment]::GetFolderPath($klasor)
        if ($yol -and (Test-Path $yol)) {
            foreach ($link in @(Get-ChildItem -LiteralPath $yol -Filter 'Notes.lnk' -Recurse)) {
                $hedef = [NotesShortcutUnicode]::Target($link.FullName)
                Copy-Item -LiteralPath $link.FullName -Destination (Join-Path $cikti ("windows-kisayol-$($bulunan.Count).lnk")) -Force
                if (-not [string]::Equals($hedef, $exe, [StringComparison]::OrdinalIgnoreCase)) { throw "Unicode kısayol başka konuma gidiyor: $hedef" }
                $bulunan += @{ dosya = $link.FullName; hedef = $hedef; wscriptHedef = $kabuk.CreateShortcut($link.FullName).TargetPath }
            }
        }
    }
    if ($bulunan.Count -ne 2) { throw "İki kısayol bekleniyordu: $($bulunan.Count)" }
    return $bulunan
}
New-Item -ItemType Directory -Path $cikti -Force | Out-Null
if ((Test-Path $veri) -or (Test-Path $varsayilan) -or (Test-Path $ozel) -or @(Kayitlar).Count -ne 0) { throw 'Önceden var olan Notes/veri bulundu; dokunulmayacak.' }
$eski = Join-Path $KurulumKlasoru 'Notes.exe'
if (-not (Test-Path $eski)) { throw 'Aday kurulum dosyası eksik.' }
try {
    foreach ($hedef in @($varsayilan, $ozel)) {
        $exe = Join-Path $hedef 'Notes.exe'
        $s = @{ hedef = $hedef; basarili = $false; asama = 'ilk-kurulum' }
        $rapor.senaryolar += $s
        $kurucu = Start-Process -FilePath $eski -ArgumentList "/S /currentuser /D=$hedef" -PassThru
        $null = $kurucu.Handle
        if (-not $kurucu.WaitForExit(120000) -or $kurucu.ExitCode -notin @(0, 3010)) { throw 'Aday kurulamadı.' }
        Durdur $exe
        if ((Surum $hedef) -ne $beklenen) { throw 'Başlangıç sürümü yanlış.' }
        $once = @(Kayitlar)
        if ($once.Count -ne 1) { throw "Başlangıçta tek kurulum kaydı yok: $($once.Count)" }
        $s.oncekiKayit = $once[0]
        $null = Kisayollar $exe
        New-Item -ItemType Directory -Path $veri -Force | Out-Null
        $not = '{"surum":1,"notlar":[{"id":"konum-denetimi","title":"Sentetik not","body":"İğdır: bu not korunmalı.","updated":1000}]}'
        $ozetler = @{}
        foreach ($ad in @('notlar.json', 'notlar.yedek.json', 'surum-erisim.bin')) {
            $dosya = Join-Path $veri $ad
            [IO.File]::WriteAllText($dosya, $(if ($ad -eq 'surum-erisim.bin') { 'sentetik-kasa-gercek-anahtar-degil' } else { $not }), [Text.UTF8Encoding]::new($false))
            $ozetler[$dosya] = (Get-FileHash $dosya -Algorithm SHA256).Hash
        }
        $uygulama = Start-Process -FilePath $exe -PassThru
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Milliseconds 500
            $uygulama.Refresh()
            if ($uygulama.HasExited) { throw 'Eski uygulama açılamadı.' }
            if ($uygulama.MainWindowHandle -ne 0) { break }
        }
        if ($uygulama.MainWindowHandle -eq 0) { throw 'Eski uygulama penceresi açılmadı.' }
        $gecici = Join-Path $env:RUNNER_TEMP ('notes-konum-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $gecici | Out-Null
        $kok = Join-Path $veri 'guncellemeler'
        @{ exe = $uygulama.Path; pid = $uygulama.Id; kok = $kok; dosya = (Resolve-Path -LiteralPath $eski).Path } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $gecici 'ayar.json') -Encoding utf8
        $s.asama = 'gercek-indirme-ve-yardimci'
        # Yalnız ağ yanıtı aday kurulum dosyasıdır; paket ASAR'ındaki kod çalışır.
        # Start-Process -Wait kullanılmaz: tüm süreç ağacı yerine yalnız sürücü
        # beklenir; güncelleme yardımcısı Notes'un kapanışını beklemeye devam eder.
        $surucu = Start-Process -FilePath (Join-Path $proje 'node_modules/electron/dist/electron.exe') -ArgumentList @(('"' + $nodeBetik + '"'), ('"' + (Join-Path $gecici 'ayar.json') + '"')) -WorkingDirectory $proje -PassThru -RedirectStandardOutput (Join-Path $cikti 'windows-elektron-surucu.stdout.log') -RedirectStandardError (Join-Path $cikti 'windows-elektron-surucu.stderr.log')
        $null = $surucu.Handle
        if (-not $surucu.WaitForExit(180000) -or $surucu.ExitCode -ne 0 -or -not (Test-Path (Join-Path $kok 'surucu-hazir.json'))) { throw 'Aday paketin indirici/yardımcısı hazırlanamadı.' }
        $s.yayin = Get-Content (Join-Path $kok 'surucu-hazir.json') -Raw | ConvertFrom-Json
        if ($s.yayin.surum -ne $beklenen -or -not $s.yayin.basarili -or -not $s.yayin.yerelAgFiksturu) { throw 'Yanlış paketin güncelleme kodu sınandı.' }
        $sonuc = Join-Path $kok 'sonuc.json'
        Start-Sleep -Seconds 2
        $uygulama.Refresh()
        if ($uygulama.HasExited -or (Test-Path $sonuc) -or (Surum $hedef) -ne $beklenen) { throw 'Normal kapanış beklenmedi.' }
        $s.normalKapanisBeklendi = $true
        if (-not $uygulama.CloseMainWindow() -or -not $uygulama.WaitForExit(30000)) { throw 'Normal kapanış başarısız.' }
        $s.asama = 'sessiz-yukseltme'
        for ($i = 0; $i -lt 150; $i++) {
            if (Test-Path $sonuc) { break }
            Start-Sleep -Seconds 2
        }
        if (-not (Test-Path $sonuc)) { throw 'Güncelleme sonucu zamanında yazılmadı.' }
        $s.yardimci = Get-Content -LiteralPath $sonuc -Raw | ConvertFrom-Json
        if (-not $s.yardimci.basarili) { throw 'Yayımlanmış yardımcı kurulumu tamamlayamadı.' }
        $s.asama = 'konum-ve-teklik'
        for ($i = 0; $i -lt 60; $i++) {
            $acik = @(Get-Process -Name Notes -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe -and $_.MainWindowHandle -ne 0 })
            if ($acik.Count -eq 1 -and @(Get-ChildItem -LiteralPath $kok -Filter Kurulum.exe -Recurse).Count -eq 0) { break }
            Start-Sleep -Milliseconds 500
        }
        if ($acik.Count -ne 1 -or (Surum $hedef) -ne $beklenen) { throw 'Yeni sürüm aynı konumda tek pencere olarak açılmadı.' }
        $sonra = @(Kayitlar)
        if ($sonra.Count -ne 1 -or $sonra[0].kimlik -ne $once[0].kimlik -or $sonra[0].surum -ne $beklenen -or -not $sonra[0].kaldir.Contains($hedef)) { throw 'Kurulum kaydı tekliği/konumu korunmadı.' }
        $s.sonrakiKayit = $sonra[0]
        $s.kisayollar = @(Kisayollar $exe)
        if ($hedef -eq $ozel -and (Test-Path (Join-Path $varsayilan 'Notes.exe'))) { throw 'Varsayılan konumda ikinci uygulama oluştu.' }
        if (@(Get-ChildItem -LiteralPath $kok -Filter Kurulum.exe -Recurse).Count -ne 0) { throw 'Başarılı kurulumun geçici EXE dosyası temizlenmedi.' }
        foreach ($dosya in $ozetler.Keys) {
            if ((Get-FileHash $dosya -Algorithm SHA256).Hash -ne $ozetler[$dosya]) { throw 'Sentetik not/kurtarma/kasa dosyası değişti.' }
        }
        $s.veriKonumu = $veri
        $s.notlarKorundu = $true
        $s.tekKurulumKaydi = $true
        $s.geciciExeTemizlendi = $true
        $s.surum = Surum $hedef
        $s.basarili = $true
        $s.asama = 'tamamlandi'
        Durdur $exe
        $kaldirici = @(Get-ChildItem -LiteralPath $hedef -Filter 'Uninstall*.exe')
        if ($kaldirici.Count -ne 1) { throw 'Tek kaldırıcı bekleniyor.' }
        $p = Start-Process -FilePath $kaldirici[0].FullName -ArgumentList "/S /currentuser _?=$hedef" -PassThru
        $null = $p.Handle
        if (-not $p.WaitForExit(120000) -or $p.ExitCode -ne 0 -or (Test-Path $exe) -or @(Kayitlar).Count -ne 0) { throw 'Senaryolar arası kaldırma başarısız.' }
        foreach ($dosya in $ozetler.Keys) {
            if ((Get-FileHash $dosya -Algorithm SHA256).Hash -ne $ozetler[$dosya]) { throw 'Kaldırma notları değiştirdi.' }
        }
        # Yalnız bu betiğin sıfırdan oluşturduğu sentetik profil.
        Remove-Item -LiteralPath $veri -Recurse -Force
        Remove-Item -LiteralPath $gecici -Recurse -Force
    }
    $rapor.basarili = $true
} catch {
    $rapor.hata = $_.Exception.Message
    throw
} finally {
    foreach ($hedef in @($varsayilan, $ozel)) { Durdur (Join-Path $hedef 'Notes.exe') }
    $rapor | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $cikti 'windows-guncelleme-konumu.json') -Encoding utf8
}
