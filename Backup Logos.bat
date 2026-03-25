@echo off
title Logos Backup
cd /d "C:\Dev\Logos"

echo.
echo -----------------------------------------
echo LOGOS BACKUP -- Running...
echo -----------------------------------------
echo.

:: Timestamp via PowerShell
for /f "delims=" %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set TIMESTAMP=%%T

:: -----------------------------------------
:: GIT BACKUP
:: -----------------------------------------
echo [1/4] Committing all changes to git...
git add -A
git commit -m "Auto-backup: %TIMESTAMP%"
git push
echo Git backup complete.
echo.

:: -----------------------------------------
:: LOGOS BACKUP -- overwrite single copy
:: -----------------------------------------
echo [2/4] Backing up Logos...
set LOGOS_BACKUP=C:\Users\close\Dropbox\Dev-Backups\Logos
if exist "%LOGOS_BACKUP%" rd /s /q "%LOGOS_BACKUP%"
mkdir "%LOGOS_BACKUP%"
xcopy "C:\Dev\Logos" "%LOGOS_BACKUP%" /E /I /Q /EXCLUDE:C:\Dev\Logos\.gitignore-backup-exclude.txt
echo Logos backup complete.
echo.

:: -----------------------------------------
:: EDENPRO BACKUP -- overwrite single copy
:: -----------------------------------------
echo [3/4] Backing up EdenPro...
set EDENPRO_BACKUP=C:\Users\close\Dropbox\Dev-Backups\EdenPro
if exist "%EDENPRO_BACKUP%" rd /s /q "%EDENPRO_BACKUP%"
mkdir "%EDENPRO_BACKUP%"
xcopy "C:\Dev\EdenPro\edenpro-linkedin-intel" "%EDENPRO_BACKUP%" /E /I /Q /EXCLUDE:C:\Dev\Logos\.gitignore-backup-exclude.txt
echo EdenPro backup complete.
echo.

:: -----------------------------------------
:: KAI'ROS BACKUP -- overwrite single copy
:: -----------------------------------------
echo [4/4] Backing up Kai'Ros...
set KAIROS_BACKUP=C:\Users\close\Dropbox\Dev-Backups\KaiRos
if exist "%KAIROS_BACKUP%" rd /s /q "%KAIROS_BACKUP%"
mkdir "%KAIROS_BACKUP%"
xcopy "C:\Dev\KaiRos" "%KAIROS_BACKUP%" /E /I /Q /EXCLUDE:C:\Dev\Logos\.gitignore-backup-exclude.txt
echo KaiRos backup complete.
echo.

:: -----------------------------------------
:: LOG
:: -----------------------------------------
echo %TIMESTAMP% -- Full backup completed (Logos + EdenPro + KaiRos) >> "C:\Dev\Logos\backup-log.txt"
type "C:\Dev\Logos\backup-log.txt"
echo.

echo -----------------------------------------
echo Done. All projects preserved.
echo Timestamp: %TIMESTAMP%
echo -----------------------------------------
echo.
pause
