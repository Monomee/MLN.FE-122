# Kế hoạch triển khai web

Mục tiêu: thực hiện toàn bộ yêu cầu local-first theo prompt, không backend/đăng nhập, bàn giao source và hướng dẫn static deployment. Không đăng ký hosting ngoài khi người dùng yêu cầu triển khai trong workspace.

Thiết kế: React/TypeScript/Vite, Tailwind cho style foundation; React Router cho các trang; Zustand giữ snapshot nghiệp vụ, Dexie persist qua hàng đợi ghi tuần tự. Domain thuần cho grading/shuffle/review/exam/analytics; validators tại biên import và restore. IndexedDB v1 lưu document ứng dụng, v2 thêm revision để phát hiện tab cạnh tranh. Backup version 1 có toàn bộ snapshot, được validate trước transaction thay thế. Không có dữ liệu minh họa thay bộ câu thật.

Phạm vi file: config/manifest/lock; src/domain/{models,learning,analytics}; src/data/{importers,validation,builtin}; src/db/database; src/store/useStudyStore; các component question/chart/layout/modal; features dashboard/subjects/practice/review/exam/statistics/question-bank/settings; unit/UI tests và e2e; docs/README; redirects Vercel/Netlify/Cloudflare. Không sửa data/questions.json.

- [x] Phase 1: audit toàn bộ source và xác minh dữ liệu gốc.
- [x] Phase 2: dependencies đầy đủ, có lockfile web, model/schema/persistence/bootstrap và test harness.
- [x] Phase 3: domain, subjects, practice, stars/block review; đã kiểm tra logic và browser.
- [x] Phase 4: exam/history/SRS/dashboard/analytics/bank/settings/backup; đã kiểm tra logic và browser.
- [x] Phase 5 kiểm chứng production: full typecheck/build, 22 domain checks, 30 Vitest/RTL, 36 Playwright desktop/mobile PASS. Giới hạn dev optimizer/cache browser trong sandbox còn được ghi riêng; không tuyên bố các bước đó đã qua. Xem docs/delivery-report.md.

Các điều cần kiểm tra: import sai không ghi một phần; backup tham chiếu ID hỏng không xóa dữ liệu; ôn sai cuối phiên không bị thất lạc; deadline giữ nguyên qua reload; tab thứ hai không đè tiến trình; clone selection/order không thay đáp án; reset môn chỉ xóa dữ liệu liên quan. Thiết kế dùng transaction Dexie theo tài liệu https://dexie.org/docs/Transaction/Transaction và Zustand create https://zustand.docs.pmnd.rs/reference/apis/create.

Ruling: Người dùng đã chỉ định stack, hành vi và yêu cầu tiếp tục mọi phase, vì vậy triển khai trực tiếp với các quyết định trên, không chặn ở vòng phê duyệt kế hoạch. Không có Git repository, nên giữ source cũ trong workspace thay vì tạo worktree.
