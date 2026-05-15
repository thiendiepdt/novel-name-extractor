import hauTuRaw from '@/features/name-extractor/data/hau-tu.txt?raw';

export type Category = 'Person' | 'Location' | 'Faction' | 'Artifact' | 'Skill' | 'Title' | 'Creature';
export type NameStyle = 'eastern' | 'western';
export type RecallMode = 'high' | 'balanced';
export type DescriptionMode = 'full' | 'none';
export type RateLimitValue = number | '*';

export type NameRow = {
  chinese: string;
  hanviet: string;
  category: Category;
  description: string;
  count: number;
};

export type ExtractionSettings = {
  tierId: TierId;
  nameStyle: NameStyle;
  recallMode: RecallMode;
  descriptionMode: DescriptionMode;
  chunkSize: number;
  chunkOverlap: number;
  maxConcurrent: number;
  maxRetries: number;
  requestTimeoutSeconds: number;
};

export type RateLimits = {
  rpm: number;
  tpm: number;
  rpd: RateLimitValue;
};

type GeminiError = Error & {
  status?: number;
  retryable?: boolean;
  retryAfterMs?: number;
  cancelled?: boolean;
  timedOut?: boolean;
  blockReason?: string;
  failedChunkIndex?: number;
  extractionState?: {
    completed: number;
    total: number;
    failedChunkIndex?: number;
    chunkResults: ChunkResult[];
    rows: NameRow[];
  };
};

type ChunkResult = NameRow[] | null;

export const MODEL_OPTIONS = [
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    shortLabel: '3 Flash',
    inputUsdPerMillion: 0.5,
    outputUsdPerMillion: 3,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    shortLabel: '3.1 Lite',
    inputUsdPerMillion: 0.25,
    outputUsdPerMillion: 1.5,
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    shortLabel: '2.5 Flash',
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    shortLabel: '2.5 Lite',
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.4,
  },
 ] as const;
export type ModelId = (typeof MODEL_OPTIONS)[number]['id'];
export const DEFAULT_MODEL_ID = 'gemini-3.1-flash-lite';
export const GEMINI_TEXT_CHARS_PER_TOKEN = 4;
export const PROMPT_OVERHEAD_TOKENS = 260;
export const TIER_OPTIONS = [
  { id: 'free', label: 'Free API' },
  { id: 'tier1', label: 'Paid Tier 1' },
 ] as const;
export type TierId = (typeof TIER_OPTIONS)[number]['id'];
export const DEFAULT_TIER_ID = TIER_OPTIONS[0].id;
export const RATE_LIMITS = {
  free: {
    'gemini-3-flash-preview': { rpm: 10, tpm: 250000, rpd: 250 },
    'gemini-3.1-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
    'gemini-2.5-flash': { rpm: 10, tpm: 250000, rpd: 250 },
    'gemini-2.5-flash-lite': { rpm: 15, tpm: 250000, rpd: 1000 },
  },
  tier1: {
    'gemini-3-flash-preview': { rpm: 1000, tpm: 2000000, rpd: 10000 },
    'gemini-3.1-flash-lite': { rpm: 4000, tpm: 4000000, rpd: 150000 },
    'gemini-2.5-flash': { rpm: 1000, tpm: 1000000, rpd: 10000 },
    'gemini-2.5-flash-lite': { rpm: 4000, tpm: 4000000, rpd: '*' },
  },
} satisfies Record<TierId, Record<ModelId, RateLimits>>;
export const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  tierId: DEFAULT_TIER_ID,
  nameStyle: 'eastern',
  recallMode: 'high',
  descriptionMode: 'none',
  chunkSize: 4000,
  chunkOverlap: 400,
  maxConcurrent: 2,
  maxRetries: 4,
  requestTimeoutSeconds: 30,
};
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CATEGORIES = new Set<Category>(['Person', 'Location', 'Faction', 'Artifact', 'Skill', 'Title', 'Creature']);
const REQUEST_TIMEOUT_MS = 15000;
const FREE_TIER_REQUEST_TIMEOUT_MS = 30000;
const MIN_REQUEST_TIMEOUT_SECONDS = 5;
const MAX_REQUEST_TIMEOUT_SECONDS = 180;
const MIN_TIMEOUT_SPLIT_CHARS = 1200;
const LOWERCASE_HANVIET_SUFFIXES = parseLowercaseHanvietSuffixes(hauTuRaw);
const MIN_POLICY_BLOCK_SPLIT_CHARS = 500;
const GEMINI_SAFETY_SETTINGS_OFF = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
] as const;

