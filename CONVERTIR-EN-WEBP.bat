@echo off
chcp 65001 >nul
title Convertir en WebP
if "%~1"=="" (
  echo ============================================================
  echo   CONVERTIR EN WEBP  -  glisser-deposer
  echo ============================================================
  echo.
  echo   Fais glisser une ou plusieurs images ^(PNG / JPG^)
  echo   - ou un dossier - directement SUR cette icone.
  echo.
  pause
  exit /b
)
cd /d "%~dp0"
echo ============================================================
echo   CONVERSION EN WEBP
echo ============================================================
echo.
node "scripts\convert-dropped.mjs" %*
echo.
echo ============================================================
echo   Termine. Tu peux fermer cette fenetre.
echo ============================================================
echo.
pause
