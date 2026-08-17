import bcrypt from 'bcryptjs';
import { prisma } from './config/db';

async function main() {
  console.log('🌱 Đang khởi tạo dữ liệu mẫu ban đầu (Seeding database)...');

  // Clear existing
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. Tạo Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Công Ty Công Nghệ MadBros',
      code: 'MADBROS',
      settings: {
        create: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpFrom: 'Hệ Thống Quản Trị MadBros <no-reply@madbros.vn>',
        },
      },
    },
  });

  // 2. Tạo Người dùng mẫu
  const admin = await prisma.user.create({
    data: {
      email: 'admin@madbros.vn',
      name: 'Nguyễn Văn Quản Trị',
      password: hashedPassword,
      role: 'ADMIN',
      workspaceId: workspace.id,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@madbros.vn',
      name: 'Trần Thị Trưởng Phòng',
      password: hashedPassword,
      role: 'MANAGER',
      workspaceId: workspace.id,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: 'dev@madbros.vn',
      name: 'Lê Hoàng Lập Trình',
      password: hashedPassword,
      role: 'MEMBER',
      workspaceId: workspace.id,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 3. Tạo Công việc cha & Công việc con
  const task1 = await prisma.task.create({
    data: {
      title: 'Triển khai Web Quản Lý Doanh Nghiệp lên VPS Windows',
      description: 'Cài đặt Node.js, cấu hình trỏ tên miền trực tiếp, tối ưu hóa RAM cho VPS 2GB.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      workspaceId: workspace.id,
      assignees: {
        create: [{ userId: dev.id }, { userId: admin.id }],
      },
      subtasks: {
        create: [
          { title: 'Xây dựng Backend Express & CSDL SQLite', isCompleted: true, assignedToId: dev.id },
          { title: 'Thiết kế giao diện React Vite + Tailwind đẹp mắt', isCompleted: true, assignedToId: dev.id },
          { title: 'Cấu hình cổng 80 và mở Firewall Windows', isCompleted: false, assignedToId: dev.id },
          { title: 'Trỏ bản ghi A từ tên miền về IP VPS', isCompleted: false, assignedToId: admin.id },
        ],
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Kế hoạch Họp & Truyền thông Quý 3',
      description: 'Lên danh sách lịch họp định kỳ toàn công ty và tối ưu quy trình thông báo qua email.',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: manager.id,
      workspaceId: workspace.id,
      assignees: {
        create: [{ userId: manager.id }],
      },
      subtasks: {
        create: [
          { title: 'Soạn thảo nội dung lịch họp hàng tuần', isCompleted: false, assignedToId: manager.id },
          { title: 'Gửi email xác nhận tham gia cho nhân sự', isCompleted: false, assignedToId: manager.id },
        ],
      },
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Kiểm toán & Cân đối Dòng tiền Tháng 8',
      description: 'Rà soát các khoản thu từ khách hàng dự án và chi phí vận hành văn phòng.',
      priority: 'URGENT',
      status: 'DONE',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdById: admin.id,
      workspaceId: workspace.id,
      assignees: {
        create: [{ userId: admin.id }],
      },
      subtasks: {
        create: [
          { title: 'Tổng hợp hóa đơn chi tiêu', isCompleted: true, assignedToId: admin.id },
          { title: 'Nhập số liệu phiếu thu hợp đồng', isCompleted: true, assignedToId: admin.id },
        ],
      },
    },
  });

  // 4. Tạo Lịch họp & Thành viên tham gia
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 30, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(10, 30, 0, 0);

  await prisma.meeting.create({
    data: {
      title: 'Họp Tổng Kết Sprint & Demo Tính Năng Mới',
      description: 'Rà soát các task đã hoàn thành trong tuần, phân công việc tuần tới cho mọi người.',
      meetingLink: 'https://meet.google.com/mad-bros-meet',
      location: 'Google Meet / Phòng họp A',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      notifyAll: true,
      workspaceId: workspace.id,
      createdById: admin.id,
      participants: {
        create: [
          { userId: admin.id, status: 'ACCEPTED' },
          { userId: manager.id, status: 'ACCEPTED' },
          { userId: dev.id, status: 'INVITED' },
        ],
      },
    },
  });

  // 5. Tạo Giao dịch Dòng tiền (Thu / Chi)
  const now = new Date();
  const transactionsData = [
    { type: 'INCOME', amount: 45000000, category: 'Doanh thu Hợp đồng', description: 'Thanh toán đợt 1 dự án Web E-commerce', daysAgo: 10, createdById: admin.id },
    { type: 'INCOME', amount: 28000000, category: 'Dịch vụ Bảo trì', description: 'Phí bảo trì hệ thống định kỳ', daysAgo: 5, createdById: admin.id },
    { type: 'EXPENSE', amount: 15000000, category: 'Thuê văn phòng', description: 'Tiền thuê văn phòng tháng này', daysAgo: 12, createdById: admin.id },
    { type: 'EXPENSE', amount: 30000000, category: 'Lương & Thưởng', description: 'Chi trả lương nhân viên đợt 1', daysAgo: 7, createdById: admin.id },
    { type: 'EXPENSE', amount: 3500000, category: 'Thiết bị & Công nghệ', description: 'Mua bản quyền phần mềm và server VPS', daysAgo: 3, createdById: admin.id },
    { type: 'EXPENSE', amount: 1800000, category: 'Ăn uống & Tiếp khách', description: 'Tiếp khách hàng đối tác ký hợp đồng', daysAgo: 1, createdById: manager.id },
    { type: 'INCOME', amount: 35000000, category: 'Doanh thu Hợp đồng', description: 'Tạm ứng hợp đồng phát triển ứng dụng di động', daysAgo: 0, createdById: admin.id },
  ];

  for (const t of transactionsData) {
    const d = new Date(now);
    d.setDate(d.getDate() - t.daysAgo);
    await prisma.transaction.create({
      data: {
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: d,
        workspaceId: workspace.id,
        createdById: t.createdById,
      },
    });
  }

  // 6. Thông báo mẫu
  await prisma.notification.createMany({
    data: [
      {
        userId: dev.id,
        title: 'Phân công công việc mới',
        content: 'Bạn đã được phân công vào công việc "Triển khai Web Quản Lý Doanh Nghiệp lên VPS Windows"',
        type: 'TASK',
        link: `/tasks?id=${task1.id}`,
      },
      {
        userId: dev.id,
        title: '📅 Lịch họp mới',
        content: 'Họp Tổng Kết Sprint & Demo Tính Năng Mới lúc 09:30 ngày mai',
        type: 'MEETING',
      },
    ],
  });

  console.log('✅ Đã seed dữ liệu mẫu thành công!');
  console.log('-----------------------------------------');
  console.log('🔑 Tài khoản mẫu:');
  console.log('👉 Email: admin@madbros.vn | Mật khẩu: 123456 (Quản trị viên)');
  console.log('👉 Email: manager@madbros.vn | Mật khẩu: 123456 (Trưởng phòng)');
  console.log('👉 Email: dev@madbros.vn | Mật khẩu: 123456 (Nhân viên)');
  console.log('👉 Mã Workspace mời nhân viên: MADBROS');
  console.log('-----------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