export function normalizeExtractionSettings(settings: Partial<ExtractionSettings> = {}): ExtractionSettings {
  const tierId = settings.tierId && RATE_LIMITS[settings.tierId]
    ? settings.tierId
    : DEFAULT_EXTRACTION_SETTINGS.tierId;
  return {
    tierId,
    nameStyle: settings.nameStyle === 'western' ? 'western' : DEFAULT_EXTRACTION_SETTINGS.nameStyle,
    recallMode: settings.recallMode === 'balanced' ? 'balanced' : DEFAULT_EXTRACTION_SETTINGS.recallMode,
    descriptionMode: settings.descriptionMode === 'full' ? 'full' : DEFAULT_EXTRACTION_SETTINGS.descriptionMode,
    chunkSize: clampNumber(settings.chunkSize, 1000, 30000, DEFAULT_EXTRACTION_SETTINGS.chunkSize),
    chunkOverlap: clampNumber(settings.chunkOverlap, 0, 2000, DEFAULT_EXTRACTION_SETTINGS.chunkOverlap),
    maxConcurrent: clampNumber(settings.maxConcurrent, 1, 8, DEFAULT_EXTRACTION_SETTINGS.maxConcurrent),
    maxRetries: clampNumber(settings.maxRetries, 0, 8, DEFAULT_EXTRACTION_SETTINGS.maxRetries),
    requestTimeoutSeconds: clampNumber(
      settings.requestTimeoutSeconds,
      MIN_REQUEST_TIMEOUT_SECONDS,
      MAX_REQUEST_TIMEOUT_SECONDS,
      getDefaultRequestTimeoutSeconds(tierId),
    ),
  };
}

export function getModelOption(modelId: string) {
  return MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0];
}

export function getRateLimits(modelId: string, tierId: TierId = DEFAULT_TIER_ID): RateLimits {
  const resolvedModelId = isModelId(modelId) ? modelId : DEFAULT_MODEL_ID;
  return RATE_LIMITS[tierId]?.[resolvedModelId] || RATE_LIMITS[DEFAULT_TIER_ID][DEFAULT_MODEL_ID];
}

export function getModelPricing(modelId: string, tierId: TierId = DEFAULT_TIER_ID) {
  const model = getModelOption(modelId);
  if (tierId === 'free') {
    return {
      inputUsdPerMillion: 0,
      outputUsdPerMillion: 0,
    };
  }

  return {
    inputUsdPerMillion: model.inputUsdPerMillion,
    outputUsdPerMillion: model.outputUsdPerMillion,
  };
}

export function estimateTokens(text: string) {
  return estimateTokensFromCharCount(Array.from(text || '').length);
}

export function estimateTokensFromCharCount(charCount: number) {
  return Math.ceil(Math.max(0, charCount) / GEMINI_TEXT_CHARS_PER_TOKEN);
}

export function estimateUsage({
  text,
  chunks,
  rows,
  modelId,
  tierId = DEFAULT_TIER_ID,
}: {
  text: string;
  chunks: string[];
  rows: NameRow[];
  modelId: string;
  tierId?: TierId;
}) {
  const model = getModelOption(modelId);
  const pricing = getModelPricing(modelId, tierId);
  const inputTokens = estimateTokens(text) + chunks.length * PROMPT_OVERHEAD_TOKENS;
  const outputTokens = rows.length > 0
    ? estimateTokens(JSON.stringify({ names: rows }))
    : Math.ceil(Math.max(chunks.length * 450, inputTokens * 0.08));
  const inputCost = (inputTokens / 1_000_000) * pricing.inputUsdPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model,
    pricing,
  };
}

export function splitIntoChunks(text: string, settings: Partial<ExtractionSettings> = DEFAULT_EXTRACTION_SETTINGS) {
  const { chunkSize, chunkOverlap } = normalizeExtractionSettings(settings);
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const windowText = text.slice(start, end);
      const breakAt = Math.max(
        windowText.lastIndexOf('\n'),
        windowText.lastIndexOf('。'),
        windowText.lastIndexOf('！'),
        windowText.lastIndexOf('？'),
      );
      if (breakAt > chunkSize * 0.55) end = start + breakAt + 1;
    }

    chunks.push(text.slice(start, end));
    start = end >= text.length ? end : Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
}

