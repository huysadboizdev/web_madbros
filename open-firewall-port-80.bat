@echo off
title Mo Cong 80 va 443 tren Windows Firewall
color 0B

echo ========================================================
echo   🔥 MO CONG 80 (HTTP) & 443 (HTTPS) TREN WINDOWS FIREWALL
echo ========================================================
echo.
echo Vui long chay file nay bang quyen Run as Administrator neu bi bao loi.
echo.

netsh advfirewall firewall add rule name="MadBros Web Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="MadBros Web Port 443" dir=in action=allow protocol=TCP localport=443

echo.
echo ✅ Da mo thanh cong cong 80 va 443!
echo Gio day nguoi dung co the truy cap vao ten mien cua ban.
echo.
pause
