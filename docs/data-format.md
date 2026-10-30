# Dữ liệu câu hỏi và backup

## JSON chuẩn

File là một mảng. UI nhập môn yêu cầu tên môn và ID mới; `subjectId` của mọi câu phải trùng ID đó. ID môn gồm 1–64 chữ thường/số/gạch ngang/gạch dưới. ID câu không trùng bộ câu đang có. Các tên thuộc Object.prototype bị từ chối để tránh xung đột lưu trữ.

```json
[
  {
    "id": "my-subject:1",
    "number": 1,
    "subjectId": "my-subject",
    "topicId": "Tên chủ đề tùy chọn",
    "content": "Nội dung câu hỏi",
    "options": [{"key":"A","text":"Lựa chọn thứ nhất"},{"key":"B","text":"Lựa chọn thứ hai"},{"key":"E","text":"Lựa chọn thứ ba"}],
    "correctAnswers": ["A","E"],
    "explanation": "Ghi chú tùy chọn"
  }
]
```

Đây là ví dụ về định dạng, không được nạp vào bộ dữ liệu thật. `options` ít nhất 2, không giới hạn 4; khóa phải duy nhất. `correctAnswers` không rỗng, không trùng và phải thuộc options. Không tự đoán đáp án. Không chuẩn hóa/chỉnh sửa nội dung học thuật.

## JSON cũ

Mảng `{id, question, options:[{key,text}], answer:string[], notes?:string[]}` được chuyển tự động: ID mới `<subjectId>:<id>`, number theo vị trí trong mảng, question → content, answer → correctAnswers, notes nối bằng xuống dòng → explanation. Các trường học thuật giữ nguyên và thứ tự mảng giữ nguyên.

## TXT

UTF-8, xuống dòng LF hoặc CRLF. Mỗi câu cách nhau một dòng trống. Nội dung, lựa chọn và giải thích nằm trên từng dòng; không hỗ trợ nội dung nhiều dòng trong TXT (dùng JSON cho trường hợp đó).

```text
Câu 1: Nội dung câu hỏi
A. Lựa chọn thứ nhất
B. Lựa chọn thứ hai
E. Lựa chọn thứ ba
Đáp án: A,E
Chủ đề: Chủ đề tùy chọn
Giải thích: Nội dung tùy chọn
```

Đáp án phân cách bằng dấu phẩy, không hiểu `AE` là A và E. Dòng không nhận diện, thiếu đáp án, khóa trùng hoặc tham chiếu khóa không tồn tại sẽ báo lỗi. Xem trước toàn bộ danh sách rồi xác nhận mới ghi dữ liệu. Tối đa 20 MB/file tại UI. Không tự ghi đè môn/câu đang có.

## Backup

`{format:"mln-study-backup", version:1, exportedAt:<milliseconds>, data:<StudyData>}`. Snapshot chứa môn, câu, progress, attempts, practices, exams, settings và phiên đang mở. Schema kiểm tra kiểu, ID tham chiếu, đáp án đã chọn, option permutations và deadline trước transaction. Version không hỗ trợ bị từ chối. Backup hỏng không xóa dữ liệu hiện tại. Restore cần xác nhận ghi đè. Tiến trình Expo/AsyncStorage có schema khác và không phải backup web.
