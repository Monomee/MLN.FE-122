# Học mỗi ngày · MLN122 Web

Ứng dụng ôn trắc nghiệm local-first bằng React + TypeScript + Vite. Không yêu cầu tài khoản hoặc backend. Dữ liệu câu hỏi gốc 526 câu được giữ nguyên trong `data/questions.json`; source Expo cũ vẫn còn ở `App.js`, `app.json`, `assets/`, cùng manifest/README cũ tại `legacy/`.

**Trạng thái kiểm chứng:** full TypeScript và production build PASS; 22 domain checks, 30 unit/UI tests và 36 E2E tests desktop/mobile PASS. Bản static đủ điều kiện deploy trong phạm vi Chromium đã kiểm thử. Dev optimizer trong sandbox Windows và thao tác cài mới browser cache còn giới hạn quyền; xem [báo cáo](docs/delivery-report.md).

## Cài đặt và chạy

Yêu cầu Node.js 22.12+ (đã dùng Node 24.15 để chạy domain checks) và kết nối npm registry.

```sh
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định `http://127.0.0.1:5173`). Trên PowerShell nếu chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`, không cần đổi execution policy.

Lockfile web hiện có tại `package-lock.json`; dùng `npm ci` cho cài đặt tái tạo trong CI. Lockfile Expo cũ giữ tại `legacy/package-lock.json`, không dùng với bản web.

Trong sandbox Windows hiện tại, native esbuild bị từ chối đọc thư mục cha khi dev prebundling. Bản production đã được chạy thực tế bằng:

```sh
npm run build
npm run preview
```

Các scripts dùng Vite configLoader runner để tránh lỗi permission khi bundle config. Đây không phải việc bỏ qua TypeScript hoặc thay thế thư viện.

## Chức năng

- Dashboard: tiến trình, độ chính xác, lịch ôn hôm nay, sao, thời gian học, streak và biểu đồ 7/30 ngày; tiếp tục phiên đang học.
- Nhiều môn học, học tuần tự hoặc ngẫu nhiên với seed và thứ tự đáp án lưu chính xác; lọc chủ đề/chưa học/từng sai/sao, số lượng câu tùy chọn.
- Chấm điểm dùng chung: phải chọn chính xác toàn bộ đáp án. Không giới hạn A–D; hỗ trợ radio/checkbox; phím 1–9 hoặc chữ, Enter; không bắt shortcut khi nhập liệu.
- Nhóm học 20/50/100, xem câu trước, kiểm tra rồi tiếp tục, sao, ôn sai trong phiên sau N câu khác (mặc định 7), xử lý hàng chờ cuối phiên. Học lại nhóm hoặc ôn câu sai rồi quay lại nhóm kế tiếp.
- Lịch ôn theo ngày độc lập: 1/3/7/14/30 ngày, có thể cấu hình. Sai quay về mức 0, đúng tăng một mức tối đa 5.
- Thi thử: số câu/thời gian tùy chọn, trộn câu/đáp án, bỏ qua, cờ xem lại, bảng điều hướng, deadline tồn tại qua reload, tự nộp khi hết giờ kể cả đang ở trang khác. Xác nhận nộp sớm; kết quả chi tiết, làm lại cùng đề, ôn sai và lịch sử.
- Thống kê từ từng attempt: hoạt động theo ngày, đúng/sai, môn học, ôn tập, điểm thi, chủ đề yếu và nhóm câu hỏi.
- Ngân hàng câu: tìm kiếm, lọc, phân trang, chi tiết/đáp án, import JSON/TXT có kiểm tra và xem trước, không tự ghi đè.
- Cài đặt sáng/tối/hệ thống, auto-advance, hiệu ứng, trộn đáp án, khoảng ôn và thời gian thi; reset riêng môn/toàn bộ tiến trình có xác nhận; backup version 1 có xác nhận khôi phục.
- Dexie IndexedDB với migration, hàng đợi ghi và revision chống tab khác ghi đè; lỗi lưu hiển thị rõ, không tự xóa dữ liệu hỏng.

## Kiểm thử

