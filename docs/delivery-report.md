# Báo cáo bàn giao

Ngày: 2026-10-30.

## 1. Đã triển khai trong source

Đã audit source thực tế và chuyển từ entry Expo sang React/TypeScript/Vite. Đã viết model, converter/validator, grading, seeded shuffle, ôn trong phiên, lịch ôn dài hạn, exam/deadline, analytics, backup/reset, persistence Dexie/Zustand và router/UI cho đủ các trang chính. Có styles responsive, theme, keyboard, loading/empty/error, dialog native và trạng thái lưu. Chi tiết tính năng và lệnh sử dụng ở README.

**Kết quả xác minh tích hợp bổ sung:** full TypeScript và production build thành công; 22 domain checks, 30 Vitest/RTL, 36 E2E root và 6 E2E Pages PASS trên GitHub Actions. Đã publish tại https://monomee.github.io/MLN.FE-122/, lượt triển khai đầu 41061378012 thành công với source commit 388eb8da002a42815724a991010c0ab4ca3e2a76. Kiểm tra live được chạy từ GitHub runner vì browser sandbox không được truy cập internet công khai. Các giới hạn môi trường local bên dưới vẫn được ghi riêng.

## 2. Kế thừa source cũ

- Toàn bộ 526 câu và đáp án/note nguyên trạng, đúng thứ tự; ID ổn định từ ID gốc.
- Chọn một/nhiều đáp án, chấm ngay, feedback đúng/sai, sao, nhóm học mặc định 50, hàng chờ sai với khoảng mặc định 7, lưu tiến trình và light/dark.
- Quy tắc ôn đã sửa: chỉ câu đến hạn vào lượt ôn, bộ đếm tính câu trả lời mới thay vì vị trí/điều hướng, flush cuối phiên. Mọi chế độ ghi lịch sử, không bỏ sót starred như source cũ.

## 3. Chức năng mới

Môn học mở rộng qua import, JSON/TXT preview/confirm, random seed/filter, nhóm 20/50/100, câu trước, ngày ôn 5 mức, thi thử cấu hình đầy đủ và lịch sử, dashboard/biểu đồ, thống kê từng attempt, ngân hàng tìm/lọc/phân trang, system theme, settings, versioned backup, reset từng môn, transaction/migration/revision cho IndexedDB, RTL/Vitest/Playwright test source và hướng dẫn static hosting.

## 4. File quan trọng

| File/thư mục | Vai trò |
|---|---|
| `docs/source-audit.md` | Chức năng, dữ liệu và lỗi source cũ |
| `data/questions.json` | Dữ liệu gốc, không sửa |
| `src/data/importers.ts`, `validation.ts`, `builtin.ts` | Chuẩn hóa, nhập, schema và bootstrap |
| `src/domain/learning.ts` | Chấm điểm, seed, queue, SRS, thi |
| `src/domain/backup.ts`, `analytics.ts`, `models.ts` | Backup/reset, thống kê, kiểu dữ liệu |
| `src/db/database.ts` | Dexie v1/v2 và atomic writes |
| `src/store/useStudyStore.ts` | State nghiệp vụ, lưu tuần tự, restore, exam actions |
| `src/features/` | Tám nhóm trang chức năng |
| `src/components/QuestionCard.tsx` | UI đáp án dùng chung luyện tập/thi |
| `src/app/App.tsx` | Router, bootstrap và timer thi cấp ứng dụng |
| `src/**/*.test.*`, `e2e/study.spec.ts` | Unit/UI/E2E đã viết |
| `scripts/check-domain.cjs` | Checks domain thực tế chạy bằng Node |
| `README.md`, `docs/data-format.md` | Chạy/deploy và hợp đồng file nhập |

## 5. Kết quả kiểm chứng thực tế

