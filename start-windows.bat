@echo off
title MadBros Enterprise System - Running on Port 80
color 0A

echo ========================================================
echo     HE THONG QUAN TRI DOANH NGHIEP MADBROS (WINDOWS VPS)
echo ========================================================
echo.

cd /d %~dp0

:: Dung phien webmadbros cu dang giu Prisma DLL tren cong 80.
:: Chi dung node.exe dang LISTEN tren cong 80, khong dung bot Telegram o tien trinh khac.
echo [Khoi dong] Kiem tra phien webmadbros dang chay tren cong 80...
powershell -NoProfile -Command "$connections = @(Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue); foreach ($connection in $connections) { $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue; if ($process -and $process.ProcessName -eq 'node') { Write-Host ('Dang dung webmadbros PID ' + $process.Id + ' de cap nhat an toan...'); Stop-Process -Id $process.Id -Force } }"
powershell -NoProfile -Command "Start-Sleep -Milliseconds 800"

:: Don cac file tam Prisma con lai tu lan generate bi gian doan truoc.
del /Q "server\node_modules\.prisma\client\query_engine-windows.dll.node.tmp*" >nul 2>&1

:: 1. Kiem tra va tao file .env neu chua co
if not exist "server\.env" (
    echo [Cau hinh] Khoi tao server\.env tu server\.env.example...
    copy "server\.env.example" "server\.env" >nul
)

if not exist "client\.env" (
    echo [Cau hinh] Khoi tao client\.env...
    echo VITE_API_URL=/api > client\.env
)

echo [1/4] Kiem tra va cai dat thu vien (npm install)...
call npm run install:all
if errorlevel 1 goto :error

echo.
echo [2/4] Build Frontend React toi uu production...
call npm run build:client
if errorlevel 1 goto :error

echo.
echo [3/4] Khoi tao va dong bo co so du lieu SQLite...
cd server
call npx prisma generate
if errorlevel 1 goto :error_server
call npx prisma db push --skip-generate
if errorlevel 1 goto :error_server
call npx tsc
if errorlevel 1 goto :error_server
cd ..

echo.
echo [4/4] He thong da san sang!
echo ========================================================
echo Dia chi truy cap: http://localhost:80
echo Tren VPS: http://DIA_CHI_IP_VPS:80
echo Tai khoan Admin mac dinh: admin@madbros.vn / 123456
echo Real-Time Socket.IO va Telegram Bot da san sang!
echo ========================================================
echo.

npm run start

pause
exit /b 0

:error_server
cd ..

:error
echo.
echo ========================================================
echo [LOI] Khoi dong khong hoan tat. Vui long xem loi o tren.
echo He thong khong khoi dong de tranh chay voi ban build cu.
echo ========================================================
pause
exit /b 1
