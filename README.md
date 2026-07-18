# Demo — Next.js (FE) + NestJS (BE)

Hai project độc lập:

- `backend/` — NestJS API, chạy ở port **3001** (endpoints: `/hello`, `/items`)
- `frontend/` — Next.js (App Router), chạy ở port **3000**, gọi API từ backend

## Chạy backend

```bash
cd backend
npm install
npm run start:dev
```

## Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:3000 — trang sẽ hiển thị message và danh sách items lấy từ backend.

> FE đọc URL backend qua biến `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:3001`).
> Copy `frontend/.env.local.template` → `frontend/.env.local` nếu muốn đổi.

## Cập nhật `.claude` — v1.2.0 (2026-07-18)

- `/hotfix`, `/qa`: **chỉ mở browser khi truyền cờ `--browser`**. Không có `--browser` → luôn chạy chế độ `static` (không mở browser, không hỏi). Ví dụ: `/hotfix <bug> --browser`, `/qa <slug> --browser`.
- `/repro`, `/hotfix` (khi có `--browser`), `/qa` (khi có `--browser`): ép mở **cửa sổ Chrome THẬT, hiển thị được — KHÔNG headless** để người dùng xem được flow chạy trực tiếp. Dùng `chromium.launch({ headless: false, slowMo: 800, channel: 'chrome' })` (`slowMo` ~600–900ms cho mỗi thao tác thấy được; fallback bundled chromium nếu thiếu channel `chrome`).

## Cập nhật `.claude` — v1.1.0 (2026-07-18)

- `/hotfix`: thêm bước chọn chế độ reproduce (`static` mặc định / `chrome-devtools` để drive Chrome tái hiện bug UI), kèm hướng dẫn thu evidence (screenshot, console, network) lưu ở `.claude/artifacts-hotfix/<slug>/`.
- `/qa`: thêm chế độ test FE `chrome-devtools` (tự drive Chrome chạy scenario E2E) bên cạnh `static`; BE vẫn chạy bằng spec.
- Thêm command mới `/repro` — drive Chrome đi qua một flow để tái hiện bug / test feature, capture screenshot + console + network làm evidence (không sửa source).
- Gỡ `.claude/settings.local.json`.

> ⚠️ **Lưu ý:** Một số command vẫn còn đặt tên theo dự án BEX (ví dụ trong `/qa` mục `### FE (storefront / admin)`, cùng các tên `be/*`, `BEXMP-*`). Vui lòng ĐỌC KỸ và ĐỔI lại cho đúng tên FE/BE của dự án bạn đang làm trước khi dùng.