| Kiểm tra | Kết quả |
|---|---|
| Node.js / npm | v24.15.0 / 11.12.1 |
| `npm install --cache .npm-cache --fetch-retries=0 --fetch-timeout=20000 --no-audit --no-fund` | PASS, exit 0, up to date; `npm ls --depth=0` xác nhận đủ dependencies, không conflict. Không dùng force/legacy-peer-deps |
| `npm run typecheck` | PASS, exit 0, kiểm tra toàn bộ src, config và e2e bằng TypeScript 5.9.3, không bỏ qua lỗi |
| `npm run check:domain` | 22/22 PASS, exit 0, không skipped; dùng TypeScript đã cài trong node_modules |
| `npm run check:domain-types` | PASS, exit 0 |
| `npm test` | 30/30 PASS trong 7 file, exit 0, không failed/skipped |
| `npx playwright install chromium` | Chạy nhưng không hoàn tất trong sandbox; quyền tạo `C:/Users/hoang/AppData/Local/ms-playwright/__dirlock` bị EPERM. Đã dừng tiến trình chờ; không tuyên bố cài browser thành công |
| `npx playwright install --dry-run chromium` | PASS; xác nhận browser cần v1248 trùng Chromium 156.0.8078.4 đã có sẵn. E2E dùng browser thật này |
| `npm run test:e2e` | 36/36 PASS, 18 ca desktop + 18 ca Pixel 7 emulation, 0 failed/flaky/skipped, exit 0, khoảng 1,5 phút |
| `npm run build` | PASS, exit 0, full tsc rồi Vite 7.3.7 tạo dist; có cảnh báo chunk lớn được ghi dưới đây |
| `npm run dev` | Vite nạp config được bằng runner; dependency prebundling vẫn bị native esbuild từ chối đọc thư mục cha trong sandbox. Chưa xác nhận HMR/dev optimizer hoạt động ở môi trường này |
| Production preview | PASS: E2E tự chạy Vite Preview bằng API và tự đóng server; không cần server có sẵn |
| So sánh 526 câu với JSON nguồn | PASS: mọi content/options/answers/notes và thứ tự |
| SHA256 data/questions.json | Giữ nguyên `5cc9066db0d529086f2890e639adb6580240eec1c215ed72b5f4ec4b4d069f60` |

Lỗi registry EACCES và thiếu thư viện trong báo cáo trước là kết quả của lượt triển khai đầu. Lần xác minh này `npm install` thành công với dependencies đã hiện diện; không phát hiện conflict và không cần thay dependency versions. Không suy luận rằng mọi kết nối mạng/sandbox permission đã được mở. Lockfile web hiện có tại package-lock.json (lockfileVersion 3); manifest/lock Expo vẫn lưu tại legacy/.

Domain checks đã chạy: lossless conversion; single/multi/partial/extra grading; seeded shuffle và key stability; exam score/blank/deadline; queue sau N và không trùng; ôn cuối phiên; nhóm học; SRS; parser/schema lỗi; serialize/restore snapshot; backup version roundtrip; reset riêng môn; ngày/streak/time analytics; hồi quy điều hướng không đẩy sớm lịch ôn; từ chối trường bị ép kiểu và ID thuộc Object.prototype.

Các luồng browser đã PASS trên cả hai viewport:

- Dashboard/chọn môn; ngân hàng phân trang đủ 526 câu và so sánh dữ liệu IndexedDB với toàn bộ JSON nguồn.
- Một đáp án; câu nhiều đáp án thật trong bộ nguồn: chọn thiếu bị tính sai, chọn đầy đủ được tính đúng.
- Sai câu đầu, hoàn thành 7 câu khác, reload giữa phiên, câu sai đến lượt ôn và hàng chờ không trùng.
- Random seed, trộn đáp án, lưu lựa chọn và khôi phục chính xác cả hai thứ tự sau reload; chấm theo khóa gốc.
- Thi thử, không lộ đáp án trước nộp, xác nhận nộp, điểm đúng/sai/bỏ trống, reload và mở lại lịch sử.
- Hết giờ tự nộp, kể cả chuyển sang Dashboard; unit test xác nhận nộp idempotent ở đúng deadline.
- Import TXT có preview/confirm, export backup và khôi phục; backup tham chiếu ID hỏng bị từ chối, dữ liệu cũ còn nguyên sau reload.
- Hai tab cùng mở phiên: tab cũ nhận lỗi revision khi ghi, không đè đáp án mới; reload phục hồi bản đã lưu.
- Reset môn nhập thêm giữ nguyên tiến trình/lịch sử MLN122; bộ câu hỏi không bị xóa.
- Đóng hoàn toàn browser profile rồi mở lại: IndexedDB và lịch sử trả lời còn nguyên.
- Mọi trang chính không tràn ngang; dark mode tồn tại qua reload; phím chọn/Enter hoạt động; unit tests xác nhận không bắt phím khi nhập liệu hoặc dùng modifier.
- Tương phản nút chính sau khi theme transition hoàn tất đạt WCAG AA ≥ 4,5:1 ở light/dark. Đây là kiểm tra thành phần cụ thể, không phải chứng nhận toàn bộ accessibility.

