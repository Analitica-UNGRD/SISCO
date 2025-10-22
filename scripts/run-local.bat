@echo off
setlocal

rem Cambia al directorio raiz del proyecto (donde esta package.json)
pushd "%~dp0.."

if not exist package.json (
	echo No se encontro package.json en %CD%.
	echo Asegurate de ejecutar este script desde la carpeta correcta.
	goto :end
)

if not exist node_modules (
	echo Instalando dependencias npm...
	call npm install
	if errorlevel 1 (
		echo Ocurrio un error al instalar dependencias. Revisa el mensaje anterior.
		goto :end
	)
) else (
	echo Dependencias npm ya instaladas.
)

echo Lanzando el servidor de desarrollo en una nueva ventana...
start "SISCO Dev Server" cmd /k "cd /d %CD% && npm start"

set "TARGET_URL=http://localhost:5500"
echo Esperando a que %TARGET_URL% responda...
powershell -NoProfile -Command "\$ProgressPreference='SilentlyContinue'; while (\$true) { try { Invoke-WebRequest -UseBasicParsing -Uri '%TARGET_URL%' ^| Out-Null; break } catch { Start-Sleep -Milliseconds 500 } }"

if errorlevel 1 (
	echo No se pudo verificar que el servidor este arriba. Intenta abrir el navegador manualmente.
	goto :end
)

echo Abriendo el navegador en %TARGET_URL% ...
start "" "%TARGET_URL%"

echo.
echo Servidor iniciado en la ventana titulada ^"SISCO Dev Server^". Presiona una tecla para cerrar este lanzador.

:end
pause >nul
popd
endlocal
