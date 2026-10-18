# Xây dựng Backend Hệ thống Tính toán Thiết kế Buồng lắng bụi (Dust Settling Chamber)

Dự án tập trung ứng dụng kiến trúc **NestJS** chuẩn kỹ nghệ phần mềm để giải quyết bài toán tự động hóa tính toán thiết kế trong kỹ thuật xử lý khí thải: **Hệ thống xử lý bụi bằng buồng lắng trọng lực**.

Stack công nghệ sử dụng: **NestJS, PostgreSQL, Redis, RabbitMQ & Docker**.

## Trọng tâm Nghiệp vụ & Kiến trúc Kỹ thuật (Technical Focus)

Hệ thống chuẩn hóa toàn bộ quy trình tính toán kỹ thuật thành RESTful API thông qua các luồng xử lý cốt lõi:

1. **Tự động hóa Tính toán Thiết kế (Core Calculation Engine):**
   - **Kích thước & Quỹ đạo hạt bụi:** Tính toán hệ số nhớt động lực học (μ), khối lượng riêng khí thải (ρ_k), vận tốc lắng (v_ts), đường kính hạt giới hạn (d_min) và kích thước buồng lắng (L, B, H).
   - **Hiệu suất & Thông số đầu ra:** Tính hiệu suất xử lý theo từng dải phân cấp cỡ hạt, tổng lượng bụi thu được mỗi giờ/ngày và nồng độ bụi còn lại sau xử lý.
   - **Đường ống & Quạt hút:** Tính đường kính ống dẫn khí, tổn thất áp suất do ma sát (ΔP_ms), tổn thất cục bộ (ΔP_cb), tổng trở lực hệ thống (ΔP_ht) và công suất quạt hút (N_q).
2. **Kiến trúc & Phân quyền (NestJS Core, Guards, Filters):**
   - Tổ chức code theo kiến trúc Modular, áp dụng Dependency Injection (DI), ValidationPipe và bộ lọc lỗi tập trung (`ServiceErrorsFilter`).
   - Xác thực JWT và phân quyền theo vai trò người dùng (`ENGINEER`, `ADMIN`).
3. **Xử lý bất đồng bộ (RabbitMQ Worker):**
   - Đẩy các tác vụ xuất báo cáo thuyết minh tính toán và gửi email thông báo xuống hàng đợi chạy ngầm, giúp giải phóng luồng chính và phản hồi HTTP tức thì.
4. **Tối ưu hiệu năng & Bảo vệ tài nguyên (Redis):**
   - **Caching:** Lưu đệm các bảng tra cứu thông số kỹ thuật (như bảng hệ số hiệu chỉnh nhiệt độ α) và lịch sử các phiên tính toán.
   - **Rate Limiting:** Kiểm soát tần suất gửi request tính toán liên tục.

## Cấu trúc Thư mục Đề tài

```text
src/
├── commons/              # Bộ lọc lỗi (Filters), Helpers, định nghĩa mã lỗi & phản hồi chuẩn
├── modules/
│   ├── auth/             # Xác thực người dùng & cấp phát Token (Access/Refresh Token)
│   ├── users/            # Quản lý tài khoản người dùng
│   └── calculations/     # (Dự kiến) Module tính toán buồng lắng, đường ống và quạt hút
├── app.module.ts
├── config.ts             # Cấu hình biến môi trường (Database, JWT, Redis, RabbitMQ)
└── main.ts               # Khởi tạo ứng dụng, Global Pipes, Filters & tài liệu Swagger
```

## Yêu cầu hệ thống (Prerequisites)

- **Node.js**: Phiên bản 20.x trở lên.
- **Docker Desktop**: Bắt buộc phải cài để chạy hạ tầng Database, Cache và Message Queue.
- **Git**: Khuyên dùng Git Bash trên Windows.

## Hướng dẫn cài đặt & Khởi chạy dự án

**Bước 1: Clone dự án và cài đặt thư viện**
Mở terminal và chạy lần lượt các lệnh sau:

```bash
git clone https://github.com/tlong1312/dust-chamber-backend.git
cd dust-chamber-backend
npm install
```

_(Lưu ý: Chỉ sử dụng `npm install`, không dùng yarn hay pnpm để tránh sai lệch file lock)._

**Bước 2: Cấu hình biến môi trường (.env)**
Tạo file `.env` ở thư mục gốc bằng cách copy từ mẫu:

```bash
cp .env.example .env
```

Mở file `.env` vừa tạo và điền các thông số chuẩn cho môi trường local:

```env
PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5436
DB_USER=postgres
DB_PASS=123456
DB_NAME=dust_chamber_db

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5674

# Redis
REDIS_HOST=localhost
REDIS_PORT=6382
```

**Bước 3: Dựng hạ tầng với Docker**
Đảm bảo Docker Desktop đang mở, chạy lệnh sau để kéo image và khởi động các services (PostgreSQL, RabbitMQ, Redis):

```bash
docker compose up -d
```

**Bước 4: Khởi chạy Server NestJS**

```bash
npm run start:dev
```

Server sẽ chạy tại `http://localhost:3001`. Chế độ Hot-reload đã được bật, code lưu file là server tự restart.

## Quy trình Commit & Push Code (Quan trọng)

Hệ thống đã được tích hợp GitHub Actions chặn lỗi tự động (CI). Vui lòng tuân thủ quy trình sau:

1. Không code trực tiếp trên nhánh `main`. Hãy tạo nhánh riêng: `git checkout -b feature/ten-chuc-nang`
2. Đặt tên commit có tiền tố rõ ràng: `feat:` (tính năng mới), `fix:` (sửa lỗi), `chore:` (cấu hình), `refactor:` (tối ưu code).
3. Sau khi push nhánh lên GitHub, tạo Pull Request (PR).
4. **Chỉ merge code khi tiến trình "Backend CI" trên GitHub báo tích xanh.** Nếu báo đỏ, vui lòng click vào xem log lỗi (thường là lỗi ESLint, build hoặc Unit Test) và fix lại.
