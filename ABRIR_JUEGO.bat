@echo off
REM Abre El Laburador con un servidor local
REM (hace falta para que carguen los modelos 3D y el audio)
cd /d "%~dp0"
echo Abriendo El Laburador en http://localhost:8080 ...
start "" http://localhost:8080
where npx >nul 2>nul
if %errorlevel%==0 (
  npx --yes http-server -p 8080 -c-1
) else (
  python -m http.server 8080
)
pause