export async function extractChunksWithQueue({
  apiKeys,
  modelId,
  chunks,
  settings,
  onProgress,
  initialChunkResults = [],
}: {
  apiKeys: string[];
  modelId: string;
  chunks: string[];
  settings: Partial<ExtractionSettings>;
  onProgress?: (progress: {
    completed: number;
    total: number;
    rows: NameRow[];
    chunkResults: ChunkResult[];
    statusLabel?: string;
  }) => void;
  initialChunkResults?: ChunkResult[];
}): Promise<NameRow[]> {
  const normalized = normalizeExtractionSettings(settings);
  const rateLimits = getRateLimits(modelId, normalized.tierId);
  const chunkResults = chunks.map((_, index) => (
    Array.isArray(initialChunkResults[index]) ? initialChunkResults[index] : null
  ));
  let completed = chunkResults.filter(Boolean).length;
  let nextIndex = 0;
  let nextKeyIndex = 0;
  let nextRequestAt = 0;
  const keyStates = apiKeys.map((key) => ({
    key,
    cooldownUntil: 0,
  }));
  let cancelled = false;
  let firstError: GeminiError | null = null;

  function getNextPendingIndex(): number {
    while (nextIndex < chunks.length && chunkResults[nextIndex]) nextIndex++;
    return nextIndex < chunks.length ? nextIndex++ : -1;
  }

  function emitProgress(extra: { statusLabel?: string } = {}) {
    onProgress?.({
      completed,
      total: chunks.length,
      rows: flattenChunkResults(chunkResults),
      chunkResults: [...chunkResults],
      ...extra,
    });
  }

  async function acquireApiKey(): Promise<{ key: string; cooldownUntil: number } | null> {
    const selection = getNextKeyState(keyStates, nextKeyIndex);
    nextKeyIndex = selection.nextKeyIndex;

    if (selection.waitMs > 0) {
      await sleepUntil(Date.now() + selection.waitMs, () => cancelled);
    }

    return cancelled ? null : selection.keyState;
  }

  function coolDownApiKey(keyState: { key: string; cooldownUntil: number } | null, error: GeminiError, attempt: number) {
    if (!keyState || error.status !== 429) return;
    keyState.cooldownUntil = Math.max(
      keyState.cooldownUntil,
      Date.now() + getRetryDelayMs(error, attempt),
    );
  }

  async function worker() {
    while (!cancelled) {
      const index = getNextPendingIndex();
      if (index === -1) return;
      const inputTokens = estimateTokens(chunks[index]) + PROMPT_OVERHEAD_TOKENS;
      try {
        const chunkRows = await extractChunkWithRetry({
          acquireApiKey,
          coolDownApiKey,
          waitForSlot: () => waitForRequestSlot({
            inputTokens,
            rateLimits,
            getNextRequestAt: () => nextRequestAt,
            setNextRequestAt: (value) => {
              nextRequestAt = value;
            },
            shouldCancel: () => cancelled,
          }),
          shouldCancel: () => cancelled,
          onAttempt: ({ attempt }) => {
            emitProgress({
              statusLabel: `Chunk ${index + 1}/${chunks.length} - thử ${attempt + 1}/${normalized.maxRetries + 1}`,
            });
          },
          onRetry: ({ waitMs, error, split, skipped }) => {
            emitProgress({
              statusLabel: skipped
                ? `Chunk ${index + 1}/${chunks.length} bị policy chặn, bỏ qua đoạn nhỏ`
                : split
                ? `Chunk ${index + 1}/${chunks.length} ${isPolicyBlockedError(error) ? 'bị policy chặn' : 'timeout'}, tách đôi để retry`
                : waitMs > 0
                ? `Chunk ${index + 1}/${chunks.length} retry sau ${Math.ceil(waitMs / 1000)}s`
                : `Chunk ${index + 1}/${chunks.length} đổi key retry`,
            });
          },
          modelId,
          chunk: chunks[index],
          index: index + 1,
          total: chunks.length,
          nameStyle: normalized.nameStyle,
          recallMode: normalized.recallMode,
          descriptionMode: normalized.descriptionMode,
          tierId: normalized.tierId,
          requestTimeoutSeconds: normalized.requestTimeoutSeconds,
          maxRetries: normalized.maxRetries,
        });

        chunkResults[index] = chunkRows;
        completed++;
        emitProgress();
      } catch (error) {
        const geminiError = toGeminiError(error);
        if (geminiError.cancelled && firstError) return;
        cancelled = true;
        if (!firstError) {
          firstError = geminiError;
          firstError.failedChunkIndex = index;
        }
      }
    }
  }

  const workerCount = Math.min(normalized.maxConcurrent, chunks.length);
  emitProgress();
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const finalError = firstError as GeminiError | null;
  if (finalError) {
    finalError.extractionState = {
      completed,
      total: chunks.length,
      failedChunkIndex: finalError.failedChunkIndex,
      chunkResults: [...chunkResults],
      rows: flattenChunkResults(chunkResults),
    };
    throw finalError;
  }

  return flattenChunkResults(chunkResults);
}