Unit IndexedDB dùng fake-indexeddb còn xác nhận migration v1 → v2 giữ nguyên snapshot và bổ sung revision. Đã xem ảnh QA desktop/mobile. Báo cáo máy tại [qa/verification.json](qa/verification.json); ảnh [desktop](qa/dashboard-desktop-dark.png) và [mobile](qa/dashboard-mobile-dark.png). Playwright report đầy đủ được sinh lại ở test-results/results.json; log console cục bộ tại .tooling/e2e-complete.log.

Đã rà soát source độc lập và sửa các lỗi phát hiện: coercion tại biên backup, key kế thừa prototype, lịch ôn chạy theo điều hướng, auto-submit phụ thuộc trang thi, modal không khóa nền. Những sửa liên quan logic thuần có regression checks; sửa UI/persistence vẫn chờ thư viện để kiểm chứng tích hợp.

Lỗi đã sửa trong lượt tích hợp này:

1. TS2345 ở Subjects: `crypto.randomUUID()` khiến React state suy luận kiểu UUID template literal; khai báo state là string để nhận seed người dùng nhập. Không dùng any hoặc bỏ qua typecheck.
2. Nút đáp án ghép liền khóa/nội dung trong accessible name (`ENăm`); thêm khoảng trắng trong QuestionCard. Ca RTL cũ thất bại trước sửa, nay PASS nguyên assertion.
3. Vite config bundling bằng native esbuild bị từ chối đọc thư mục cha; dev/build/test/preview dùng configLoader runner. Production bundle và các test dùng dependency thật.
4. Playwright ESM trên Node 24 yêu cầu JSON import attribute; bổ sung `with { type: 'json' }` cho fixture nguồn.
5. Selector select cần dùng role combobox theo accessible name thay vì exact label text bao gồm cả options. Giữ nguyên tất cả assertions nghiệp vụ.
6. Test import phải chờ dialog hoàn thành lưu và đóng trước khi điền background input; tránh fill vào phần đang inert. Không tăng timeout hoặc bật retry để che lỗi.
7. Test contrast phải chờ CSS transition kết thúc; xác minh bằng computed styles trước/sau và giữ ngưỡng 4,5:1.
8. Teardown process tree của webServer bị kẹt trong sandbox Windows. `e2e/global-setup.ts` mở production preview trong cùng process và đóng HTTP server trực tiếp; `npm run test:e2e` build trước, tự chạy và tự dừng, exit 0. TypeScript union HTTP/HTTP2 được narrow trước khi dùng closeAllConnections.

Không xóa test, skip test, thay đáp án hoặc thay Dexie/Zustand bằng mock implementation để khiến kết quả qua.

## 6. Chưa hoàn thành và rủi ro còn lại

