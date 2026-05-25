import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS } from '../constants';
import {
  HANVIET_OVERRIDE_ALL_CATEGORIES,
  HANVIET_OVERRIDE_CATEGORY_OPTIONS,
  getHanvietOverrideRuleGroups,
  type HanvietOverrideCategory,
  type HanvietOverrideRule,
  type HanvietOverrideRuleGroup,
  type HanvietOverrideTargetMap,
} from '../lib/hanviet-overrides';

export function HanvietOverridesPanel({
  rules,
  onAddRule,
  onClearRules,
  onImportFile,
  onRemoveRuleGroup,
  onSaveRuleGroup,
}: {
  rules: HanvietOverrideRule[];
  onAddRule: (source: string, target: string) => boolean;
  onClearRules: () => void;
  onImportFile: (file: File | undefined) => void;
  onRemoveRuleGroup: (source: string) => void;
  onSaveRuleGroup: (previousSource: string, source: string, targets: HanvietOverrideTargetMap) => boolean;
}) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [search, setSearch] = useState('');
  const [editingGroup, setEditingGroup] = useState<HanvietOverrideRuleGroup | null>(null);
  const groups = useMemo(() => getHanvietOverrideRuleGroups(rules), [rules]);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return groups;

    return groups.filter((group) => (
      group.source.toLocaleLowerCase('vi').includes(query) ||
      group.rules.some((rule) => rule.target.toLocaleLowerCase('vi').includes(query))
    ));
  }, [groups, search]);

  function addRule() {
    if (!onAddRule(source, target)) return;
    setSource('');
    setTarget('');
  }

  return (
    <>
      <Card className="flex h-[18rem] shrink-0 flex-col overflow-hidden">
        <CardHeader className="grid grid-cols-[auto_1fr] gap-2 p-2">
          <CardTitle>Sửa Hán Việt</CardTitle>
          <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
            <Upload className="h-4 w-4" />
            TXT
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => {
                onImportFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </CardHeader>

        <div className="grid gap-2 border-t border-border p-2">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <Input
              className="h-8"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addRule();
              }}
              placeholder="Hán / Hán Việt"
            />
            <Input
              className="h-8"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addRule();
              }}
              placeholder="Mặc định"
            />
            <Button className="h-8 px-2" onClick={addRule}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm rule..."
            />
          </div>
        </div>

        <CardContent className="min-h-0 flex-1 overflow-auto border-t border-border p-0">
          {groups.length === 0 ? (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
              Chưa có rule Hán=Việt.
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
              Không có rule khớp tìm kiếm.
            </div>
          ) : (
            <div className="divide-y divide-border text-xs">
              {filteredGroups.map((group) => (
                <div key={group.source} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-2 py-1.5 hover:bg-accent/40">
                  <button type="button" className="min-w-0 text-left" onClick={() => setEditingGroup(group)}>
                    <div className="truncate font-mono text-foreground">{group.source}={getPrimaryTarget(group)}</div>
                    <div className="truncate text-muted-foreground">{getGroupSummary(group)}</div>
                  </button>
                  <Button
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => onRemoveRuleGroup(group.source)}
                    title="Xóa rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
          <span>{filteredGroups.length.toLocaleString()} / {groups.length.toLocaleString()} mục, {rules.length.toLocaleString()} rule</span>
          <Button variant="ghost" className="h-7 px-2" disabled={rules.length === 0} onClick={onClearRules}>
            Xóa hết
          </Button>
        </div>
      </Card>

      {editingGroup && (
        <HanvietOverrideDialog
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSave={(nextSource, targets) => {
            if (!onSaveRuleGroup(editingGroup.source, nextSource, targets)) return;
            setEditingGroup(null);
          }}
        />
      )}
    </>
  );
}

function HanvietOverrideDialog({
  group,
  onClose,
  onSave,
}: {
  group: HanvietOverrideRuleGroup;
  onClose: () => void;
  onSave: (source: string, targets: HanvietOverrideTargetMap) => void;
}) {
  const [source, setSource] = useState(group.source);
  const [targets, setTargets] = useState<HanvietOverrideTargetMap>({ ...group.targets });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 text-foreground">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">Sửa Hán Việt Theo Loại</h2>
          </div>
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Hán / Hán Việt</span>
            <Input value={source} onChange={(event) => setSource(event.target.value)} />
          </label>

          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {HANVIET_OVERRIDE_CATEGORY_OPTIONS.map((category) => (
              <label key={category} className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 p-2 text-sm">
                <span className="truncate text-muted-foreground">{getCategoryLabel(category)}</span>
                <Input
                  className="h-8"
                  value={targets[category] || ''}
                  onChange={(event) => setTargets((current) => ({ ...current, [category]: event.target.value }))}
                  placeholder={category === HANVIET_OVERRIDE_ALL_CATEGORIES ? 'Tên mặc định' : 'Để trống nếu giữ mặc định'}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-3">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button onClick={() => onSave(source, targets)}>Lưu</Button>
        </div>
      </div>
    </div>
  );
}

function getPrimaryTarget(group: HanvietOverrideRuleGroup) {
  return group.targets[HANVIET_OVERRIDE_ALL_CATEGORIES] || group.rules[0]?.target || '';
}

function getGroupSummary(group: HanvietOverrideRuleGroup) {
  return HANVIET_OVERRIDE_CATEGORY_OPTIONS
    .filter((category) => group.targets[category])
    .map((category) => getCategoryLabel(category))
    .join(', ');
}

function getCategoryLabel(category: HanvietOverrideCategory) {
  if (category === HANVIET_OVERRIDE_ALL_CATEGORIES) return 'Tất cả loại';
  return CATEGORY_LABELS[category] || category;
}