function flattenChunkResults(chunkResults: ChunkResult[]): NameRow[] {
  return chunkResults.flatMap((rows) => (Array.isArray(rows) ? rows : []));
}

async function extractChunkWithRetry({
  acquireApiKey,
  coolDownApiKey,
  waitForSlot,
  shouldCancel,
  onAttempt,
  onRetry,
  modelId,
  chunk,
  index,
  total,
  nameStyle,
  recallMode,
  descriptionMode,
  tierId,
  requestTimeoutSeconds,
  maxRetries,
}: {
  acquireApiKey: () => Promise<{ key: string; cooldownUntil: number } | null>;
  coolDownApiKey: (keyState: { key: string; cooldownUntil: number } | null, error: GeminiError, attempt: number) => void;
  waitForSlot: () => Promise<boolean>;
  shouldCancel?: () => boolean;
  onAttempt?: (progress: { attempt: number }) => void;
  onRetry?: (progress: { waitMs: number; error: GeminiError; attempt: number; split?: boolean; skipped?: boolean }) => void;
  modelId: string;
  chunk: string;
  index: number;
  total: number;
  nameStyle: NameStyle;
  recallMode: RecallMode;
  descriptionMode: DescriptionMode;
  tierId: TierId;
  requestTimeoutSeconds: number;
  maxRetries: number;
}): Promise<NameRow[]> {
  let attempt = 0;

  while (true) {
    const keyState = await acquireApiKey();
    if (!keyState || shouldCancel?.()) {
      const error: GeminiError = new Error('Đã dừng request Gemini.');
      error.cancelled = true;
      throw error;
    }

    try {
      onAttempt?.({ attempt });
      const hasSlot = await waitForSlot();
      if (!hasSlot || shouldCancel?.()) {
        const error: GeminiError = new Error('Đã dừng request Gemini.');
        error.cancelled = true;
        throw error;
      }

      return await extractChunk(keyState.key, modelId, chunk, index, total, nameStyle, recallMode, descriptionMode, requestTimeoutSeconds);
    } catch (error) {
      const geminiError = toGeminiError(error);
      coolDownApiKey(keyState, geminiError, attempt);
      if (isPolicyBlockedError(geminiError)) {
        if (canSplitChunkForPolicyBlock(chunk)) {
          const [leftChunk, rightChunk] = splitChunkForRetry(chunk);
          onRetry?.({ waitMs: 0, error: geminiError, attempt, split: true });

          const commonArgs = {
            acquireApiKey,
            coolDownApiKey,
            waitForSlot,
            shouldCancel,
            onAttempt,
            onRetry,
            modelId,
            index,
            total,
            nameStyle,
            recallMode,
            descriptionMode,
            tierId,
            requestTimeoutSeconds,
            maxRetries,
          };
          const leftRows = await extractChunkWithRetry({ ...commonArgs, chunk: leftChunk });
          const rightRows = await extractChunkWithRetry({ ...commonArgs, chunk: rightChunk });
          return [...leftRows, ...rightRows];
        }

        onRetry?.({ waitMs: 0, error: geminiError, attempt, skipped: true });
        return [];
      }
      if (!geminiError.retryable || attempt >= maxRetries) throw geminiError;
      if (geminiError.timedOut && canSplitChunkForRetry(chunk)) {
        const [leftChunk, rightChunk] = splitChunkForRetry(chunk);
        const remainingRetries = Math.max(0, maxRetries - attempt - 1);
        onRetry?.({ waitMs: 0, error: geminiError, attempt, split: true });

        const commonArgs = {
          acquireApiKey,
          coolDownApiKey,
          waitForSlot,
          shouldCancel,
          onAttempt,
          onRetry,
          modelId,
          index,
          total,
          nameStyle,
          recallMode,
          descriptionMode,
          tierId,
          requestTimeoutSeconds,
          maxRetries: remainingRetries,
        };
        const leftRows = await extractChunkWithRetry({ ...commonArgs, chunk: leftChunk });
        const rightRows = await extractChunkWithRetry({ ...commonArgs, chunk: rightChunk });
        return [...leftRows, ...rightRows];
      }
      const waitMs = geminiError.status === 429 ? 0 : getRetryDelayMs(geminiError, attempt);
      onRetry?.({ waitMs, error: geminiError, attempt });
      if (waitMs > 0) {
        await sleepUntil(Date.now() + waitMs, shouldCancel);
      }
      attempt++;
    }
  }
}

