@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Read the message above, then press any key.
  pause >nul
)
