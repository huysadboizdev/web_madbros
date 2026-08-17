@echo off
title MadBros Enterprise System - Running on Port 80
color 0A

echo ========================================================
echo   🚀 HE THONG QUAN TRI DOANH NGHIEP MADBROS (WINDOWS)
echo ========================================================
echo.

cd /d %~dp0

echo [1/3] Kiem tra va cai dat goi thu vien...
call npm run install:all

echo [2/3] Build Frontend React sang file tinh toi uu...
call npm run build:client

echo [3/3] Khoi tao co so du lieu SQLite (CSDL sach)...
cd server
call npx prisma db push
call npm run build
cd ..

echo.
echo 🌐 Web Server dang chay tren Cong 80: http://localhost:80
echo.
npm run start

pause