1. **Giới hạn môi trường phát triển:** native esbuild không đọc được thư mục cha khi optimizeDeps trong sandbox; dev/HMR tại đây chưa hoạt động hoàn chỉnh. Có thể chạy bản đã kiểm chứng bằng `npm run build` rồi `npm run preview`. Chưa kiểm chứng dev server ngoài sandbox này.
2. **Cài browser:** không ghi được lock/cache ngoài writable root; cài mới Chromium chưa hoàn tất. Browser v1248 sẵn có đã chạy E2E thật; máy CI mới cần cài browser với quyền ghi cache hoặc PLAYWRIGHT_BROWSERS_PATH phù hợp.
3. **Build warning:** entry chunk khoảng 603 kB chưa gzip / 159 kB gzip, có dữ liệu câu hỏi gốc. Không phải build error; chưa benchmark thiết bị yếu, lịch sử rất lớn hoặc mạng chậm. Không tăng warning limit để giấu cảnh báo.
4. Chưa kiểm thử Safari/Firefox, thiết bị mobile vật lý, storage quota exhaustion hoặc crash/power loss giữa lúc ghi. Desktop/mobile trong báo cáo đều dùng Chromium; các giới hạn này không được tính là PASS.
5. Chưa audit dependency vulnerabilities. Website đã được deploy lên GitHub Pages; theo dõi job verify-live trong workflow để xem smoke test trên origin thật. Sandbox local không thể mở URL công khai do ERR_NETWORK_ACCESS_DENIED.
6. Giới hạn thiết kế giữ nguyên: import 20 MB, không PWA/offline navigation đảm bảo hoặc đồng bộ cloud; tiến trình native cũ không tự chuyển sang web. Backup thường xuyên vì IndexedDB phụ thuộc browser/profile/origin.

**Kết luận:** không còn ca test thất bại trong bộ kiểm thử đã chạy; full typecheck và static production build PASS. Đủ điều kiện đưa dist lên Vercel/Netlify/Cloudflare Pages để smoke test trên origin triển khai. Điều này không đồng nghĩa dev optimizer trong sandbox, mọi browser hoặc mọi điều kiện lưu trữ đều đã được kiểm chứng.

## 7. Chạy và deploy

Trong môi trường có quyền truy cập npm registry:

```sh
npm install
npm run typecheck
npm run check:domain
npm run check:domain-types
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Trên PowerShell dùng npm.cmd/npx.cmd nếu execution policy chặn .ps1. Lockfile web đã có; dùng npm ci trong CI khi registry/cache cho phép. Playwright setup tự mở preview trên 127.0.0.1:5173 và tự đóng; dừng server khác đang chiếm port trước E2E. Chỉ publish dist, không publish legacy, node_modules hoặc browser profiles trong test-results. Không cần backend hoặc secrets. Hướng dẫn chi tiết ở README.

## 8. Chuẩn bị GitHub Pages cho Monomee/MLN.FE-122

Đã bổ sung .gitignore cho env/log/backup cá nhân, workflow .github/workflows/pages.yml và flag VITE_GITHUB_PAGES=true để build `/MLN.FE-122/` với HashRouter. Build root giữ BrowserRouter. Không đổi dữ liệu câu hỏi hoặc cơ chế lưu tiến trình.

Đã quan sát test Pages thất bại khi cấu hình cũ chưa xử lý subpath/hash; sau sửa, 6/6 Pages E2E PASS trên desktop/mobile: assets đúng prefix, link trực tiếp, reload, thi, query parameters của import, backup/restore và browser context khác có tiến trình riêng. Full TypeScript, 30 unit/UI và 22 domain checks PASS. Bộ E2E root chạy lại riêng: 36/36 PASS, exit 0, không flaky/skipped. Bản build cuối tại dist dùng cấu hình Pages. Báo cáo máy ở docs/qa/pages-verification.json.

**Đã publish và deploy:** GitHub App được cài cho Monomee, repo public, main mặc định. Đã tạo commit khởi tạo 537ff0bef422310245a4761619ea6b2da8cb123a và source commit 388eb8da002a42815724a991010c0ab4ca3e2a76 qua API, đủ 67 file với mọi blob SHA khớp local. Không force push. Chủ repo đã bật Pages Source: GitHub Actions. Lượt https://github.com/Monomee/MLN.FE-122/actions/runs/41061378012 có build/deploy thành công, đủ 22 domain, 30 unit/UI, 36 root E2E và 6 Pages E2E PASS trên Ubuntu. URL: https://monomee.github.io/MLN.FE-122/. Browser local bị chặn mạng ngoài nên workflow bổ sung job verify-live chạy lại 6 ca Pages trên chính URL deploy, không thay các assertions nghiệp vụ. Hướng dẫn cụ thể ở docs/github-pages.md.
