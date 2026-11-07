# Kurulum başlamadan önce gerçek NSIS ekranları; yalnız geçici CI profili.
function IlkKurulumEkranlariniDogrula([string]$kurucu, [string]$hedef, [string]$cikti) {
    if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') { throw 'Geçici hosted Windows gerekir.' }
    if ((Test-Path $hedef) -or (Test-Path (Join-Path $env:APPDATA 'Not Defterim'))) { throw 'Mevcut kurulum/veriye dokunulmaz.' }
    $kimlik = [Security.Principal.WindowsIdentity]::GetCurrent()
    if (([Security.Principal.WindowsPrincipal]::new($kimlik)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Kurulum arayüzü standart yetkiyle denenmeli.' }
    Add-Type -AssemblyName System.Drawing
    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class NotesInstallerUI {
    public delegate bool Child(IntPtr h, IntPtr p);
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr h, int id);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
    [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, Child f, IntPtr p);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, UIntPtr w, StringBuilder l, uint flags, uint timeout, out UIntPtr result);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
    public static string Text(IntPtr h) {
        var s=new StringBuilder(32768); UIntPtr result;
        if(SendMessageTimeout(h,13,(UIntPtr)32768,s,2,2000,out result)==IntPtr.Zero) throw new Exception("Pencere metni okunamadı.");
        return s.ToString();
    }
    public static IntPtr[] Children(IntPtr h) {
        var list=new List<IntPtr>(); EnumChildWindows(h,(c,p)=>{if(IsWindowVisible(c)) list.Add(c); return true;},IntPtr.Zero); return list.ToArray();
    }
    public static string Class(IntPtr h) {var s=new StringBuilder(256);GetClassName(h,s,256);return s.ToString();}
}
'@
    $rapor = @{ basarili = $false; standartYetki = $true; tur = 'gercek-NSIS-kurulum-oncesi-ekranlar'; ekranlar = @(); kurulumButonunaBasilmadi = $true }
    $surec = $null
    try {
        $surec = Start-Process -FilePath $kurucu -ArgumentList '/currentuser' -PassThru
        $null = $surec.Handle
        $pencere = [IntPtr]::Zero
        for ($i=0; $i -lt 100; $i++) {
            $surec.Refresh()
            if ($surec.HasExited) { throw 'Görünen kurulum sihirbazı erken kapandı.' }
            $pencere = $surec.MainWindowHandle
            if ($pencere -ne [IntPtr]::Zero) { break }
            Start-Sleep -Milliseconds 200
        }
        if ($pencere -eq [IntPtr]::Zero) { throw 'Kurulum penceresine erişilemedi.' }
        $kurulumaHazir = $false; $konumGoruldu = $false
        for ($sayfa=0; $sayfa -lt 6; $sayfa++) {
            Start-Sleep -Milliseconds 700
            $baslik = [NotesInstallerUI]::Text($pencere)
            if ($baslik -notmatch 'Notes') { throw 'Beklenmeyen kurulum penceresi.' }
            $kontroller = @([NotesInstallerUI]::Children($pencere) | ForEach-Object {
                @{ sinif = [NotesInstallerUI]::Class($_); kimlik = [NotesInstallerUI]::GetDlgCtrlID($_); metin = [NotesInstallerUI]::Text($_) }
            })
            foreach ($k in $kontroller) {
                if ($k.sinif -eq 'Edit' -and [string]::Equals($k.metin.TrimEnd('\'),$hedef.TrimEnd('\'),[StringComparison]::OrdinalIgnoreCase)) { $konumGoruldu = $true }
            }
            $dik = [NotesInstallerUI+Rect]::new()
            if (-not [NotesInstallerUI]::GetWindowRect($pencere,[ref]$dik)) { throw 'Pencere ölçülemedi.' }
            $w=$dik.Right-$dik.Left; $h=$dik.Bottom-$dik.Top
            if ($w -lt 400 -or $h -lt 250) { throw 'Kurulum penceresinin boyutu beklenmiyor.' }
            $resim = [Drawing.Bitmap]::new($w,$h)
            $grafik = [Drawing.Graphics]::FromImage($resim)
            $dc=$grafik.GetHdc()
            try { if (-not [NotesInstallerUI]::PrintWindow($pencere,$dc,2)) { throw 'Kurulum ekran görüntüsü alınamadı.' } }
            finally { $grafik.ReleaseHdc($dc); $grafik.Dispose() }
            $ad="windows-kurulum-ekran-$sayfa.png"
            try { $resim.Save((Join-Path $cikti $ad),[Drawing.Imaging.ImageFormat]::Png) } finally { $resim.Dispose() }
            $rapor.ekranlar += @{ baslik=$baslik; kontroller=$kontroller; resim=$ad; genislik=$w; yukseklik=$h }
            $ileri=[NotesInstallerUI]::GetDlgItem($pencere,1)
            $yazi=([NotesInstallerUI]::Text($ileri)).Replace('&','').Trim()
            if ($yazi -match '^(Kur|Yükle|Install)(\s|$)') { $kurulumaHazir=$true; break }
            if ($yazi -notmatch '^(İleri|Next)\b' -or -not [NotesInstallerUI]::IsWindowEnabled($ileri)) { throw "Beklenmeyen sihirbaz adımı: $yazi" }
            if (-not [NotesInstallerUI]::PostMessage($ileri,245,[IntPtr]::Zero,[IntPtr]::Zero)) { throw 'İleri düğmesine basılamadı.' }
        }
        if (-not $kurulumaHazir -or -not $konumGoruldu) { throw 'Kişisel varsayılan hedef ve kurulum onay ekranı doğrulanamadı.' }
        if (Test-Path $hedef) { throw 'Kur düğmesinden önce kurulum hedefi oluşturuldu.' }
        $rapor.varsayilanKonum=$hedef; $rapor.konumGoruldu=$true; $rapor.basarili=$true
    } finally {
        # Yalnız bu testin başlattığı, henüz Kur düğmesine basılmamış sihirbaz.
        if ($surec -and -not $surec.HasExited) { $surec.Kill($true); $null=$surec.WaitForExit(10000) }
        $rapor | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $cikti 'windows-kurulum-arayuzu.json') -Encoding utf8
    }
}
