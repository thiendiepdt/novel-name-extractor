import {
  DEFAULT_EXTRACTION_SETTINGS,
  DEFAULT_MODEL_ID,
  PROMPT_OVERHEAD_TOKENS,
  estimateTokensFromCharCount,
  getModelOption,
  getModelPricing,
  normalizeExtractionSettings,
} from '@/lib/gemini';
import { GUIDE_CHARS_PER_CHAPTER, GUIDE_NOVEL_CHAPTERS } from '../constants';
import type { GuideEstimate } from '../types';

export function getGuideNovelEstimate(): GuideEstimate {
  const model = getModelOption(DEFAULT_MODEL_ID);
  const pricing = getModelPricing(DEFAULT_MODEL_ID, 'tier1');
  const settings = normalizeExtractionSettings(DEFAULT_EXTRACTION_SETTINGS);
  const totalChars = GUIDE_NOVEL_CHAPTERS * GUIDE_CHARS_PER_CHAPTER;
  const chunkStep = Math.max(1, settings.chunkSize - settings.chunkOverlap);
  const chunkCount = Math.max(1, Math.ceil(Math.max(1, totalChars - settings.chunkOverlap) / chunkStep));
  const inputTokens = estimateTokensFromCharCount(totalChars, model.id) + (chunkCount * PROMPT_OVERHEAD_TOKENS);
  const outputTokens = Math.ceil(Math.max(chunkCount * 450, inputTokens * 0.08));
  const inputCost = (inputTokens / 1_000_000) * pricing.inputUsdPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;

  return {
    model,
    chunkCount,
    inputTokens,
    outputTokens,
    totalCost: inputCost + outputCost,
  };
}
