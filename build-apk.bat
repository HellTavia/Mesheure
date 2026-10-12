@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo === Mes Heures : compilation de l'APK ===
where node >nul 2>nul || goto :nonode

rem --- Java : Capacitor 7 a besoin d'un JDK 21 (le Java 25 d'Android Studio est trop recent) ---
:findjdk
set "J21="
for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
for /d %%D in ("%ProgramFiles%\Microsoft\jdk-21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
for /d %%D in ("%ProgramFiles%\Java\jdk-21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
for /d %%D in ("%ProgramFiles%\Zulu\zulu-21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
for /d %%D in ("%USERPROFILE%\.jdks\*21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
for /d %%D in ("%LOCALAPPDATA%\MesHeures\jdk21\jdk-21*") do if exist "%%D\bin\java.exe" set "J21=%%D"
if defined J21 goto :jdkok

echo.
echo Aucun JDK 21 trouve sur ce PC.
if defined TRIED goto :nojdk
choice /c ON /m "Telecharger un JDK 21 portable (environ 190 Mo, sans installation)"
if errorlevel 2 goto :nojdk
set "TRIED=1"
echo Telechargement en cours...
call node scripts\get-jdk.mjs || goto :nojdk
goto :findjdk

:jdkok
set "JAVA_HOME=%J21%"
set "PATH=%J21%\bin;%PATH%"
echo.
echo Java utilise : %J21%
java -version 2>&1 | findstr /i "version"

echo.
echo [1/5] Installation des dependances...
call npm install || goto :err

echo.
echo [2/5] Construction de l'interface...
call npm run build || goto :err

echo.
if exist "android\" goto :hasandroid
echo [3/5] Creation du projet Android...
call npx cap add android || goto :err
goto :sync
:hasandroid
echo [3/5] Projet Android deja present.

:sync
echo.
echo [4/5] Synchronisation et permissions...
call npx cap sync android || goto :err
call node scripts\patch-android.mjs || goto :err
if exist "android\local.properties" goto :compile

rem --- SDK Android : recherche, sinon on demande le chemin ---
if not defined ANDROID_HOME if defined ANDROID_SDK_ROOT set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
for %%P in ("%LOCALAPPDATA%\Android\Sdk" "C:\Android\Sdk" "D:\Android\Sdk" "E:\Android\Sdk" "F:\Android\Sdk" "G:\Android\Sdk" "C:\Android\android-sdk" "D:\Android\android-sdk" "C:\AndroidSDK" "D:\AndroidSDK") do if not defined ANDROID_HOME if exist "%%~P\platform-tools" set "ANDROID_HOME=%%~P"
if defined ANDROID_HOME goto :sdkfound

echo.
echo SDK Android introuvable.
echo Dans Android Studio : Settings, Languages and Frameworks, Android SDK, ligne "Android SDK Location".
:asksdk
set "ANDROID_HOME="
set /p "ANDROID_HOME=Colle ce chemin ici puis Entree : "
if not defined ANDROID_HOME goto :err
set "ANDROID_HOME=%ANDROID_HOME:"=%"
if exist "%ANDROID_HOME%\platform-tools" goto :sdkfound
if exist "%ANDROID_HOME%\platforms" goto :sdkfound
echo Ce dossier ne contient pas de SDK Android (ni platform-tools ni platforms).
goto :asksdk

:sdkfound
set "SDKP=%ANDROID_HOME:\=/%"
> "android\local.properties" echo sdk.dir=%SDKP%
echo SDK Android : %SDKP%

:compile
echo.
echo [5/5] Compilation de l'APK (debug)...
pushd android
call gradlew.bat --stop >nul 2>nul
call gradlew.bat assembleDebug
set ERR=%ERRORLEVEL%
popd
if not "%ERR%"=="0" goto :err

copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "MesHeures.apk" >nul
echo.
echo Termine : MesHeures.apk est dans ce dossier.
pause
exit /b 0

:nonode
echo Node.js introuvable. Installe Node 20 ou plus recent.
pause
exit /b 1

:nojdk
echo.
echo Pas de JDK 21. Telecharge https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.zip
echo dans ton navigateur, decompresse-le dans %LOCALAPPDATA%\MesHeures\jdk21 puis relance ce script.
pause
exit /b 1

:err
echo.
echo La compilation a echoue. Lis le message au-dessus.
echo - "Unsupported class file major version" ou "Java 8 JVM" : il faut un JDK 21.
echo - "SDK location not found" : supprime android\local.properties et relance ce script.
pause
exit /b 1