```sh
npm test
npm run typecheck
npm run check:domain
npm run check:domain-types
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Vitest + React Testing Library trong `src/**/*.test.*`; IndexedDB dùng fake-indexeddb trong unit tests. Playwright cấu hình Chromium desktop và Pixel 7 trong `e2e/`. `npm run test:e2e` build trước, rồi global setup mở và đóng production preview tự động, không phụ thuộc dev optimizer. Port 5173 cần trống. Mỗi test có context riêng; kiểm tra browser restart dùng profile riêng trong test-results.

Kết quả máy được lưu ở `test-results/results.json`; [bản tóm tắt QA](docs/qa/verification.json) và ảnh desktop/mobile nằm tại `docs/qa/`. Trong sandbox không ghi được cache browser mặc định, lượt QA dùng Chromium v1248 đã cài sẵn; máy mới cần chạy lệnh cài Chromium với quyền ghi cache.

`check:domain` dùng Node test runner và compiler TypeScript để kiểm tra logic thuần độc lập; không thay thế Vitest, kiểm thử IndexedDB hoặc trình duyệt. `node scripts/check-syntax.cjs` chỉ kiểm tra cú pháp TS/TSX, không thay kiểm tra kiểu toàn ứng dụng.

## Cấu trúc

```text
src/app/                 Router và khởi động
src/components/          Layout, câu hỏi, biểu đồ, dialog, common UI
src/features/            Dashboard, subjects, practice, review, exam,
                         statistics, question-bank, settings
src/domain/              Models, grading, shuffle, review, exam,
                         analytics, backup/reset (không phụ thuộc UI)
src/data/                Converter nguồn cũ, JSON/TXT parser, validation
src/store/               Zustand và các action nghiệp vụ
src/db/                  Dexie, migration, transaction, revision
src/hooks/               Keyboard shortcuts
src/tests/               Test setup
e2e/                     Playwright flows
scripts/                 Kiểm tra domain/cú pháp độc lập
docs/                    Audit, kế hoạch, format dữ liệu, báo cáo
```

IndexedDB v1 lưu snapshot ứng dụng trong `documents`; v2 thêm revision bằng migration. Transaction ghi toàn bộ snapshot, nên lựa chọn/lịch sử không bị ghi một phần. Backup được validate trước transaction thay thế; nếu validation hoặc transaction thất bại, bản đã lưu vẫn còn. Khi tab khác đã ghi, ứng dụng báo lỗi và yêu cầu tải lại; có thể xuất snapshot hiện tại trước để giữ các thay đổi chưa lưu.

## Deploy static

GitHub Pages cho repository **Monomee/MLN.FE-122** đã được publish tại **https://monomee.github.io/MLN.FE-122/**. Workflow build/test/deploy dùng HashRouter và kiểm tra lại website công khai sau mỗi lần deploy. Xem [hướng dẫn GitHub Pages và trạng thái triển khai](docs/github-pages.md).

Sau khi tests và build thành công:

| Nền tảng | Build command | Output | Điều hướng SPA |
|---|---|---|---|
| Vercel | `npm run build` | `dist` | `vercel.json` |
| Netlify | `npm run build` | `dist` | `public/_redirects` được copy sang dist |
| Cloudflare Pages | `npm run build` | `dist` | Cùng `_redirects` |
| GitHub Pages | `VITE_GITHUB_PAGES=true npm run build` (workflow tự đặt env) | `dist` | HashRouter, URL `/MLN.FE-122/#/...` |

Không cần backend hoặc secrets. Chọn Node 22.12+ hoặc 24 trong cấu hình host. Chỉ publish output dist. Build mặc định dành cho root domain/subdomain; build với VITE_GITHUB_PAGES=true dành cho subdirectory `/MLN.FE-122/`. Kiểm tra link trực tiếp và reload trang học/thi sau deploy. Cú pháp env trong bảng là POSIX; lệnh PowerShell có tại tài liệu Pages.

## Dữ liệu và giới hạn

- [Audit source](docs/source-audit.md), [định dạng JSON/TXT/backup](docs/data-format.md), [kết quả kiểm chứng](docs/delivery-report.md).
- IndexedDB thuộc từng browser/profile/origin. Chuyển host, dùng browser khác, chế độ riêng tư hoặc xóa dữ liệu trình duyệt có thể làm mất quyền truy cập tiến trình; xuất backup để chuyển thiết bị/origin.
- Không đồng bộ cloud. Không tự chuyển tiến trình AsyncStorage trên thiết bị Expo sang web; hai schema/storage khác nhau. Không tạo lịch sử giả từ tổng thống kê cũ.
- Dữ liệu local-first; chưa có service worker/PWA để cam kết tải trang offline. Mạng vẫn cần để tải ứng dụng static lần đầu và sau cache eviction.
- Nhập file tối đa 20 MB. Snapshot toàn bộ phù hợp bộ câu hiện tại; cần benchmark/phân tách bảng khi lịch sử tăng rất lớn. Build còn cảnh báo entry khoảng 603 kB (159 kB gzip). Chưa benchmark, audit dependencies hoặc xác minh Safari/Firefox/mobile vật lý.
- Không thay đổi nội dung học thuật hoặc tự bổ sung đáp án. Các ví dụ format trong tài liệu không được nạp thành câu hỏi.
