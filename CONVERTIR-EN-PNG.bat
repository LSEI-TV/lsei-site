@echo off
chcp 65001 >nul
title Convertir en PNG
if "%~1"=="" (
  echo ============================================================
  echo   CONVERTIR EN PNG  -  glisser-deposer
  echo ============================================================
  echo.
  echo   Fais glisser une ou plusieurs images ^(WEBP / JPG^)
  echo   - ou un dossier - directement SUR cette icone.
  echo.
  pause
  exit /b
)
cd /d "%~dp0"
echo ============================================================
echo   CONVERSION EN PNG
echo ============================================================
echo.
node "scripts\convert-dropped-png.mjs" %*
echo.
echo ============================================================
echo   Termine. Tu peux fermer cette fenetre.
echo ============================================================
echo.
pause
