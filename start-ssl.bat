@echo off
chcp 65001 >nul
title MadBros HTTPS SSL Server (Caddy)

cd /d "%~dp0"

if not exist caddy.exe (
    echo [MadBros SSL] Chưa có file caddy.exe. Đang tự động tải về VPS (15MB)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile 'caddy.exe'"
    if exist caddy.exe (
        echo [MadBros SSL] ✅ Tải caddy.exe thành công!
    ) else (
        echo [MadBros SSL] ❌ Tải thất bại. Vui lòng tải thủ công caddy.exe bỏ vào thư mục này.
        pause
        exit /b 1
    )
)

echo ====================================================
echo 🔒 Đang kích hoạt HTTPS SSL cho: nrovegeta.online
echo 🌐 Proxy chuyển tiếp an toàn tới: localhost:3000
echo ====================================================
caddy.exe run --config Caddyfile
pause
