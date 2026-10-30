# Audit source MLN122 Quiz App

Ngày kiểm tra: 2026-10-30. Source được cung cấp dưới dạng thư mục đã giải nén, không có ZIP hay Git repository. Đã đọc App.js (logic và style), package.json, app.json, README và kiểm tra toàn bộ questions.json bằng script. assets/icon.png là ảnh thương hiệu của app cũ.

## Dữ liệu thực tế

- 526 câu, 526 ID số duy nhất. Schema: id, question, options[{key,text}], answer:string[], notes:string[]. Không có subject hoặc topic gốc.
- 123 câu có 3 lựa chọn, 399 có 4, 4 có 5; 25 câu nhiều đáp án; 36 câu có ghi chú. Không phát hiện câu thiếu đáp án hoặc đáp án ngoài tập lựa chọn.
- SHA256 của data/questions.json: `5cc9066db0d529086f2890e639adb6580240eec1c215ed72b5f4ec4b4d069f60`.
- Giữ nguyên file nguồn, thứ tự, nội dung, khóa đáp án. Chuyển ID thành `mln122:<id>`, thêm number theo vị trí gốc. notes nối bằng xuống dòng vào explanation, không sửa câu chữ.
- Môn mặc định: Kinh tế chính trị Mác – Lênin (MLN122), dựa trên nội dung thực tế; không tạo câu mẫu cho các môn khác, không tự gán chủ đề.

## Chức năng và quy tắc hiện có

React Native/Expo 51, React 18, AsyncStorage. Toàn bộ logic/UI nằm trong App.js. Chấm bằng sort rồi join khóa; chọn toàn bộ tập đáp án mới đúng. UI phân biệt radio/checkbox, khóa sau khi kiểm tra, hiện đáp án và notes. Phải kiểm tra trước khi chuyển tiếp.

Sai ở chế độ normal được đưa vào hàng chờ duy nhất theo index; dueAt = index + 7. Khi đi tới vị trí có ít nhất một câu đến hạn, app lấy **toàn bộ** hàng chờ, kể cả câu chưa đến hạn, để ôn. Trả lời đúng khi review thì xóa khỏi hàng chờ, sai thì tăng attempts và lên lịch lại theo pendingIndex/currentIndex. Mode starred không cập nhật thống kê/chờ ôn. Nhóm cố định 50; modal chỉ có học lại hoặc tiếp tục; học lại nhóm xóa hàng chờ trong nhóm đó. Hết danh sách quay lại câu đầu.

Lưu index, mode, câu/phiên ôn, pendingIndex, queue, stars, theme, lựa chọn/checked, modal và bốn tổng thống kê vào `@MLN122_QUIZ_PROGRESS_V1`. Có xác nhận reset, lưu sáng/tối, danh sách sao và học câu sao. Không có export/import backup, trình nhập câu, thi thử, môn/chủ đề, lịch theo ngày, lịch sử từng lần trả lời, biểu đồ hay test. “Khôi phục” thực tế chỉ là tự đọc AsyncStorage khi khởi động.

## Vấn đề và hướng kế thừa

- Chấm bằng join không an toàn cho khóa nhiều ký tự; thay bằng so sánh tập hợp có kiểm tra khóa.
- Lịch ôn dựa trên index bị sai khi quay lại đầu/nhảy câu; thay bằng bộ đếm câu đã hoàn thành trong phiên, chỉ đưa câu đến hạn vào lượt ôn; flush phần còn lại khi kết thúc. Lịch trong phiên và lịch dài hạn tách biệt.
- Tổng đúng/sai không chứa lịch sử, starred không tính lượt học; bản web lưu mọi attempt với timestamp/mode/selection để thống kê thống nhất.
- Restore chỉ sanitize một phần dữ liệu và có thể nhận selected/stats/modal hỏng. Bản web validate dữ liệu/backup, quan hệ ID và transaction trước khi ghi đè.
- AsyncStorage không truy cập được từ website khác origin/native. Không bịa lịch sử từ các tổng cũ; source cũ được giữ để đối chiếu. Chuyển đổi bộ câu tự động, tiến trình web mới lưu Dexie.
- Có thể tái sử dụng dữ liệu, quy tắc tập đáp án, sao, nhóm học và ý tưởng hàng chờ; không tái sử dụng UI Native hay sao chép App.js.

Source cũ App.js/app.json/assets/data còn nguyên; manifest/lock/README cũ lưu tại legacy/ trước khi đổi công cụ.
