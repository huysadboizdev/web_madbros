# 🚀 Hệ Thống Quản Lý Doanh Nghiệp MadBros (Fullstack)

Hệ thống web quản lý doanh nghiệp toàn diện, siêu nhẹ, tối ưu riêng cho **VPS Windows Server (2 Core - 2GB RAM - 30GB SSD)**:
- **Quản lý công việc phân cấp**: Công việc cha chứa nhiều việc con (subtasks), tự động tính % tiến độ.
- **Lịch họp & Gửi Email tự động**: Đặt lịch họp, tự động gửi thư mời HTML qua Gmail SMTP đến toàn bộ thành viên trong Workspace.
- **Quản lý Dòng tiền (Thu/Chi)**: Sổ giao dịch, số dư khả dụng và biểu đồ tài chính trực quan.
- **Hệ thống Workspace & Đội ngũ**: Mã mời (Invite code) 1-click để nhân viên cùng gia nhập.

---

## 🌐 Hướng Dẫn Trỏ Tên Miền Về VPS Để Web Chạy Ngay

### Bước 1: Cấu hình DNS trên nhà cung cấp Tên miền (Cloudflare / Namecheap / PA Vietnam / MatBao...)
1. Vào trang quản lý DNS của tên miền của bạn.
2. Thêm 1 bản ghi **Type A**:
   - **Host / Name**: `@` (hoặc tên miền phụ như `portal` nếu dùng `portal.domain.com`)
   - **Value / IP Address**: `IP_CỦA_VPS_CỦA_BẠN` (Ví dụ: `103.x.x.x`)
   - **TTL**: Tự động hoặc 5 phút.
3. (Tùy chọn) Thêm 1 bản ghi **CNAME**:
   - **Name**: `www`
   - **Value**: `@`

> [!TIP]
> Nếu bạn sử dụng Cloudflare, hãy bật đám mây màu cam (Proxy ON) và chọn chế độ **SSL: Flexible** hoặc **Full**. Tên miền của bạn sẽ tự động có chứng chỉ HTTPS (ổ khóa xanh) miễn phí mà không cần cấu hình SSL trên Windows!

---

### Bước 2: Khởi chạy Web Server trên VPS Windows

1. **Mở cổng 80 & 443 trên VPS**:
   - Nhấp chuột phải vào file **`open-firewall-port-80.bat`** -> Chọn **Run as Administrator**.
2. **Khởi chạy ứng dụng**:
   - Nhấp đúp vào file **`start-windows.bat`**. Hệ thống sẽ tự động cài đặt thư viện, build Frontend tĩnh và khởi chạy web trên cổng **80**.

Sau đó, bạn chỉ cần mở trình duyệt và gõ `http://ten-mien-cua-ban.com` là website sẽ chạy ngay lập tức!

---

## 🔑 Tài Khoản Đăng Nhập Mẫu Ban Đầu

| Vai trò | Địa chỉ Email | Mật khẩu |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@madbros.vn` | `123456` |
| **Trưởng phòng (Manager)** | `manager@madbros.vn` | `123456` |
| **Nhân viên (Member)** | `dev@madbros.vn` | `123456` |

👉 **Mã mời tham gia Workspace**: `MADBROS`

---

## ⚙️ Cấu Hình Gửi Email Thông Báo Lịch Họp (Gmail SMTP)

1. Đăng nhập tài khoản Admin -> Vào mục **Cài Đặt** trên thanh menu.
2. Tại phần **Cấu Hình Gửi Mail Tự Động (SMTP)**:
   - **SMTP Host**: `smtp.gmail.com`
   - **Cổng**: `587`
   - **Tài khoản**: Địa chỉ Gmail của công ty bạn (Ví dụ: `contact.madbros@gmail.com`)
   - **Mật khẩu ứng dụng**: Mật khẩu ứng dụng 16 ký tự tạo trong Google Security (App Password).
   - **Tên hiển thị**: `Ban Quản Trị MadBros <no-reply@madbros.vn>`
3. Bấm **Lưu Cấu Hình** và nhập email của bạn vào ô **Gửi Thử** để kiểm tra!
