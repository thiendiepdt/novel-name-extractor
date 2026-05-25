import type { Category, NameRow } from '@/lib/gemini';
import { translateHanVietName } from '@/lib/gemini';
import { CATEGORIES } from '../constants';

export const HANVIET_OVERRIDE_ALL_CATEGORIES = 'all';

export type HanvietOverrideCategory = typeof HANVIET_OVERRIDE_ALL_CATEGORIES | Category;

export type HanvietOverrideRule = {
  id: string;
  source: string;
  target: string;
  category: HanvietOverrideCategory;
};

export type HanvietOverrideTargetMap = Partial<Record<HanvietOverrideCategory, string>>;

export type HanvietOverrideRuleGroup = {
  source: string;
  rules: HanvietOverrideRule[];
  targets: HanvietOverrideTargetMap;
};

export const HANVIET_OVERRIDE_CATEGORY_OPTIONS: HanvietOverrideCategory[] = [
  HANVIET_OVERRIDE_ALL_CATEGORIES,
  ...CATEGORIES,
];

const CATEGORY_SET = new Set<string>(CATEGORIES);
const HAN_CHARACTER_PATTERN = /\p{Script=Han}/u;

export function createHanvietOverrideRule(
  source: string,
  target: string,
  category: HanvietOverrideCategory = HANVIET_OVERRIDE_ALL_CATEGORIES,
): HanvietOverrideRule | null {
  const normalizedSource = normalizeOverrideText(source);
  const normalizedTarget = normalizeOverrideText(target);
  if (!normalizedSource || !normalizedTarget) return null;

  return {
    id: createRuleId(),
    source: normalizedSource,
    target: normalizedTarget,
    category: normalizeOverrideCategory(category),
  };
}

export function normalizeHanvietOverrideRules(value: unknown): HanvietOverrideRule[] {
  if (!Array.isArray(value)) return [];

  const rules: HanvietOverrideRule[] = [];
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const source = normalizeOverrideText(item.source);
    const target = normalizeOverrideText(item.target);
    if (!source || !target) continue;

    rules.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `legacy-${index}-${source}`,
      source,
      target,
      category: normalizeOverrideCategory(item.category),
    });
  }

  return rules;
}

export function parseHanvietOverrideText(
  text: string,
  category: HanvietOverrideCategory = HANVIET_OVERRIDE_ALL_CATEGORIES,
) {
  const rules: HanvietOverrideRule[] = [];
  let ignored = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      ignored++;
      continue;
    }

    const rule = createHanvietOverrideRule(
      line.slice(0, separatorIndex),
      line.slice(separatorIndex + 1),
      category,
    );
    if (rule) rules.push(rule);
    else ignored++;
  }

  return { rules, ignored };
}

export function upsertHanvietOverrideRules(current: unknown, incoming: HanvietOverrideRule[]) {
  const next = normalizeHanvietOverrideRules(current);

  for (const rule of incoming) {
    const existingIndex = next.findIndex((item) => getRuleKey(item) === getRuleKey(rule));
    if (existingIndex === -1) {
      next.push(rule);
      continue;
    }

    next[existingIndex] = {
      ...rule,
      id: next[existingIndex].id,
    };
  }

  return next;
}

export function getHanvietOverrideRuleGroups(rules: HanvietOverrideRule[]): HanvietOverrideRuleGroup[] {
  const groups = new Map<string, HanvietOverrideRuleGroup>();

  for (const rule of normalizeHanvietOverrideRules(rules)) {
    const key = rule.source.toLocaleLowerCase('vi');
    const group = groups.get(key) || { source: rule.source, rules: [], targets: {} };
    group.rules.push(rule);
    group.targets[rule.category] = rule.target;
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) => left.source.localeCompare(right.source, 'vi'));
}

export function replaceHanvietOverrideRuleGroup(
  current: unknown,
  previousSource: string,
  nextSource: string,
  targets: HanvietOverrideTargetMap,
) {
  const normalizedPreviousSource = normalizeOverrideText(previousSource).toLocaleLowerCase('vi');
  const remaining = normalizeHanvietOverrideRules(current).filter(
    (rule) => rule.source.toLocaleLowerCase('vi') !== normalizedPreviousSource,
  );
  const incoming = HANVIET_OVERRIDE_CATEGORY_OPTIONS
    .map((category) => createHanvietOverrideRule(nextSource, targets[category] || '', category))
    .filter((rule): rule is HanvietOverrideRule => Boolean(rule));

  return upsertHanvietOverrideRules(remaining, incoming);
}

export function removeHanvietOverrideRuleGroup(current: unknown, source: string) {
  const normalizedSource = normalizeOverrideText(source).toLocaleLowerCase('vi');
  return normalizeHanvietOverrideRules(current).filter(
    (rule) => rule.source.toLocaleLowerCase('vi') !== normalizedSource,
  );
}

export function applyHanvietOverrideRules(rows: NameRow[], rules: HanvietOverrideRule[]): NameRow[] {
  const normalizedRules = normalizeHanvietOverrideRules(rules);
  if (normalizedRules.length === 0) return rows;

  return rows.map((row) => {
    const hanviet = applyHanvietOverrideRulesToRow(row, normalizedRules);
    return hanviet === row.hanviet ? row : { ...row, hanviet };
  });
}

function applyHanvietOverrideRulesToRow(row: NameRow, rules: HanvietOverrideRule[]) {
  const activeRules = [
    ...rules.filter((rule) => rule.category === HANVIET_OVERRIDE_ALL_CATEGORIES),
    ...rules.filter((rule) => rule.category === row.category),
  ];

  let value = row.hanviet;
  for (const rule of activeRules) {
    value = applyHanvietOverrideRule(value, row.chinese, rule);
  }

  return value;
}

function applyHanvietOverrideRule(value: string, chinese: string, rule: HanvietOverrideRule) {
  if (containsHanChar(rule.source)) {
    if (chinese === rule.source) return rule.target;

    const sourceReading = translateHanVietName(rule.source);
    if (sourceReading && chinese.includes(rule.source)) {
      return replacePhrase(value, sourceReading, rule.target);
    }

    return value;
  }

  return replacePhrase(value, rule.source, rule.target);
}

function replacePhrase(value: string, source: string, target: string) {
  if (!source || !target) return value;
  const direct = value.split(source).join(target);
  if (direct !== value) return direct;

  return value.replace(new RegExp(escapeRegExp(source), 'giu'), () => target);
}

function normalizeOverrideCategory(value: unknown): HanvietOverrideCategory {
  if (typeof value === 'string' && CATEGORY_SET.has(value)) return value as Category;
  return HANVIET_OVERRIDE_ALL_CATEGORIES;
}

function normalizeOverrideText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getRuleKey(rule: HanvietOverrideRule) {
  return `${rule.category}:${rule.source.toLocaleLowerCase('vi')}`;
}

function containsHanChar(value: string) {
  return Array.from(value).some((char) => HAN_CHARACTER_PATTERN.test(char));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createRuleId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
