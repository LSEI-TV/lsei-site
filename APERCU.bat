@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   APERCU LOCAL du site LSEI
echo ============================================
echo.
echo   Le site va s'ouvrir dans ton navigateur :
echo   http://localhost:4321
echo.
echo   - C'est un apercu PRIVE sur ton PC (rien n'est en ligne).
echo   - Les modifications s'affichent en direct.
echo   - Pour arreter l'apercu : ferme cette fenetre.
echo ============================================
echo.
call npm run dev -- --open
pause
