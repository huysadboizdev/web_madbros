@echo off
title MadBros Enterprise System - Running on Port 80
color 0A

echo ========================================================
echo   🚀 HE THONG QUAN TRI DOANH NGHIEP MADBROS (WINDOWS)
echo ========================================================
echo.

cd /d %~dp0

echo [1/4] Kiem tra va cai dat goi thu vien...
call npm run install:all

echo [2/4] Build Frontend React sang file tinh toi uu...
call npm run build:client

echo [3/4] Khoi tao co so du lieu SQLite va du lieu mau...
cd server
call npx prisma db push
call npx ts-node src/seed.ts
call npm run build
cd ..

echo [4/4] Dang khoi dong Web Server tren Cong 80...
echo 🌐 Ban co the truy cap truc tiep qua Ten Mien hoac IP VPS: http://localhost:80
echo.
npm run start

pause
