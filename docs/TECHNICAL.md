# Tài Liệu Kỹ Thuật

AI Name Extractor là app single-page dùng Vite + React + TypeScript. App chạy hoàn toàn trong browser và gọi Gemini API trực tiếp từ client-side code.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- lucide-react icons
- Gemini Developer API

## Luồng xử lý tổng quát

1. Người dùng đưa raw text tiếng Trung vào app.
2. App normalize extraction settings.
3. Raw text được chia thành các chunk có overlap.
4. Các chunk được gửi tới Gemini với concurrency và rate-limit spacing.
5. Mỗi response từ Gemini được parse thành JSON.
6. Row được normalize và merge.
7. Count được tính lại theo raw text gốc.
8. Export layer format thành text tương thích QuickTranslator.

## File quan trọng

| Path | Vai trò |
| --- | --- |
| `src/App.tsx` | Điều phối state chính, extraction workflow, filter, pagination, export value. |
| `src/lib/gemini.ts` | Config model Gemini, rate limit, chunking, usage estimate, queue, retry, prompt, parser, merge logic. |
| `src/features/name-extractor/components/source-panel.tsx` | Raw text input, upload/drop/paste, nút chạy extraction. |
| `src/features/name-extractor/components/settings-panel.tsx` | API key manager và settings UI. |
| `src/features/name-extractor/components/results-panel.tsx` | Search, category filter, sort, pagination, result table. |
| `src/features/name-extractor/components/export-panel.tsx` | Preview export, copy, download. |
| `src/features/name-extractor/lib/extraction-session.ts` | Tạo resume key và helper progress. |
| `src/features/name-extractor/lib/format.ts` | Helper format hiển thị/export. |

## Data model

Gemini response được normalize thành:

```ts
type NameRow = {
  chinese: string;
  hanviet: string;
  category: 'Person' | 'Location' | 'Faction' | 'Artifact' | 'Skill' | 'Title' | 'Creature';
  description: string;
  count: number;
};
```

Settings được normalize thành:

```ts
type ExtractionSettings = {
  tierId: 'free' | 'tier1';
  nameStyle: 'eastern' | 'western';
  recallMode: 'high' | 'balanced';
  descriptionMode: 'full' | 'none';
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  maxRetries: number;
  requestTimeoutSeconds: number;
};
```

`tierId` là tên internal cũ, nhưng UI hiển thị là `Quota`. Giá trị này điều tiết RPM/TPM/RPD theo quota thật của Gemini API key (`Free API` hoặc `Paid Tier 1`), không đại diện cho gói trả phí của app.

## Chunking

`splitIntoChunks` cắt raw text theo `chunkSize` và giữ lại `chunkOverlap` ký tự giữa hai chunk liền kề. Khi có thể, hàm sẽ cố cắt ở ranh giới tự nhiên như xuống dòng hoặc dấu câu tiếng Trung.

Overlap quan trọng vì tên riêng có thể nằm ở ranh giới chunk. Các row trùng sau đó được merge theo exact Chinese spelling.

## Queue và rate limit

`extractChunksWithQueue` chạy một worker pool nhỏ. Mỗi worker:

1. Lấy pending chunk tiếp theo.
2. Chờ request slot dựa trên RPM và TPM estimate.
3. Lấy API key khả dụng tiếp theo.
4. Gửi request.
5. Lưu chunk result hoặc fail run kèm resumable state.

App xoay API key và cooldown key khi gặp `429`. Cách này giúp xử lý limit tạm thời, nhưng với workload dài người dùng vẫn nên dùng Paid Tier 1.

## Retry behavior

Các lỗi retry được:

- Request timeout.
- HTTP `429`.
- HTTP `5xx`.
- JSON parse failure.
- Network error.

Các lỗi không retry vô hạn:

- Gemini safety/policy block.
- Prohibited content response.
- Hết số lần retry.

Riêng timeout:

- Timeout error được đánh dấu `timedOut`.
- Nếu chunk đủ lớn, retry sẽ tách chunk thành hai chunk nhỏ hơn.
- Mỗi nửa được extract riêng.
- Row của hai nửa được nối lại.
- Merge logic phía sau sẽ dedupe row trùng.

