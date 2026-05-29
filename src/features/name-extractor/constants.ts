export const STORAGE_KEYS = {
  legacyApiKey: 'ai_name_extractor_api_key',
  apiKeys: 'ai_name_extractor_api_keys_list',
  deepseekApiKeys: 'ai_name_extractor_deepseek_api_keys_list',
  openaiApiKeys: 'ai_name_extractor_openai_api_keys_list',
  openaiBaseUrl: 'ai_name_extractor_openai_base_url',
  openaiModelOverride: 'ai_name_extractor_openai_model_override',
  model: 'ai_name_extractor_model',
  settings: 'ai_name_extractor_settings',
  hanvietOverrides: 'ai_name_extractor_hanviet_overrides',
  pageSize: 'ai_name_extractor_page_size',
  theme: 'ai_name_extractor_theme',
};

export const CATEGORIES: Category[] = ['Person', 'Location', 'Faction', 'Artifact', 'Skill', 'Title', 'Creature'];

export const CATEGORY_LABELS: Record<Category, string> = {
  Person: 'Nhân vật',
  Location: 'Địa danh',
  Faction: 'Tông phái',
  Artifact: 'Vật phẩm',
  Skill: 'Công pháp',
  Title: 'Danh hiệu',
  Creature: 'Sinh vật',
};

export const TEXTAREA_CHAR_LIMIT = 20000;
export const GUIDE_NOVEL_CHAPTERS = 500;
export const GUIDE_CHARS_PER_CHAPTER = 3000;
import type { Category } from '@/lib/gemini';
