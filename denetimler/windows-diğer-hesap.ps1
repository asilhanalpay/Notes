$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Yalnızca geçici GitHub-hosted Windows makinesinde çalıştırılabilir.'
}
$cikti = Join-Path $PSScriptRoot '../denetim-çıktıları'
$yetki = Get-Content (Join-Path $cikti 'windows-yetki.json') -Raw | ConvertFrom-Json
if (-not $yetki.yoneticiGerektirmeyenKurulumDogrulandi -or $yetki.testDosyalari.Count -ne 4) {
    throw 'Standart yetkili kurulum denetimi tamamlanmadan başka hesap deneyi yapılamaz.'
}
foreach ($dosya in $yetki.testDosyalari) { if (-not (Test-Path -LiteralPath $dosya)) { throw 'Sentetik test dosyası eksik.' } }
$pwsh = (Get-Process -Id $PID).Path
$ad = 'NotesProbe' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$kok = Join-Path ([Environment]::GetFolderPath('CommonApplicationData')) ('notes-acl-' + [guid]::NewGuid().ToString('N'))
$kullanici = $null
$surec = $null
try {
    # Rastgele parola yalnız bellekte; gerçek kullanıcı hesabı/anahtarı kullanılmaz.
    $parola = ConvertTo-SecureString ('Aa1!' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))) -AsPlainText -Force
    $kullanici = New-LocalUser -Name $ad -Password $parola -AccountNeverExpires -PasswordNeverExpires
    $grup = Get-LocalGroup -SID 'S-1-5-32-545'
    if ($kullanici.SID.Value -notin @(Get-LocalGroupMember -Group $grup | ForEach-Object { $_.SID.Value })) {
        Add-LocalGroupMember -Group $grup -Member $kullanici
    }
    New-Item -ItemType Directory -Path $kok | Out-Null
    # Yalnız test betiği ve dosya yolları bu dizinde paylaşılır; not içeriği yok.
    # Not/uygulama dizinlerinin ACL'leri değiştirilmez.
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetAccessRuleProtection($true, $false)
    $sahip = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    foreach ($sid in @($sahip, 'S-1-5-18', 'S-1-5-32-544', $kullanici.SID.Value)) {
        $kural = [Security.AccessControl.FileSystemAccessRule]::new(
            [Security.Principal.SecurityIdentifier]::new($sid),
            [Security.AccessControl.FileSystemRights]::FullControl,
            [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit',
            [Security.AccessControl.PropagationFlags]::None,
            [Security.AccessControl.AccessControlType]::Allow)
        $acl.AddAccessRule($kural)
    }
    Set-Acl -LiteralPath $kok -AclObject $acl
    $ayar = @{ sid = $kullanici.SID.Value; dosyalar = $yetki.testDosyalari }
    $ayar | ConvertTo-Json | Set-Content (Join-Path $kok 'ayar.json') -Encoding utf8
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot '../kurulum/Notes.exe') -Destination (Join-Path $kok 'Kurulum.exe')
    $betik = @'
