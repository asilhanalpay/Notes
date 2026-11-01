# Değerler yalnız Notes ana işlemi tarafından bu metnin önüne eklenir.
$ErrorActionPreference = 'Stop'
try {
    $notes = Get-Process -Id $NotesPid -ErrorAction Stop
    if ($notes.Path -ne (Join-Path $Hedef 'Notes.exe')) { throw 'Beklenmeyen uygulama süreci.' }
    [IO.File]::WriteAllText($Hazir, 'hazir')
    # Önce uygulamanın normal kayıt/kapanış akışı tamamlanır; zorla sonlandırma yok.
    if (-not $notes.WaitForExit(300000)) { throw 'Notes kapanmadı; kurulum başlatılmadı.' }
    if ((Get-FileHash -LiteralPath $Kurulum -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Ozet) { throw 'Kurulum özeti değişti.' }
    # /D son parametredir; NSIS kalan metni (boşluklar dahil) hedef yol sayar.
    $p = Start-Process -FilePath $Kurulum -ArgumentList "/S --updated /currentuser /D=$Hedef" -PassThru
    if (-not $p.WaitForExit(300000)) { throw 'Kurulum zamanında tamamlanmadı.' }
    if ($p.ExitCode -notin @(0, 3010)) { throw 'Kurulum başarısız.' }
    @{ basarili = $true } | ConvertTo-Json | Set-Content -LiteralPath $Sonuc -Encoding utf8
    # Sessiz kurulumun yeniden açma davranışına güvenilmez.
    Start-Process -FilePath (Join-Path $Hedef 'Notes.exe') -WorkingDirectory $Hedef
    Remove-Item -LiteralPath $Kurulum -Force -ErrorAction SilentlyContinue
} catch {
    @{ basarili = $false; hata = 'Güncelleme tamamlanamadı. Notların saklandığı klasör korunur. Yeniden kurmayı deneyebilirsin.' } |
        ConvertTo-Json | Set-Content -LiteralPath $Sonuc -Encoding utf8
} finally {
    Remove-Item -LiteralPath $Hazir -Force -ErrorAction SilentlyContinue
}
