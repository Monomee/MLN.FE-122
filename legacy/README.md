# MLN122 Quiz App

App học trắc nghiệm MLN122 giống Quizlet, chạy bằng Expo.

## Tính năng

- Có sẵn 526 câu MLN122.
- Chọn đáp án rồi bấm **Kiểm tra** để biết đúng/sai.
- Câu nhiều đáp án như `ABC`, `BCD` có thể chọn nhiều lựa chọn.
- Sai lần đầu sẽ hiện đáp án đúng và đưa câu đó vào hàng chờ ôn lại.
- Khi đến lúc ôn, app gom **toàn bộ câu sai đang chờ ôn** để ôn liền một lượt, không còn kiểu ôn 1 câu rồi nhảy sang câu mới.
- Nếu ôn lại vẫn sai, câu đó tiếp tục nằm trong hàng chờ và sẽ lặp lại đến khi trả lời đúng.
- Cứ xong mỗi chuỗi 50 câu, app hỏi muốn học lại chuỗi vừa rồi hay học tiếp.
- Tự động lưu tiến trình học, câu đang học dở, danh sách câu sai, thống kê, giao diện sáng/tối và danh sách câu đã sao.
- Có 2 mode giao diện: sáng và tối.
- Có thể gắn sao câu hỏi. Các câu đã sao được đưa vào danh sách riêng để học lại sau.

## Cách chạy (Windows)

1. Giải nén file zip ra một thư mục bất kỳ (ví dụ ra Desktop).
2. Cài Node.js (bản LTS) nếu máy chưa có: https://nodejs.org
3. Mở CMD hoặc PowerShell, `cd` vào đúng thư mục vừa giải nén (thư mục chứa file `App.js`, `package.json`). Ví dụ nếu giải nén ra Desktop:

```cmd
cd /d "%USERPROFILE%\Desktop\MLN122_Quiz_App"

npm install

npx expo start --web
```

4. Expo sẽ tự mở trình duyệt. Nếu không tự mở, copy link `http://localhost:8081` (hoặc link hiện trong cửa sổ CMD) rồi dán vào Chrome/Edge.

Lần đầu `npm install` sẽ mất vài phút để tải thư viện — cần có mạng Internet lúc này. Sau đó không cần mạng nữa vẫn dùng được app.

## Lưu ý

Nếu CMD báo `'npm' is not recognized`, máy chưa có Node.js. Cài Node.js bản LTS rồi mở lại CMD.


## Bản V6

- Hiện rõ loại câu: Chọn 1 đáp án hoặc Chọn nhiều đáp án.
- Nút đáp án có ký hiệu radio `○/◉` cho câu chọn 1 và checkbox `☐/☑` cho câu chọn nhiều.
