# BEXMP Knowledge Index

> ✅ Edit / Write tools are ALLOWED. The only hard rule is MINIMAL DIFF: change ONLY the exact line(s) required and leave every other character untouched.
>
> CRITICAL: This repo uses `.prettierrc` with `"semi": false`. NEVER add semicolons (`;`). NEVER run prettier / format-on-save / any reformatter. Edit ONLY the exact line(s) requested and leave every other character untouched.
>
> CRITICAL — NEVER split a single-line statement into multiple lines (and never join multiple lines into one). If you are not changing the logic of a line, leave it EXACTLY as-is, character for character. Example of a FORBIDDEN change:
> ```ts
> // DO NOT turn this:
> release_date: product.created_at ? new Date(product.created_at).toLocaleDateString('en-ZA') : '',
> // ...into this:
> release_date: product.created_at
>   ? new Date(product.created_at).toLocaleDateString('en-ZA')
>   : '',
> ```
> Keep the original line layout. Only touch a line if its actual logic must change.

## Minimal Diff Policy
- Use the Edit / Write tools for file changes. The only requirement is a MINIMAL DIFF: target the exact line(s) only and touch nothing else.
- In every Edit, `new_string` MUST be byte-for-byte identical to `old_string` EXCEPT for the specific tokens being changed. Do not touch any other character.
- NEVER change quote style: keep `'single'` as single and `"double"` as double. Do not convert `''` <-> `""` under any circumstance.
- NEVER reflow, re-wrap, or split/join lines. Preserve every existing line break exactly. Do not add or remove line breaks except where the actual change requires it.
- Do not change indentation, spacing, semicolons, trailing commas, or line endings.
- Only modify the exact line(s) that must change. Leave all surrounding lines untouched.
- NEVER write comments in Vietnamese. All code comments MUST be in English.
- Never rewrite whole files for small edits.
- Never reorder imports unless required. Never remove imports.
- Do not run formatters/lint fixers (prettier, `eslint --fix`, etc.) at any time unless explicitly requested.
- Note: `ts:watch` / `tsc --noEmit --watch` only type-checks and CANNOT modify source files. If extra changes (semicolons, reflow) appear, YOU caused them by rewriting the file — do not blame background watchers. Re-do the edit touching only the exact line.
- Please review only the parts changed in this PR. No need to review unrelated files or existing logic.
- Allow run npm run test .../src/services/file.spec.ts
- Do not run `npm run build`, `npm run lint`, `yarn build`, `yarn test`, `npm run lint:fix`, or any similar build/test/lint commands after making changes.

## Senior / TA Mode

**Keyword: SENIOR** (alias: **TA**). Khi prompt có keyword này → BẮT BUỘC load skill `senior-mode` và làm đủ Analysis block TRƯỚC khi viết bất kỳ dòng code nào.

Tự động áp dụng (không cần gõ keyword) khi: yêu cầu mơ hồ, task đụng >3 file, hoặc thay đổi API contract / DB schema / shared type.

## Guard-First / Early-Return (bắt buộc khi review & viết code)

**Keyword: GUARD-FIRST.** Cheap checks run BEFORE expensive work. Always.

Order of operations in any function:
1. **In-memory guards first** — type/enum checks (`provider_id !== X`), empty-array checks, null checks, flags. These cost nothing.
2. **Filter + early return** — narrow the input set, then `if (!items.length) return` BEFORE touching anything expensive.
3. **Expensive work last** — DB query, repository call, external API, config fetch, `new SomeService()`.

Anti-pattern to catch (real case: `purchaseAmazonItems` in `be/BEXMP-order/src/services/order.ts`):
```ts
// ❌ WRONG — DB query + throw at the top, provider check buried inside the loop
const config = await ConfigRepository.findOne({ where: {} })
if (!config) throw new Error('config is not set')   // throws even when there is NO amazon item at all
for (const item of items) {
  if (item.provider_id !== AMAZON) continue          // guard is too late
}

// ✅ RIGHT — filter first, bail out, then hit the DB
const amazonItems = items.filter((i) => i.provider_id === AMAZON)
if (!amazonItems.length) return
const config = await ConfigRepository.findOne({ where: {} })
if (!config) throw new Error('config is not set')
```

Why it matters: a late guard is not just a wasted query — it causes **wrong behavior** (throwing/erroring on inputs that should have been skipped silently).

When reviewing or writing a function, ask in this order:
- Can I reject/skip this input using only data already in memory? → do it at the top.
- Is there a DB/API call that runs even when the result would be discarded? → move it below the guard.
- Does an error get thrown for a case that should just be a no-op `return`? → that is a bug, flag it.

