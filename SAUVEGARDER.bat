@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   SAUVEGARDER le site sur GitHub
echo ============================================
echo.

REM Recupere d'abord les modifs eventuelles de l'autre PC
echo [1/3] Recuperation des modifs distantes...
git pull
if errorlevel 1 goto erreur
echo.

echo [2/3] Enregistrement de vos modifications...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
    echo   Rien de nouveau a sauvegarder.
    echo.
    goto fin
)

set "message="
set /p message=Decrivez vos modifications (puis Entree) :
if "%message%"=="" set "message=Sauvegarde du %date% %time%"
git commit -m "%message%"
if errorlevel 1 goto erreur
echo.

echo [3/3] Envoi vers GitHub...
git push
if errorlevel 1 goto erreur

echo.
echo ============================================
echo   OK - Modifications sauvegardees sur GitHub
echo ============================================
goto fin

:erreur
echo.
echo *** UNE ERREUR EST SURVENUE - lisez le message ci-dessus ***

:fin
echo.
pause
