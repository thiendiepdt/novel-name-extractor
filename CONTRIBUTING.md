# Hướng Dẫn Đóng Góp

Cảm ơn bạn muốn đóng góp cho AI Name Extractor. Project này ưu tiên tính thực dụng cho workflow dịch truyện Trung, đặc biệt là người dùng QuickTranslator với `Names.txt` / `Names2.txt`.

## Setup môi trường dev

```bash
npm install
npm run dev
```

Trước khi mở pull request:

```bash
npm run typecheck
npm run build
```

## Nguyên tắc của project

- Giữ app theo hướng local-first. Không thêm backend nếu feature không thật sự cần.
- Không commit API key, raw text riêng tư, data user tạo ra, hoặc secret.
- Giữ output export tương thích với QuickTranslator.
- Prompt thay đổi phải cẩn thận và nên test bằng raw truyện thật.
- Với lỗi format file, ưu tiên xử lý deterministic ở client/export layer thay vì chỉ dựa vào prompt.
- Khi sửa chunking/retry/settings, phải giữ được logic resume extraction nếu có thể.
- UI nên gọn, dày thông tin, phục vụ thao tác. Đây là workflow tool, không phải landing page.

## Checklist pull request

- Giải thích vấn đề người dùng gặp.
- Mô tả hành vi sau khi sửa.
- Có screenshot nếu thay đổi UI.
- Chạy `npm run typecheck`.
- Chạy `npm run build`.
- Update docs nếu thay đổi workflow, settings, model, export hoặc API behavior.

## Ghi chú code

- App shell chính: `src/App.tsx`.
- Logic Gemini API: `src/lib/gemini.ts`.
- Component của feature: `src/features/name-extractor/components/`.
- Helper của feature: `src/features/name-extractor/lib/`.
- UI primitive dùng chung: `src/components/ui/`.

Giữ change nhỏ và đúng phạm vi. Tránh refactor rộng trong PR feature, trừ khi refactor đó thật sự cần để làm feature an toàn.

## Khi sửa prompt

Prompt ảnh hưởng trực tiếp đến recall, precision, token usage và safety filtering. Khi sửa prompt:

- Nêu rõ before/after behavior trong PR.
- Test cả `Đông phương` và `Tây phương`.
- Test cả `descriptionMode: none` và `descriptionMode: full`.
- Tránh yêu cầu model tóm tắt hoặc mô tả sự kiện nhạy cảm.
- Giữ output schema ổn định, trừ khi UI và parser được update cùng lúc.

## License

Khi đóng góp, bạn đồng ý contribution của mình được phát hành theo GPL-3.0-only, cùng license với repository này.
