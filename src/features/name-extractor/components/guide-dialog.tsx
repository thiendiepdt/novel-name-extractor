import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MODEL_OPTIONS, getRateLimits } from '@/lib/gemini';
import { GUIDE_CHARS_PER_CHAPTER, GUIDE_NOVEL_CHAPTERS } from '../constants';
import { compactNumber, formatUsd } from '../lib/format';
import type { GuideEstimate, TierOption } from '../types';

type GuideDialogProps = {
  estimate: GuideEstimate;
  tiers: readonly TierOption[];
  onClose: () => void;
};

export function GuideDialog({ estimate, tiers, onClose }: GuideDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 text-foreground">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Hướng Dẫn Sử Dụng</h2>
            <p className="text-xs text-muted-foreground">Workflow, thuật ngữ, retry, API key và ước lượng phí.</p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
            Đóng
          </Button>
        </div>

        <div className="min-h-0 overflow-auto p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GuideSection title="Cách dùng nhanh">
              <GuideList items={[
                'Dán raw text tiếng Trung hoặc tải file .txt.',
                'Chọn kiểu truyện: Đông phương dùng Hán Việt; Tây phương chỉ dùng tên Latin khi rõ là tên Tây, còn tên Á vẫn dùng Hán Việt.',
                'Chọn độ phủ Cao nếu muốn bắt nhiều tên phụ; Cân bằng nếu muốn ít nhiễu hơn.',
                'Bấm Trích xuất, kiểm tra bảng kết quả, rồi copy hoặc tải Names.txt / Names2.txt.',
                'Nếu bị lỗi mà raw text, model và settings chưa đổi, bấm Thử lại từ lỗi để chạy tiếp các chunk còn thiếu.',
              ]} />
            </GuideSection>

            <GuideSection title="Thuật ngữ">
              <GuideList items={[
                'Chunk: đoạn raw text nhỏ gửi lên Gemini trong một request.',
                'Lặp lại: số ký tự overlap giữa 2 chunk để giảm mất tên ở ranh giới.',
                'Song song: số request chạy đồng thời. Cao hơn nhanh hơn nhưng dễ chạm rate limit hơn.',
                'Thử lại: số lần tự retry cho lỗi tạm thời như 429 hoặc lỗi server.',
                'RPM / TPM / RPD: giới hạn request mỗi phút, token mỗi phút, request mỗi ngày.',
              ]} />
            </GuideSection>

            <GuideSection title="Best practice">
              <GuideList items={[
                'Free tier: để Song song 1-2, Cỡ chunk khoảng 8000, Lặp lại 300-500.',
                'Truyện dài: chia theo tập hoặc vài trăm chương nếu trình duyệt yếu.',
                'Nếu kết quả thiếu tên phụ, chạy Độ phủ Cao; nếu quá nhiều cụm mơ hồ, chuyển Cân bằng.',
                'Giữ raw text và settings không đổi khi retry để app có thể resume đúng phần fail.',
                'Sau khi có kết quả, lọc theo category/search trước khi xuất file.',
              ]} />
            </GuideSection>

            <GuideSection title="Khi bị lỗi">
              <GuideList items={[
                '429/rate limit: giảm Song song, đợi một lúc, hoặc thêm key hợp lệ.',
                'Key hết quota hoặc sai quyền: xóa key lỗi, thêm key khác rồi bấm Thử lại từ lỗi.',
                'JSON không hợp lệ: app tự retry theo cấu hình Thử lại; nếu vẫn fail, bấm retry lại chunk đó.',
                'Input đã đổi sau khi lỗi: app sẽ chạy lại từ đầu vì chunk cũ không còn khớp.',
                'Muốn ổn định hơn: gắn billing để lên Tier 1, tăng quota và giảm lỗi giới hạn.',
              ]} />
            </GuideSection>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <GuideSection title="API key và tier">
              <GuideList items={[
                'Thêm nhiều key: app sẽ xoay vòng key theo từng chunk/request.',
                'Rate limit trong app vẫn được điều tiết theo tier đang chọn, nên chọn đúng Free hoặc Tier 1.',
                'Nhiều key giúp tiếp tục khi một key lỗi hoặc hết quota, nhưng không thay thế billing cho workload lớn.',
                'Free phù hợp test hoặc truyện ngắn. Tier 1 phù hợp chạy truyện dài, song song cao và ít phải canh quota.',
              ]} />
              <div className="mt-3 overflow-hidden rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Tier</th>
                      {MODEL_OPTIONS.map((model) => (
                        <th key={model.id} className="px-3 py-2">{model.shortLabel}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier) => (
                      <tr key={tier.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{tier.label}</td>
                        {MODEL_OPTIONS.map((model) => {
                          const limits = getRateLimits(model.id, tier.id);
                          return (
                            <td key={model.id} className="px-3 py-2 font-mono">
                              {limits.rpm.toLocaleString()} RPM / {compactNumber(limits.tpm)} TPM / {compactNumber(limits.rpd)} RPD
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuideSection>

            <GuideSection title="Ước lượng phí">
              <div className="grid gap-2 text-sm">
                <GuideMetric label="Ví dụ" value={`${GUIDE_NOVEL_CHAPTERS} chương x ${GUIDE_CHARS_PER_CHAPTER.toLocaleString()} chữ`} />
                <GuideMetric label="Model" value={estimate.model.label} />
                <GuideMetric label="Chunk ước tính" value={estimate.chunkCount.toLocaleString()} />
                <GuideMetric label="Token vào" value={`~${estimate.inputTokens.toLocaleString()}`} />
                <GuideMetric label="Token ra" value={`~${estimate.outputTokens.toLocaleString()}`} />
                <GuideMetric label="Tổng phí" value={`~${formatUsd(estimate.totalCost)}`} />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Free tier dùng quota miễn phí nên phù hợp test nhỏ, nhưng dễ chạm giới hạn. Khi gắn billing để lên Tier 1,
                phí ước tính = token input x giá input + token output x giá output của model. Output thực tế có thể lệch theo số tên Gemini trả về.
              </p>
              <div className="mt-3 overflow-hidden rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Input paid</th>
                      <th className="px-3 py-2">Output paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_OPTIONS.map((model) => (
                      <tr key={model.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{model.label}</td>
                        <td className="px-3 py-2 font-mono">${model.inputUsdPerMillion}/1M</td>
                        <td className="px-3 py-2 font-mono">${model.outputUsdPerMillion}/1M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuideSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-background/60 p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function GuideList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1.5 text-xs leading-5 text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-1">
          <span aria-hidden="true">-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border bg-card px-2.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="text-right font-mono text-xs text-foreground">{value}</strong>
    </div>
  );
}
