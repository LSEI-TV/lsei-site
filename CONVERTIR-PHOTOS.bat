@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   CONVERSION DES PHOTOS EN WEBP (leger et rapide)
echo   Dossier : %cd%
echo ============================================================
echo.
node scripts\convert-photos-webp.mjs
echo.
echo ============================================================
echo   Termine. Tu peux fermer cette fenetre.
echo   Pense a demander a Claude de PUBLIER (ou lance SAUVEGARDER.bat).
echo ============================================================
echo.
pause