## Tech Stack (detected)

- Monorepo shape: `BEXMP-admin`, `BEXMP-storefront`, `be/*` services
- Frontend: Next.js `^14.0.0`, React `^18.2.0`, TypeScript `^5.3.2` (`BEXMP-storefront/package.json:62-67,117`)
- Admin UI: Webpack `^5.84.1`, React `^18.2.0` (`BEXMP-admin/package.json:101,139`)
- Backend: Medusa `1.20.2`, TypeORM `0.3.20`, Express `^4.x` (`be/BEXMP-customer/package.json:55,74,88`)
- State/UI libs: Zustand `^4.5.2`, TailwindCSS `^3.x`, Radix (`BEXMP-storefront/package.json:86,90`; `BEXMP-admin/package.json:46-56,134`)
- Package managers in use: Yarn v1 + npm lockfiles (mixed)

## Repo Structure

```text
BEXMP/
├── BEXMP-storefront/      # Next.js storefront
├── BEXMP-admin/           # React + webpack admin
├── be/                    # Medusa backend services
│   ├── BEXMP-customer/
│   ├── BEXMP-order/
│   ├── BEXMP-product/
│   ├── BEXMP-search/
│   └── BEXMP-cookie-gateway/
└── .opencode/             # AI workflow config
```

## Commands (validated in current environment)

- Validation method: executed `build/test/lint/dev/start` where defined.
- Result: **not passing currently**; most fail from missing local binaries/deps (`cross-env`, `eslint`, `medusa`, `webpack`, `rimraf`).
- Example failures: `be/BEXMP-customer/package.json` scripts need local deps; `BEXMP-storefront/ckeditor5` fails on `webpack` not found.
- Recommendation before feature work: install deps per package (`yarn install` or `npm install`) and re-run package-level checks.

## Code Example (actual)

```ts
const useGlobalStore = create<GlobalStore>((set, get) => ({
  cartCount: 0,
  favoriteCount: 0,
  messageUnreadCount: 0,
  notifyUnreadCount: 0,
  notifyUnreadSidebarCount: 0,
  orderStatus: orderStatusCount,
  auctionStatusCount: auctionStatusCount,
}));
```

Source: `BEXMP-storefront/src/store/global.ts:43-50`

## Testing Conventions

- Storefront uses `next lint` + TypeScript check script (`ts`) (`BEXMP-storefront/package.json:14,21`).
- Admin uses Jest path-targeted tests (`BEXMP-admin/package.json:21`).
- Backends use Jest + ESLint + Medusa build/start lifecycle (`be/BEXMP-customer/package.json:18-31`).

## Boundaries

- **Always:** run checks from the package you changed (not repo root).
- **Ask-first:** dependency upgrades spanning multiple packages; deploy-script edits.
- **Never:** edit generated outputs/build artifacts directly; assume one package manager for all packages.
- 🚫 **Secrets:** TUYỆT ĐỐI KHÔNG đọc file `.env` (hoặc bất kỳ `.env.*` chứa secret thật) dưới mọi hình thức. Chỉ được đọc `.env.template` (không chứa secret thật).

## Gotchas

- No single root `package.json` orchestrator; commands are package-scoped.
- Mixed lockfiles can drift; keep install command aligned to each package lockfile.
- CI workflows are not centralized at repo root (mostly Dependabot configs in backend subrepos).

## BE Task — Test Loop (bắt buộc)
- Áp dụng cho MỌI task có phần Backend (`be/*`): sau khi code xong PHẢI chạy bước test.
- Chạy test (unit test / function test / spec) tương ứng với các test case liệt kê trong `.claude/artifacts/[tag]/[name]/`.
- PASS hết tất cả test case → task DONE.
- FAIL ≥ 1 test case → sửa code rồi chạy test lại. Lặp TỐI ĐA 3 lần. Sau 3 lần vẫn fail → dừng, báo user, không tự ý làm tiếp.
- CHỈ được chạy test qua test runner (`npm run test .../src/services/*.spec.ts`). KHÔNG được tự ý điều khiển máy tính / thao tác GUI / dùng công cụ ngoài để chạy test.
- File `.spec.ts` chỉ để verify tạm: sau khi chạy PASS hết → PHẢI XOÁ file `.spec.ts` đó đi, KHÔNG để lại / không commit vào repo. (FAIL thì giữ lại để sửa; chỉ xoá khi đã pass hết.)