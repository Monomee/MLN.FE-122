# GitHub Pages · Monomee/MLN.FE-122

Repository đích: https://github.com/Monomee/MLN.FE-122

Website: **https://monomee.github.io/MLN.FE-122/**. GitHub xác nhận deploy thành công ở [lượt triển khai đầu tiên](https://github.com/Monomee/MLN.FE-122/actions/runs/41061378012), source commit `388eb8da002a42815724a991010c0ab4ca3e2a76`.

## Cấu hình đã chuẩn bị

- `.gitignore` bỏ qua node_modules, dist, test-results/browser profiles, cache, logs, .env và các file backup `mln-backup-*.json`.
- `.github/workflows/pages.yml` chạy khi push main hoặc chọn Run workflow. Node 24, npm ci từ lockfile, TypeScript, domain/unit/UI, Chromium E2E bản root và bản Pages. Chỉ build đã qua kiểm thử mới được upload từ dist rồi deploy bằng GitHub Pages. Job verify-live sau deploy chạy lại 6 ca Pages trực tiếp trên URL công khai.
- `VITE_GITHUB_PAGES=true` đặt Vite base thành `/MLN.FE-122/` và dùng HashRouter. Ví dụ link học: `/MLN.FE-122/#/practice`. Reload/link trực tiếp không cần server rewrite.
- Build mặc định vẫn dùng base `/` và BrowserRouter, phù hợp cấu hình Vercel/Netlify/Cloudflare cũ. Không cần dependency mới.
- GitHub token của workflow chỉ có contents:read khi build, pages:write/id-token:write khi deploy; không cần PAT trong source hoặc secrets mới.

Các action references được ghim theo [hướng dẫn chính thức của Vite](https://vite.dev/guide/static-deploy#github-pages).

## Trạng thái push/deploy từ phiên làm việc

Source đã được chuẩn bị và kiểm thử tại workspace. Git CLI trong sandbox không kết nối được github.com:443 và không ghi được .git/config. Đã chuyển sang plugin GitHub: tài khoản Monomee được xác nhận có quyền với repository public, nhánh mặc định main. Sau khi cài GitHub App cho đúng chủ sở hữu Monomee, lần tạo .gitignore thành công tại commit `537ff0bef422310245a4761619ea6b2da8cb123a`.

Đã publish đủ 67 file qua GitHub API, kiểm tra mọi blob SHA trùng source local, commit nối tiếp lịch sử main và không force push. Lượt CI đầu tiên PASS 22 domain checks, 30 unit/UI, 36 E2E root và 6 E2E Pages; cả build và deploy đều thành công. Theo dõi [workflow Pages](https://github.com/Monomee/MLN.FE-122/actions/workflows/pages.yml) để xem kết quả mới nhất.

Chủ repository đã bật Source: GitHub Actions trong Settings. Trình duyệt tại sandbox không truy cập được internet công khai (ERR_NETWORK_ACCESS_DENIED), nên kiểm tra live được thực hiện từ runner GitHub. PLAYWRIGHT_BASE_URL đặt URL công khai và bỏ qua preview local; các kiểm tra nghiệp vụ giữ nguyên.

## Publish từ terminal trên máy của bạn

Các lệnh sau chỉ dành cho một checkout mới chưa có lịch sử remote. Source được đưa lên bằng API nên ưu tiên clone repository để tiếp tục phát triển; không push lịch sử init độc lập của workspace lên đè main.

```powershell
git clone https://github.com/Monomee/MLN.FE-122.git
cd MLN.FE-122
npm.cmd ci
```

Không dùng force push để thay lịch sử main. Khi sửa source trong checkout đã clone, tạo commit mới rồi push bình thường.

Sau đó mở [Settings → Pages](https://github.com/Monomee/MLN.FE-122/settings/pages), chọn Build and deployment → Source → **GitHub Actions**. Trong Actions chọn **Verify and deploy GitHub Pages → Run workflow** nếu lần push đầu chưa deploy vì Pages chưa bật. Workflow đang theo dõi nhánh main.

Chỉ khi job deploy xanh và trả URL mới coi là triển khai thành công. Smoke test URL thật: mở trang chủ, đi tới #/practice, reload, học một câu, xuất/khôi phục backup.

## Kiểm tra Pages cục bộ

```powershell
$env:VITE_GITHUB_PAGES='true'
npm.cmd run test:e2e
npm.cmd run preview
```

Mở URL preview được in ra với đường dẫn `/MLN.FE-122/`. Dừng preview trước khi chạy E2E vì test tự quản lý port 5173. Để trở lại build root trong terminal đó, dùng `Remove-Item Env:VITE_GITHUB_PAGES`.

Playwright chọn 3 ca Pages × 2 viewport khi flag bật. Không bật flag thì chạy lại đủ 18 ca gốc × 2 viewport. Không skip hoặc xóa ca cũ. Báo cáo Pages: [qa/pages-verification.json](qa/pages-verification.json).

Kết quả chạy tại workspace: **6/6 Pages E2E, 36/36 E2E root, 30/30 unit/UI và 22/22 domain checks PASS**, không flaky/skipped; full TypeScript và cả hai production builds PASS. Workflow GitHub đã được viết nhưng chưa chạy trên GitHub vì chưa push được.

## Tiến trình riêng trên thiết bị

GitHub Pages phục vụ application và bộ câu hỏi tĩnh. IndexedDB giữ tiến trình riêng theo browser profile và origin; không có API tải tiến trình cá nhân lên GitHub. Test Pages đã xác nhận browser context khác không nhìn thấy phiên đã học của context đầu.

Trước khi chuyển từ localhost sang GitHub Pages, xuất backup từ bản local, rồi khôi phục trên địa chỉ mới. Hai origin không tự chia sẻ dữ liệu. Đổi thiết bị/profile hoặc xóa dữ liệu browser sẽ không giữ cùng tiến trình; hai người dùng chung một profile sẽ dùng chung dữ liệu. Website phải được publish công khai để mọi người truy cập được.
