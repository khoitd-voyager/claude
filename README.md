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