function getNextKeyState(keyStates: Array<{ key: string; cooldownUntil: number }>, startIndex: number) {
  const now = Date.now();
  let bestIndex = 0;
  let bestCooldownUntil = Number.POSITIVE_INFINITY;

  for (let offset = 0; offset < keyStates.length; offset++) {
    const index = (startIndex + offset) % keyStates.length;
    const keyState = keyStates[index];
    if (keyState.cooldownUntil <= now) {
      return {
        keyState,
        nextKeyIndex: (index + 1) % keyStates.length,
        waitMs: 0,
      };
    }

    if (keyState.cooldownUntil < bestCooldownUntil) {
      bestCooldownUntil = keyState.cooldownUntil;
      bestIndex = index;
    }
  }

  return {
    keyState: keyStates[bestIndex],
    nextKeyIndex: (bestIndex + 1) % keyStates.length,
    waitMs: Math.max(0, bestCooldownUntil - now),
  };
}

function getDefaultRequestTimeoutSeconds(tierId: TierId) {
  const timeoutMs = tierId === 'free' ? FREE_TIER_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  return Math.round(timeoutMs / 1000);
}

function canSplitChunkForRetry(chunk: string) {
  return chunk.trim().length >= MIN_TIMEOUT_SPLIT_CHARS;
}

function canSplitChunkForPolicyBlock(chunk: string) {
  return chunk.trim().length >= MIN_POLICY_BLOCK_SPLIT_CHARS;
}

function splitChunkForRetry(chunk: string): [string, string] {
  const midpoint = Math.floor(chunk.length / 2);
  const minSideLength = Math.floor(chunk.length * 0.25);
  const breakChars = ['\n', '。', '！', '？', '；', ';', '，', ','];
  let splitAt = midpoint;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const breakChar of breakChars) {
    const leftIndex = chunk.lastIndexOf(breakChar, midpoint);
    if (leftIndex >= minSideLength) {
      const candidate = leftIndex + breakChar.length;
      const distance = Math.abs(candidate - midpoint);
      if (distance < bestDistance) {
        splitAt = candidate;
        bestDistance = distance;
      }
    }

    const rightIndex = chunk.indexOf(breakChar, midpoint);
    if (rightIndex !== -1 && rightIndex <= chunk.length - minSideLength) {
      const candidate = rightIndex + breakChar.length;
      const distance = Math.abs(candidate - midpoint);
      if (distance < bestDistance) {
        splitAt = candidate;
        bestDistance = distance;
      }
    }
  }

  return [chunk.slice(0, splitAt), chunk.slice(splitAt)];
}

async function extractChunk(
  apiKey: string,
  modelId: string,
  chunk: string,
  index: number,
  total: number,
  nameStyle: NameStyle,
  recallMode: RecallMode,
  descriptionMode: DescriptionMode,
  requestTimeoutSeconds: number,
): Promise<NameRow[]> {
  const controller = new AbortController();
  const requestTimeoutMs = requestTimeoutSeconds * 1000;
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(chunk, index, total, nameStyle, recallMode, descriptionMode) }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
        },
        safetySettings: GEMINI_SAFETY_SETTINGS_OFF,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError: GeminiError = new Error(`Gemini request quá ${Math.round(requestTimeoutMs / 1000)} giây ở chunk ${index}/${total}.`);
      timeoutError.retryable = true;
      timeoutError.timedOut = true;
      throw timeoutError;
    }
    const geminiError = toGeminiError(error);
    geminiError.retryable = true;
    throw geminiError;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error: GeminiError = new Error(`Gemini API ${response.status}: ${detail.slice(0, 280)}`);
    error.status = response.status;
    error.retryable = response.status === 429 || response.status >= 500;
    error.retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
    throw error;
  }

  const data = await response.json();
  const text = getGeminiResponseText(data, index, total);
  try {
    return normalizeRows(parseJsonPayload(text));
  } catch (parseError) {
    const geminiError = toGeminiError(parseError);
    geminiError.retryable = true;
    throw geminiError;
  }
}

