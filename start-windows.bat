@echo off
title MadBros Enterprise System - Running on Port 80
color 0A

echo ========================================================
echo   🚀 HE THONG QUAN TRI DOANH NGHIEP MADBROS (WINDOWS VPS)
echo ========================================================
echo.

cd /d %~dp0

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

echo.
echo [2/4] Build Frontend React toi uu production...
call npm run build:client

echo.
echo [3/4] Khoi tao va dong bo co so du lieu SQLite...
cd server
call npx prisma generate
call npx prisma db push
call npm run build
cd ..

echo.
echo [4/4] He thong da san sang!
echo ========================================================
echo 🌐 Dia chi truy cap: http://localhost:80
echo 📌 Tren VPS: http://DIA_CHI_IP_VPS:80
echo 🔑 Tai khoan Admin mac dinh: admin@madbros.vn / 123456
echo ⚡ Real-Time Socket.IO & Telegram Bot da san sang!
echo ========================================================
echo.

npm run start

pause
