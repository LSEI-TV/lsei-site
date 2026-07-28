@echo off
chcp 65001 >nul
title Apercu TABLETTE - LSEI
cd /d "%~dp0"
echo ============================================================
echo   APERCU TABLETTE  (fenetre de 810 px de large)
echo ============================================================
echo.
REM Demarrer le serveur d'apercu seulement s'il ne tourne pas deja
netstat -ano | findstr ":4321" >nul
if errorlevel 1 (
  echo   Demarrage du serveur d'apercu...
  start "LSEI dev" cmd /c "npm run dev -- --port 4321"
  timeout /t 6 >nul
) else (
  echo   Serveur deja demarre, ouverture directe.
)
echo   Ouverture de la fenetre format TABLETTE...
start chrome --new-window --window-size=810,1080 "http://localhost:4321"
echo.
echo   Astuce : si tu utilises Edge, remplace "chrome" par "msedge" dans ce fichier.
echo   Tu peux fermer cette fenetre noire.
timeout /t 3 >nul
