@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   RECUPERER les dernieres modifs de GitHub
echo ============================================
echo.

echo Telechargement en cours...
git pull
if errorlevel 1 goto erreur

echo.
echo ============================================
echo   OK - Vous avez la derniere version du site
echo ============================================
goto fin

:erreur
echo.
echo *** ERREUR - il y a peut-etre un conflit ou des modifs non sauvegardees ***
echo *** Lancez d'abord SAUVEGARDER.bat, puis reessayez.                     ***

:fin
echo.
pause