Mục tiêu là giảm compute load của retry request, thay vì gửi lại nguyên chunk lớn đã timeout.

## Resume behavior

App tạo run key từ:

- Source text đã trim.
- Model đang chọn.
- Extraction settings đã normalize.

Nếu run lỗi, các chunk đã hoàn thành được giữ trong component state. Nếu run key vẫn khớp, UI hiện `Thử lại từ lỗi` và truyền completed chunk results vào queue qua `initialChunkResults`.

Đổi raw text, model hoặc settings sẽ làm mất resume state.

## Prompt design

Prompt yêu cầu Gemini trả đúng một JSON object theo schema ổn định. Prompt có rule riêng cho:

- Truyện Đông phương/tiên hiệp dùng Hán Việt.
- Truyện Quốc tế hoặc mixed nhiều bối cảnh: giữ tên nước ngoài theo original-language Latin spelling/transliteration khi rõ và có thể phục hồi; ngữ cảnh Nhật ưu tiên Hepburn-style romanization nhất quán; tên Trung/Hán, tu tiên, tông môn, cảnh giới hoặc ambiguous vẫn dùng Hán Việt.
- High recall mode.
- Balanced mode.
- Description bật hoặc tắt.

Khi tắt description, prompt yêu cầu Gemini trả `description` rỗng. Điều này giảm output token và giảm nguy cơ model mô tả nội dung nhạy cảm trong truyện.

## Export layer

Export được xử lý deterministic ở client. App không mutate `row.chinese` trước khi count/search. Các format riêng cho QuickTranslator chỉ chạy khi build `exportValue`.

Ví dụ:

```text
洞冥·旋风杀=Động Minh Toàn Phong Sát
```

được export thành:

```text
洞冥 · 旋风杀=Động Minh Toàn Phong Sát
```

Cách này giữ exact raw-text matching cho occurrence count.

Export cũng normalize khoảng trắng quanh các dạng gạch ngang phổ biến để QuickTranslator đọc tên ghép ổn định hơn.

## Safety settings

Request `generateContent` truyền `safetySettings` với threshold `OFF` cho các adjustable categories:

- `HARM_CATEGORY_HARASSMENT`
- `HARM_CATEGORY_HATE_SPEECH`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT`
- `HARM_CATEGORY_DANGEROUS_CONTENT`

Google vẫn có các core harm protections không chỉnh được, nên response vẫn có thể bị block bởi policy/core safety.

## Storage

App dùng browser local storage qua `useStoredState` và `useStoredJsonState`.

Các giá trị được lưu:

- Legacy single API key.
- Danh sách API key.
- Model đang chọn.
- Extraction settings.
- Page size.

Vì API key được lưu trong local storage, nên app nên được xem là local/private tool.

## Pricing và cost estimate

`estimateUsage` ước lượng input/output token và nhân với giá model trong `MODEL_OPTIONS`.

Input/output text token estimate là provider-aware. Gemini dùng approximation khoảng 4 ký tự cho 1 token. DeepSeek dùng heuristic theo tài liệu DeepSeek: khoảng 0.6 token cho mỗi ký tự Hán và 0.3 token cho mỗi ký tự còn lại; khi chỉ có tổng số ký tự mà không có text, app dùng tỷ lệ ký tự Hán để tránh underestimate truyện Trung. Số chính xác cần `countTokens`, `usageMetadata` hoặc trường `usage` của OpenAI-compatible response, nhưng app hiện chỉ dùng estimate để hiển thị phí và spacing TPM.

Giá trong source là giá mẫu để app estimate. Giá thực tế của Google hoặc DeepSeek có thể thay đổi. DeepSeek input estimate hiện dùng giá cache miss, chưa trừ cache hit. Tài liệu public nên link trang pricing chính thức:

https://ai.google.dev/gemini-api/docs/pricing
https://api-docs.deepseek.com/quick_start/pricing

## Build commands

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
```