$ErrorActionPreference = 'Stop'
$ayar = Get-Content (Join-Path $PSScriptRoot 'ayar.json') -Raw | ConvertFrom-Json
$kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
if ($kimlik.User.Value -ne $ayar.sid) { throw 'Beklenen ayrı hesap kullanılmadı.' }
if (([Security.Principal.WindowsPrincipal]::new($kimlik)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Probe hesabı yönetici olamaz.' }
# Start-Process -Credential yeni kimliği yükler, ancak başlatanın ortamını
# devralabilir. Yeni, geçici hesabın profilini SID kaydından çözümle.
$profilKaydi = Get-ItemProperty -LiteralPath ('Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\' + $kimlik.User.Value)
$profil = [Environment]::ExpandEnvironmentVariables($profilKaydi.ProfileImagePath)
if (-not $profil -or $profil -eq $env:USERPROFILE) { throw 'Ayrı hesabın profili doğrulanamadı.' }
$env:USERPROFILE = $profil
$env:APPDATA = Join-Path $profil 'AppData\Roaming'
$env:LOCALAPPDATA = Join-Path $profil 'AppData\Local'
$env:TEMP = Join-Path $env:LOCALAPPDATA 'Temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$kayitlar = foreach ($dosya in $ayar.dosyalar) {
    foreach ($erisim in @([IO.FileAccess]::Read, [IO.FileAccess]::Write)) {
        $izin = $false
        try {
            # Yalnız izin sınanır; dosyadan bayt okunmaz veya dosyaya yazılmaz.
            $f = [IO.File]::Open($dosya, [IO.FileMode]::Open, $erisim, [IO.FileShare]::ReadWrite)
            $f.Dispose()
            $izin = $true
        } catch [UnauthorizedAccessException] { }
        # Dosya yokluğu ve başka hatalar erişim reddi sayılmaz; test başarısız olur.
        $gizli = [IO.Path]::GetExtension($dosya) -ne '.exe'
        if ($izin -and ($gizli -or $erisim -eq [IO.FileAccess]::Write)) { throw 'Diğer hesap beklenmeyen dosya erişimi kazandı.' }
        @{ dosya = [IO.Path]::GetFileName($dosya); erisim = "$erisim"; izin = $izin }
    }
}
$kendiVeri = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'Not Defterim'
$kendiHedef = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\Notes'
if (Test-Path $kendiVeri) { throw 'İkinci hesabın mevcut not klasörüne dokunulmayacak.' }
if (Test-Path $kendiHedef) { throw 'İkinci hesabın mevcut kurulumuna dokunulmayacak.' }
if ((Join-Path $kendiVeri 'notlar.json') -eq $ayar.dosyalar[0]) { throw 'İki hesabın profili aynı olamaz.' }
function KendiUygulamasiniDurdur {
    Get-Process -Name Notes -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq (Join-Path $kendiHedef 'Notes.exe') } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
function KendiKur {
    $p = Start-Process -FilePath (Join-Path $PSScriptRoot 'Kurulum.exe') -ArgumentList @('/S', "/D=$kendiHedef") -PassThru
    if (-not $p.WaitForExit(120000)) { $p.Kill(); throw 'İkinci hesap kurulumu zamanında tamamlanmadı.' }
    if ($p.ExitCode -notin @(0, 3010)) { throw 'İkinci hesap kurulumu başarısız.' }
    Start-Sleep -Seconds 2
    KendiUygulamasiniDurdur
    if (-not (Test-Path (Join-Path $kendiHedef 'Notes.exe'))) { throw 'İkinci hesap uygulaması kurulmadı.' }
}
try {
    KendiKur
    New-Item -ItemType Directory -Path $kendiVeri -Force | Out-Null
    $not = Join-Path $kendiVeri 'notlar.json'
    [IO.File]::WriteAllText($not, '{"surum":1,"notlar":[{"id":"ikinci-hesap","title":"Sentetik not","body":"Kişisel veri yok","updated":1000}]}')
    $ozet = (Get-FileHash $not -Algorithm SHA256).Hash
    KendiKur
    if ((Get-FileHash $not -Algorithm SHA256).Hash -ne $ozet) { throw 'İkinci hesap yeniden kurulumunda not değişti.' }
    $kaldirici = @(Get-ChildItem -LiteralPath $kendiHedef -Filter 'Uninstall*.exe')
    if ($kaldirici.Count -ne 1) { throw 'İkinci hesap kaldırıcı dosyası eksik.' }
    $p = Start-Process -FilePath $kaldirici[0].FullName -ArgumentList @('/S', '/currentuser', "_?=$kendiHedef") -PassThru
    if (-not $p.WaitForExit(120000)) { $p.Kill(); throw 'İkinci hesap kaldırması zamanında tamamlanmadı.' }
    if ($p.ExitCode -ne 0 -or (Test-Path (Join-Path $kendiHedef 'Notes.exe'))) { throw 'İkinci hesap kaldırması başarısız.' }
    if ((Get-FileHash $not -Algorithm SHA256).Hash -ne $ozet) { throw 'İkinci hesap kaldırmasında not korunmadı.' }
} finally { KendiUygulamasiniDurdur }
@{ basarili = $true; sid = $kimlik.User.Value; yonetici = $false; standartHesapKurulumu = $true; denemeler = @($kayitlar) } |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $PSScriptRoot 'sonuc.json') -Encoding utf8
'@
    $betikYolu = Join-Path $kok 'probe.ps1'
    [IO.File]::WriteAllText($betikYolu, $betik, [Text.UTF8Encoding]::new($false))
    $kimlikBilgisi = [Management.Automation.PSCredential]::new("$env:COMPUTERNAME\$ad", $parola)
    $surec = Start-Process -FilePath $pwsh -Credential $kimlikBilgisi -LoadUserProfile -ArgumentList "-NoLogo -NoProfile -NonInteractive -File `"$betikYolu`"" -RedirectStandardError (Join-Path $kok 'hata.txt') -PassThru
    if (-not $surec.WaitForExit(300000)) { throw 'İkinci hesap denetimi zamanında bitmedi.' }
    if ($surec.ExitCode -ne 0) { throw ('İkinci hesap denetimi başarısız: ' + (Get-Content (Join-Path $kok 'hata.txt') -Raw)) }
    $sonuc = Get-Content (Join-Path $kok 'sonuc.json') -Raw | ConvertFrom-Json
    if (-not $sonuc.basarili -or -not $sonuc.standartHesapKurulumu -or $sonuc.sid -ne $kullanici.SID.Value -or $sonuc.denemeler.Count -ne 8) { throw 'İkinci hesap kanıtı eksik.' }
    Copy-Item -LiteralPath (Join-Path $kok 'sonuc.json') -Destination (Join-Path $cikti 'windows-diger-hesap.json')
    Write-Host 'Ayrı standart hesap: dosya erişimi reddedildi; kendi profilinde kurulum, yeniden kurma ve notları koruyan kaldırma geçti.'
} finally {
    if ($surec -and -not $surec.HasExited) { Stop-Process -Id $surec.Id -Force -ErrorAction SilentlyContinue }
    if ($kullanici) { Remove-LocalUser -SID $kullanici.SID -ErrorAction SilentlyContinue }
    if (Test-Path $kok) { Remove-Item -LiteralPath $kok -Recurse -Force }
}
