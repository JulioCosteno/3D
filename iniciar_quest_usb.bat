@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Laboratorio 3D - Meta Quest por USB
echo == Prueba en Meta Quest por cable USB ==
echo 1) Modo desarrollador activado en el visor (app Meta Horizon).
echo 2) Visor conectado por USB y "Permitir depuracion USB" aceptado dentro del visor.
echo.
where adb >nul 2>nul
if errorlevel 1 (
  echo No se encontro "adb". Descarga "Android SDK Platform-Tools":
  echo   https://developer.android.com/tools/releases/platform-tools
  echo Descomprimelo y copia adb.exe, AdbWinApi.dll y AdbWinUsbApi.dll a esta carpeta, o agregalo al PATH.
  if not exist adb.exe ( pause & exit /b 1 )
)
adb devices
adb reverse tcp:8000 tcp:8000 || (echo No se pudo conectar con el visor. Revisa el cable y la autorizacion USB. & pause & exit /b 1)
echo.
echo LISTO: en el navegador del Quest abre  http://localhost:8000  y pulsa ENTER VR.
echo Deja esta ventana abierta mientras pruebas.
echo.
python servidor.py 8000 --fixed --no-browser
pause