async function waitForRequestSlot({
  inputTokens,
  rateLimits,
  getNextRequestAt,
  setNextRequestAt,
  shouldCancel,
}: {
  inputTokens: number;
  rateLimits: RateLimits;
  getNextRequestAt: () => number;
  setNextRequestAt: (value: number) => void;
  shouldCancel?: () => boolean;
}) {
  const rpmSpacingMs = Math.ceil(60000 / rateLimits.rpm);
  const tpmSpacingMs = Math.ceil((inputTokens / rateLimits.tpm) * 60000);
  const spacingMs = Math.max(rpmSpacingMs, tpmSpacingMs);
  const now = Date.now();
  const scheduledAt = Math.max(now, getNextRequestAt());
  setNextRequestAt(scheduledAt + spacingMs);

  if (scheduledAt > now) {
    await sleepUntil(scheduledAt, shouldCancel);
  }

  return !shouldCancel?.();
}

function getRetryDelayMs(error: GeminiError, attempt: number) {
  if (error.retryAfterMs) return error.retryAfterMs;
  const base = Math.min(16000, 2000 * (2 ** attempt));
  return base + Math.floor(Math.random() * 400);
}

function parseRetryAfter(value: string | null) {
  if (!value) return 0;
  const seconds = Number.parseFloat(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function sleepUntil(targetTime: number, shouldCancel?: () => boolean) {
  while (Date.now() < targetTime) {
    if (shouldCancel?.()) return;
    await sleep(Math.min(250, targetTime - Date.now()));
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function mergeRows(rows: NameRow[], sourceText: string, options: { exactCounts?: boolean } = {}) {
  const { exactCounts = true } = options;
  const map = new Map<string, NameRow>();

  for (const row of rows) {
    const current = map.get(row.chinese);
    if (!current) {
      map.set(row.chinese, { ...row });
      continue;
    }

    current.count += row.count;
    if (!current.hanviet && row.hanviet) current.hanviet = row.hanviet;
    if (current.description.length < row.description.length) current.description = row.description;
    if (current.category !== row.category && current.category === 'Person') current.category = row.category;
  }

  if (exactCounts) {
    for (const row of map.values()) {
      const exactCount = countOccurrences(sourceText, row.chinese);
      row.count = exactCount || row.count;
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.chinese.localeCompare(b.chinese, 'zh-Hans-CN'));
}

function buildPrompt(
  chunk: string,
  index: number,
  total: number,
  nameStyle: NameStyle,
  recallMode: RecallMode,
  descriptionMode: DescriptionMode,
) {
  const romanizationRule = nameStyle === 'western'
    ? [
      '- This text may contain international names from Western, Japanese, Korean, Chinese, or mixed settings.',
      '- The "hanviet" field is a Vietnamese display name, not always English.',
      '- For clearly non-Chinese foreign names, output the natural original-language Latin spelling/transliteration when recoverable from common usage or context.',
      '- For Japanese personal names, use common Hepburn-style romanization, not Vietnamese Sino-reading. If the text contains Japanese surnames/given names such as 夏目, 藤原, 近藤, 西園寺, 雪村, 月島, 酒井, 堀川, 安井, 中島, 山本, 福田, 秋田, 山口, 東野, 御堂, 大西, 千景, 琉璃, 葵, 美雪, 七瀨, 鈴音, 未希, 凜, 紫苑, 佳織, 雅介, 亮鬥, 悟史, 康司, 司, 紗奈, 博太, 惠子, 智彥, 圭吾, 織姬, output Japanese-style romanization consistently.',
      '- Do not mix Japanese romanization and Vietnamese Sino-reading for names from the same Japanese context. Prefer Natsume Chikage over Hạ Mục Thiên Cảnh, Fujiwara Aoi over Đằng Nguyên Quỳ, Kondo Miyuki over Cận Đằng Mỹ Tuyết, Tsukishima Rin over Nguyệt Đảo Lẫm.',
      '- Preserve the name language instead of converting everything to English. Examples: 阿瑟 -> Arthur, 梅林 -> Merlin, 德川 -> Tokuda/Tokugawa when context supports it, 樱/樱花 as a Japanese name -> Sakura.',
      '- For Chinese/East Asian names that are Chinese, xianxia-style, sect/title/realm-style, or not clearly foreign, use Vietnamese Sino-reading with full Vietnamese diacritics.',
      '- If the exact foreign spelling is uncertain and the name could be Chinese, prefer Vietnamese Sino-reading instead of forcing an English guess.',
      '- Never convert every name to English. International stories can contain names from multiple languages.',
    ]
    : [
      '- This text is Eastern/Chinese fantasy. The "hanviet" field must be Vietnamese Sino-reading with full Vietnamese diacritics, title case with spaces.',
      '- Never output unaccented romanization for Eastern names. Bad: Truong Sinh Benh, Cuc De, Luu Vu. Good: Trường Sinh Bệnh, Cực Đế, Lưu Vũ.',
      '- Use common Vietnamese Sino-Vietnamese readings: 天=Thiên, 算=Toán, 老=Lão, 人=Nhân, 王=Vương, 国=Quốc, 山=Sơn, 海=Hải, 神=Thần, 风=Phong, 子=Tử.',
    ];

  const recallRules = recallMode === 'balanced'
    ? [
      'Primary goal: balanced precision and recall.',
      '- Extract named entities only when the context reasonably supports that they are proper names.',
      '- Include one-off names if they are clearly entities.',
      '- Skip ambiguous common 2-4 character phrases unless the surrounding context treats them like a person, place, faction, item, skill, title, or creature.',
      '- If unsure, include medium/high confidence entities and skip very weak guesses.',
    ]
    : [
      'Primary goal: high recall. It is better to include a plausible proper name than to miss it.',
      '- Scan the chunk twice internally before answering: first for obvious names, second for rare/one-off names.',
      '- Extract all named entities, including names that appear only once.',
      '- Do not limit the list to main characters or frequent names.',
      '- Include aliases, courtesy names, titles used as names, place names, sect/faction names, artifact names, skill names, creature names, and unique realm/world names.',
      '- Skip common words and generic phrases only when they are clearly not used as a name/title/entity.',
      '- For ambiguous 2-4 Chinese character phrases, include them if the surrounding context treats them like a person, place, faction, item, skill, title, or creature.',
    ];
  const includeDescription = descriptionMode !== 'none';
  const schema = includeDescription
    ? 'Schema: {"names":[{"chinese":"中文原文","hanviet":"Vietnamese display name","category":"Person|Location|Faction|Artifact|Skill|Title|Creature","description":"short neutral Vietnamese description","count":estimated_occurrences_in_this_chunk}]}'
    : 'Schema: {"names":[{"chinese":"中文原文","hanviet":"Vietnamese display name","category":"Person|Location|Faction|Artifact|Skill|Title|Creature","description":"","count":estimated_occurrences_in_this_chunk}]}';
  const descriptionRules = includeDescription
    ? [
      '- description must be concise Vietnamese, max 12 words.',
      '- description must be neutral role/context only. Do not describe violence, sexual content, illegal acts, self-harm, abuse, or other sensitive plot events.',
    ]
    : [
      '- Always set description to an empty string. Do not infer or write any description.',
    ];

  return [
    'You extract proper names from raw Chinese web novel text.',
    'This is a neutral named-entity extraction task for fiction text.',
    'Do not summarize, continue, translate, classify, judge, or describe sensitive events from the source text.',
    'Only extract proper names and minimal entity metadata needed by the JSON schema.',
    'If surrounding content is sensitive, ignore the sensitive action and still extract names/entities only.',
    'Return exactly one valid JSON object. No markdown. No prose. No second JSON object. No text before or after JSON.',
    schema,
    'Rules:',
    ...recallRules,
    '- Keep chinese exactly as it appears in the source.',
    ...romanizationRule,
    ...descriptionRules,
    '- Do not merge different Chinese spellings even if they may refer to the same entity.',
    '- Do not drop a valid entity just because its count is 1.',
    `Chunk ${index}/${total}:`,
    chunk,
  ].join('\n');
}

function parseJsonPayload(payload: string): unknown {
  const trimmed = payload.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonObject = extractFirstJsonObject(trimmed);
    if (!jsonObject) throw new Error('Gemini không trả về JSON hợp lệ.');
    return JSON.parse(jsonObject);
  }
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf('{');
  if (start === -1) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index++) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return '';
}

function normalizeRows(payload: unknown): NameRow[] {
  const list = Array.isArray(payload)
    ? payload
    : isObjectWithNames(payload)
      ? payload.names
      : [];
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => normalizeRowItem(item))
    .filter((item) => /[\u3400-\u9fff]/.test(item.chinese) && item.hanviet);
}

function normalizeRowItem(item: unknown): NameRow {
  const record = isRecord(item) ? item : {};
  const category = typeof record.category === 'string' && CATEGORIES.has(record.category as Category)
    ? record.category as Category
    : 'Person';

  return {
    chinese: String(record.chinese || record.name || '').trim(),
    hanviet: formatHanvietName(String(record.hanviet || record.hanViet || '').trim()),
    category,
    description: String(record.description || '').trim(),
    count: Math.max(1, Number.parseInt(String(record.count || record.frequency || 1), 10) || 1),
  };
}

function countOccurrences(text: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count++;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatHanvietName(value: string) {
  return applyLowercaseHanvietSuffix(titleCaseWords(value));
}

function applyLowercaseHanvietSuffix(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const lowerWords = words.map((word) => word.toLocaleLowerCase('vi'));
  for (const suffix of LOWERCASE_HANVIET_SUFFIXES) {
    if (suffix.words.length > words.length) continue;
    const start = words.length - suffix.words.length;
    const matches = suffix.words.every((word, index) => lowerWords[start + index] === word);
    if (!matches) continue;
    return [...words.slice(0, start), ...suffix.words].join(' ');
  }

  return words.join(' ');
}

function parseLowercaseHanvietSuffixes(raw: string) {
  const suffixes = new Map<string, string[]>();

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const [, value = line] = line.split('=');
    const text = value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
    if (!text) continue;
    suffixes.set(text, text.split(' '));
  }

  return [...suffixes.entries()]
    .map(([text, words]) => ({ text, words }))
    .sort((a, b) => b.words.length - a.words.length || b.text.length - a.text.length);
}

function isModelId(value: string): value is ModelId {
  return MODEL_OPTIONS.some((model) => model.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isObjectWithNames(value: unknown): value is { names: unknown[] } {
  return isRecord(value) && Array.isArray(value.names);
}

function toGeminiError(error: unknown): GeminiError {
  if (error instanceof Error) return error as GeminiError;
  return new Error(String(error)) as GeminiError;
}

function getGeminiResponseText(data: unknown, index: number, total: number): string {
  if (!isRecord(data)) return '';

  if (isRecord(data.promptFeedback) && typeof data.promptFeedback.blockReason === 'string') {
    throw createBlockedResponseError({
      blockReason: data.promptFeedback.blockReason,
      index,
      total,
      responseId: typeof data.responseId === 'string' ? data.responseId : undefined,
    });
  }

  if (!Array.isArray(data.candidates)) return '';
  const candidate = data.candidates[0];
  if (!isRecord(candidate)) {
    if (isRecord(data.promptFeedback)) {
      throw createBlockedResponseError({
        blockReason: 'NO_CANDIDATE',
        index,
        total,
        responseId: typeof data.responseId === 'string' ? data.responseId : undefined,
      });
    }
    return '';
  }

  const finishReason = typeof candidate.finishReason === 'string' ? candidate.finishReason : '';
  if (finishReason === 'SAFETY' || finishReason === 'BLOCKLIST' || finishReason === 'PROHIBITED_CONTENT') {
    throw createBlockedResponseError({
      blockReason: finishReason,
      index,
      total,
      responseId: typeof data.responseId === 'string' ? data.responseId : undefined,
    });
  }

  if (!isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return '';
  return candidate.content.parts
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .join('\n');
}

function createBlockedResponseError({
  blockReason,
  index,
  total,
  responseId,
}: {
  blockReason: string;
  index: number;
  total: number;
  responseId?: string;
}): GeminiError {
  const suffix = responseId ? ` Response ID: ${responseId}.` : '';
  const error: GeminiError = new Error(
    `Gemini chặn chunk ${index}/${total}: ${getBlockReasonLabel(blockReason)}. ` +
    'Chunk này có thể chứa nội dung bị policy chặn; hãy xóa/giảm đoạn nhạy cảm hoặc giảm cỡ chunk rồi chạy lại.' +
    suffix,
  );
  error.blockReason = blockReason;
  error.retryable = false;
  return error;
}

function getBlockReasonLabel(blockReason: string) {
  switch (blockReason) {
    case 'PROHIBITED_CONTENT':
      return 'nội dung bị cấm';
    case 'SAFETY':
      return 'bộ lọc an toàn';
    case 'BLOCKLIST':
      return 'nội dung nằm trong blocklist';
    case 'NO_CANDIDATE':
      return 'không có kết quả trả về';
    default:
      return `blockReason=${blockReason}`;
  }
}

function isPolicyBlockedError(error: GeminiError) {
  return error.blockReason === 'PROHIBITED_CONTENT' ||
    error.blockReason === 'SAFETY' ||
    error.blockReason === 'BLOCKLIST';
}
