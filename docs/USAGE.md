# Hướng Dẫn Sử Dụng

Tài liệu này hướng dẫn cách dùng AI Name Extractor để trích xuất tên riêng từ raw text truyện Trung và xuất file cho QuickTranslator.

## 1. Mở ứng dụng

Dùng bản đã deploy tại:

https://name-extractor.pages.dev

Bạn chỉ cần trình duyệt hiện đại và Gemini API key. Không cần cài Node.js nếu chỉ dùng app.

## 2. Lấy Gemini API key

Tạo API key trong Google AI Studio hoặc Google Cloud project của bạn. App gửi request trực tiếp từ browser tới Gemini API.

Với test nhỏ, Free API key có thể đủ. Với truyện dài, nên setup billing và dùng Paid Tier 1. Paid Tier 1 thường nhanh và mượt hơn vì rate limit cao hơn, phù hợp hơn với việc chạy nhiều chunk song song.

Không chia sẻ API key công khai. Không để key xuất hiện trong screenshot.

## 3. Thêm raw text

Bạn có thể:

- Dán raw text tiếng Trung vào textarea.
- Bấm `Dán` để đọc từ clipboard.
- Bấm `Tải file` để load file `.txt`.
- Kéo thả file `.txt` vào panel raw text.

Chế độ upload:

- `Thay thế`: thay raw text hiện tại.
- `Nối thêm`: nối file mới vào sau raw text hiện tại.

Với text quá lớn, app sẽ chuyển sang preview tĩnh để tránh browser bị lag.

## 4. Thêm API key

Thêm một hoặc nhiều Gemini API key trong phần `Cài đặt`.

Nhiều key sẽ được xoay vòng theo request. Điều này giúp khi một key gặp giới hạn tạm thời, nhưng không xóa bỏ limit cơ bản của Free API. Nếu chạy truyện dài hoặc chạy thường xuyên, vẫn nên dùng Paid Tier 1.

## 5. Chọn settings

### Model

Chọn Gemini model ở thanh trên cùng. Với tác vụ trích xuất tên, các model nhanh/lite thường đã đủ. Model đắt hơn không phải lúc nào cũng tốt hơn cho bài toán này.

Khuyến nghị:

- Nếu dùng free key, chọn `Gemini 3.1 Flash`.
- Nếu đã setup billing và dùng Paid Tier 1, chọn `Gemini 3.1 Flash Lite`.

### Kiểu truyện

- `Đông phương`: output Hán Việt tiếng Việt có dấu.
- `Quốc tế`: giữ tên nước ngoài theo phiên âm/spelling gốc khi có thể phục hồi từ ngữ cảnh, ví dụ tên Anh/Âu, Nhật, Hàn. Tên Hán, tu tiên, tông môn, cảnh giới hoặc tên không rõ là ngoại quốc vẫn dùng Hán Việt có dấu.

### Quota

Chọn theo quota thật của Gemini API key, không phải gói trả phí của app.

- `Free API`: dùng rate limit theo free tier.
- `Paid Tier 1`: dùng rate limit paid tier. Khuyến nghị cho truyện dài.

### Độ phủ

- `Cao`: recall cao hơn, bắt nhiều tên phụ/tên chỉ xuất hiện một lần, nhưng có thể nhiều nhiễu hơn.
- `Cân bằng`: thận trọng hơn, thường sạch hơn với raw text nhiễu.

### Mô tả

- `Không mô tả`: trường description để rỗng. Rẻ hơn, gọn hơn, ít dễ dính safety filter hơn.
- `Có mô tả`: thêm mô tả tiếng Việt ngắn, trung lập.

### Cỡ chunk

Số ký tự gửi trong mỗi Gemini request. Chunk nhỏ giảm nguy cơ timeout nhưng tạo nhiều request hơn. Chunk lớn giảm số request nhưng dễ timeout hoặc vượt response limit hơn.

Gợi ý ban đầu:

- Free API: `4000` đến `8000`.
- Paid Tier 1: `6000` đến `12000`, tùy model và raw text.

### Lặp lại

Số ký tự overlap giữa các chunk. Nên dùng `300` đến `500` để giảm mất tên ở ranh giới chunk.

### Song song

Số request chạy đồng thời.

- Free API: bắt đầu với `1` hoặc `2`.
- Paid Tier 1: có thể tăng cao hơn, nhưng vẫn cần để ý rate limit và quota.

### Thử lại

Số lần retry cho lỗi tạm thời. Timeout, server error và JSON parse failure có thể retry. Policy/safety block sẽ không retry vô hạn.

### Timeout (s)

Timeout của mỗi request, tính bằng giây. Nếu request timeout và chunk đủ lớn, app sẽ tự tách chunk đó thành hai request nhỏ hơn rồi retry từng nửa.

Gợi ý ban đầu:

- Free API: `30`.
- Paid Tier 1: `15` đến `30`.
- Network chậm hoặc chunk lớn: `45` đến `60`.

## 6. Chạy trích xuất

Bấm `Trích xuất`.

Progress bar hiển thị tiến độ chunk. Trong lúc chạy, bảng kết quả sẽ cập nhật dần bằng partial result.

Nếu extraction lỗi, giữ nguyên raw text, model và settings rồi bấm `Thử lại từ lỗi`. App có thể chạy tiếp từ các chunk chưa xong.

## 7. Kiểm tra kết quả

Trong bảng kết quả, bạn có thể:

- Search theo chữ Trung, Hán Việt hoặc mô tả.
- Lọc theo category.
- Sort theo chữ Trung, Hán Việt, category, description hoặc count.
- Đổi page size.

App giữ nguyên text Trung gốc bên trong state để count và search vẫn khớp raw text.

## 8. Xuất file cho QuickTranslator

Dùng panel export:

- `Names.txt`
- `Names2.txt`
- `Copy`
- `Tải về`

Format export:

```text
中文名=Vietnamese Name
```

Tên có dấu chấm giữa hoặc gạch ngang sẽ được normalize khoảng trắng khi export:

```text
洞冥·旋风杀=Động Minh Toàn Phong Sát
```

thành:

```text
洞冥 · 旋风杀=Động Minh Toàn Phong Sát
```

Việc này chỉ xảy ra ở export layer, nên count/search vẫn dùng bản gốc trong raw text.

Token và phí trong app là ước lượng. Với text, app dùng approximation từ tài liệu Gemini: khoảng 4 ký tự cho 1 token. Output thực tế có thể lệch theo tokenizer/model và số entity Gemini trả về.

## Troubleshooting

### 429 hoặc rate limit

Giảm `Song song`, đợi một lúc, thêm key hợp lệ khác, hoặc chuyển `Quota` sang `Paid Tier 1` nếu API key thật sự đã có billing.

### Timeout

Giảm `Cỡ chunk`, tăng `Timeout (s)`, hoặc dùng Paid Tier 1. App sẽ cố tự tách chunk timeout khi có thể.

### Gemini chặn một chunk

App đặt các adjustable Gemini safety filters thành `OFF`, nhưng core harm protections của Google vẫn có thể chặn nội dung. Thử giảm cỡ chunk, bỏ đoạn nhạy cảm, hoặc chạy với `Không mô tả`.

### JSON invalid

App sẽ retry lỗi parse JSON. Nếu vẫn lỗi, giảm cỡ chunk hoặc đổi model.

### Thiếu tên phụ

Dùng `Độ phủ: Cao`, tăng overlap, hoặc chạy lại riêng đoạn chương liên quan.

### Quá nhiều tên nhiễu

Dùng `Độ phủ: Cân bằng` và lọc category/search trước khi export.
