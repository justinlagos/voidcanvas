; Windows: offer Voidcanvas for .psd files without taking over from Photoshop.
; It is added to "Open with" always, and becomes the default only when nothing else claims .psd.

!macro customInstall
  WriteRegStr SHELL_CONTEXT "Software\Classes\Voidcanvas.psd" "" "Photoshop document"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Voidcanvas.psd\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Voidcanvas.psd\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
  WriteRegStr SHELL_CONTEXT "Software\Classes\.psd\OpenWithProgids" "Voidcanvas.psd" ""
  ReadRegStr $0 HKCR ".psd" ""
  StrCmp $0 "" 0 +2
    WriteRegStr SHELL_CONTEXT "Software\Classes\.psd" "" "Voidcanvas.psd"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.psd\OpenWithProgids" "Voidcanvas.psd"
  ReadRegStr $0 SHELL_CONTEXT "Software\Classes\.psd" ""
  StrCmp $0 "Voidcanvas.psd" 0 +2
    DeleteRegValue SHELL_CONTEXT "Software\Classes\.psd" ""
  DeleteRegKey SHELL_CONTEXT "Software\Classes\Voidcanvas.psd"
!macroend
