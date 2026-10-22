; Notes.exe hem indirilen kurulumun hem uygulamanın adıdır.
; İşlem adına göre kapatmak kurulumu da sonlandırabilir. Tam yolu denetle;
; açık uygulamayı zorla kapatmak yerine kullanıcıdan kapatmasını iste.
!macro customHeader
  Var NotesAcik
  Var NotesKontrolHatasi
  Var NotesEskiDizin
  !ifdef BUILD_UNINSTALLER
    !define NOTES_KONTROL "un.NotesKontrol"
  !else
    !define NOTES_KONTROL "NotesKontrol"
  !endif

  Function ${NOTES_KONTROL}
    StrCpy $NotesAcik 0
    StrCpy $NotesKontrolHatasi 0
    System::Call 'kernel32::GetCurrentProcessId() i.r9'
    System::Call 'kernel32::CreateToolhelp32Snapshot(i 2, i 0) p.r0'
    ${if} $0 == -1
      StrCpy $NotesKontrolHatasi 1
      Return
    ${endif}
    ; NSIS işlemi 32 bittir: PROCESSENTRY32W = 556 bayt.
    System::Alloc 556
    Pop $2
    ${if} $2 == 0
      System::Call 'kernel32::CloseHandle(p r0)'
      StrCpy $NotesKontrolHatasi 1
      Return
    ${endif}
    System::Call '*$2(i 556)'
    System::Call 'kernel32::Process32FirstW(p r0, p r2) i.r1'
    notes_dongu:
      ${if} $1 == 0
        Goto notes_bitti
      ${endif}
      System::Call '*$2(i, i, i.r3, i, i, i, i, i, i, &w260.r8)'
      ${if} $8 == "${APP_EXECUTABLE_FILENAME}"
      ${andIf} $3 != $9
        System::Call 'kernel32::OpenProcess(i 0x1000, i 0, i r3) p.r4'
        ${if} $4 == 0
          StrCpy $NotesKontrolHatasi 1
        ${else}
          StrCpy $5 ${NSIS_MAX_STRLEN}
          System::Call 'kernel32::QueryFullProcessImageNameW(p r4, i 0, w.r6, *i r5) i.r7'
          System::Call 'kernel32::CloseHandle(p r4)'
          ${if} $7 == 0
            StrCpy $NotesKontrolHatasi 1
          ${elseif} $6 == "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
            StrCpy $NotesAcik 1
          ${elseif} $6 == "$NotesEskiDizin\${APP_EXECUTABLE_FILENAME}"
            StrCpy $NotesAcik 1
          ${endif}
        ${endif}
      ${endif}
      System::Call 'kernel32::Process32NextW(p r0, p r2) i.r1'
      Goto notes_dongu
    notes_bitti:
    System::Free $2
    System::Call 'kernel32::CloseHandle(p r0)'
  FunctionEnd
!macroend

!macro customCheckAppRunning
  ReadRegStr $NotesEskiDizin SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallLocation
  Call ${NOTES_KONTROL}
  ${if} $NotesAcik == 1
    MessageBox MB_OK|MB_ICONEXCLAMATION "Önce Notes uygulamasını kapat, ardından kurulumu yeniden başlat." /SD IDOK
    Abort
  ${endif}
  ${if} $NotesKontrolHatasi == 1
    MessageBox MB_OK|MB_ICONEXCLAMATION "Notes uygulamasının kapalı olduğu doğrulanamadı. Kurulum durduruldu." /SD IDOK
    Abort
  ${endif}

  !ifndef BUILD_UNINSTALLER
    ; 0.2.4 kaldırıcısı işlem adını kullanır ve Notes.exe kurulumunu kapatır.
    ; Kaldırıcı, kendi adı Notes.exe olduğunda bu eski denetimi atlar.
    ; Uygulamanın kapalı olduğu yukarıda tam yol üzerinden doğrulanmıştır.
    ReadRegStr $R0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ${if} $R0 == "0.2.4"
      ${if} $NotesEskiDizin == ""
        Abort "Önceki kurulumun konumu bulunamadı. Notların korunarak işlem durduruldu."
      ${endif}
      ReadRegStr $R0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString
      !insertmacro GetInQuotes $R1 "$R0"
      ${if} $R1 == ""
        Abort "Önceki kurulumun kaldırıcı dosyası bulunamadı."
      ${endif}
      InitPluginsDir
      ClearErrors
      CopyFiles /SILENT "$R1" "$PLUGINSDIR\Notes.exe"
      ${if} ${Errors}
        Abort "Önceki kurulum hazırlanamadı. Notların korunarak işlem durduruldu."
      ${endif}
      StrCpy $R3 "/currentuser"
      ${if} $installMode == "all"
        StrCpy $R3 "/allusers"
      ${endif}
      ClearErrors
      ExecWait '"$PLUGINSDIR\Notes.exe" /S /KEEP_APP_DATA --updated $R3 _?=$NotesEskiDizin' $R2
      ${if} ${Errors}
        Abort "Önceki kurulum başlatılamadı."
      ${endif}
      ${if} $R2 != 0
        Abort "Önceki kurulum yenilenemedi."
      ${endif}
    ${endif}
  !endif
!macroend
