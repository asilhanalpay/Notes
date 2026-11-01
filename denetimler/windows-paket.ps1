param([string]$Paket = (Join-Path $PSScriptRoot '../kurulum/win-unpacked'))
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Yalnızca geçici GitHub-hosted Windows hesabında çalıştırılabilir.'
}
$veriKlasoru = Join-Path $env:APPDATA 'Not Defterim'
if (Test-Path $veriKlasoru) { throw 'Var olan uygulama profiline dokunulmayacak.' }
$Paket = (Resolve-Path -LiteralPath $Paket).Path
New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot '../denetim-çıktıları') -Force | Out-Null
& node (Join-Path $PSScriptRoot 'paket.cjs') $Paket |
    Tee-Object -FilePath (Join-Path $PSScriptRoot '../denetim-çıktıları/windows-paket-statik.json')
if ($LASTEXITCODE -ne 0) { throw 'Statik paket denetimi geçmedi.' }
$gecici = Join-Path $env:RUNNER_TEMP ('notes-paket-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $gecici | Out-Null
# Klasör bu betiğe aittir; gerçek not/token kopyalanmaz.
New-Item -ItemType Directory -Path $veriKlasoru | Out-Null
$ortamOnceki = @{}
foreach ($ad in @('ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS')) {
    $ortamOnceki[$ad] = [Environment]::GetEnvironmentVariable($ad, 'Process')
    [Environment]::SetEnvironmentVariable($ad, $null, 'Process')
}
$surecler = [Collections.Generic.List[Diagnostics.Process]]::new()
$basarili = $false
function Calistir([string]$klasor, [bool]$acilmali, [string]$ad, [string[]]$argumanlar = @()) {
    $hataDosyasi = Join-Path $gecici "$ad.stderr.txt"
    $surec = Start-Process -FilePath (Join-Path $klasor 'Notes.exe') -ArgumentList (@('--noerrdialogs', '--disable-breakpad') + $argumanlar) -RedirectStandardError $hataDosyasi -PassThru
    $surecler.Add($surec)
    if ($acilmali) {
        for ($i = 0; $i -lt 40; $i++) {
            Start-Sleep -Milliseconds 250
            $surec.Refresh()
            if ($surec.HasExited) { throw "Sağlam paket açılamadı: $ad" }
            if ($surec.MainWindowHandle -ne 0) { break }
        }
        if ($surec.MainWindowHandle -eq 0) { throw "Pencere açılmadı: $ad" }
        if (-not $surec.CloseMainWindow() -or -not $surec.WaitForExit(20000)) { throw "Normal kapanış başarısız: $ad" }
        if ($surec.ExitCode -ne 0) { throw "Normal kapanış hata verdi: $ad" }
    } else {
        if (-not $surec.WaitForExit(15000)) { throw "Değiştirilmiş paket reddedilmedi: $ad" }
        if ($surec.ExitCode -eq 0) { throw "Değiştirilmiş paket hatasız sonlandı: $ad" }
        if ($ad -eq 'bozuk-asar' -and (Get-Content -LiteralPath $hataDosyasi -Raw) -notmatch '(?i)integrity|hash') {
            throw 'ASAR reddinin bütünlük kontrolünden kaynaklandığı doğrulanamadı.'
        }
    }
}
try {
    Calistir $Paket $true 'saglam'
    $isaret = Join-Path $gecici 'node-calisti.txt'
    $kod = "require('node:fs').writeFileSync(" + ($isaret | ConvertTo-Json -Compress) + ",'calisti')"
    $kanca = Join-Path $gecici 'node-kanca.cjs'
    [IO.File]::WriteAllText($kanca, $kod)
    $env:ELECTRON_RUN_AS_NODE = '1'
    $env:NODE_OPTIONS = '--require="' + $kanca + '"'
    Calistir $Paket $true 'ortam-degiskenleri' @('-e', $kod)
    if (Test-Path $isaret) { throw 'Node ortam değişkenleri veya RunAsNode engellenmedi.' }
    [Environment]::SetEnvironmentVariable('ELECTRON_RUN_AS_NODE', $null, 'Process')
    [Environment]::SetEnvironmentVariable('NODE_OPTIONS', $null, 'Process')

    $bozuk = Join-Path $gecici 'bozuk'
    Copy-Item -LiteralPath $Paket -Destination $bozuk -Recurse
    $arsiv = Join-Path $bozuk 'resources/app.asar'
    # Başlığı geçerli JSON olarak tutup tek hash karakterini değiştirir.
    # Böylece hata bozuk JSON değil, EXE'ye bağlı başlık doğrulaması olmalıdır.
    & node -e 'const fs=require("node:fs"),a=require("@electron/asar");const p=process.argv[1],b=fs.readFileSync(p),h=a.getRawHeader(p).headerString,m=/"hash":"([a-f0-9])/.exec(h);if(!m)throw Error("Hash yok");const i=b.indexOf(Buffer.from(h))+m.index+m[0].length-1;b[i]=b[i]===48?49:48;fs.writeFileSync(p,b)' $arsiv
    if ($LASTEXITCODE -ne 0) { throw 'Sentetik ASAR değişikliği hazırlanamadı.' }
    Calistir $bozuk $false 'bozuk-asar'

    Remove-Item -LiteralPath $arsiv
    $alternatif = Join-Path $bozuk 'resources/app'
    New-Item -ItemType Directory -Path $alternatif | Out-Null
    [IO.File]::WriteAllText((Join-Path $alternatif 'package.json'), '{"main":"ana.cjs"}')
    [IO.File]::WriteAllText((Join-Path $alternatif 'ana.cjs'), $kod + ";require('electron').app.quit()")
    Calistir $bozuk $false 'alternatif-app'
    if (Test-Path $isaret) { throw 'ASAR dışındaki uygulama yüklendi.' }
    $basarili = $true
    Write-Host 'Aday Windows paketi: açılış/kapanış, ortam değişkenleri, bozuk ASAR ve alternatif app denetimleri geçti.'
} finally {
    foreach ($surec in $surecler) {
        if (-not $surec.HasExited) { Stop-Process -Id $surec.Id -Force -ErrorAction SilentlyContinue }
    }
    foreach ($ad in $ortamOnceki.Keys) { [Environment]::SetEnvironmentVariable($ad, $ortamOnceki[$ad], 'Process') }
    $cikti = Join-Path $PSScriptRoot '../denetim-çıktıları'
    New-Item -ItemType Directory -Path $cikti -Force | Out-Null
    Get-ChildItem -LiteralPath $gecici -Filter '*.stderr.txt' | Copy-Item -Destination $cikti
    @{ windowsPaketDavranisiGecti = $basarili } | ConvertTo-Json |
        Set-Content (Join-Path $cikti 'windows-paket.json') -Encoding utf8
    # Yalnızca başta yokluğu doğrulanan, bu koşuya ait sentetik profil.
    Remove-Item -LiteralPath $veriKlasoru -Recurse -Force
    Remove-Item -LiteralPath $gecici -Recurse -Force
}
