import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  History,
  X,
  Trash2,
} from 'lucide-react';
import { usePromptorRuns, useDeletePromptorRuns, useClearPromptorRuns, type PromptorRun } from '@/hooks/usePromptor';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  social_image: 'Social Image',
  social_copy: 'Social Copy',
  video: 'Video',
};

const COMPLIANCE_CONFIG = {
  pass: {
    icon: CheckCircle2,
    label: 'Compliant',
    className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  adjusted: {
    icon: AlertTriangle,
    label: 'Adjusted',
    className: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  refused: {
    icon: XCircle,
    label: 'Refused',
    className: 'text-rose-600 bg-rose-50 border-rose-200',
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

interface RunCardProps {
  run: PromptorRun;
  selected: boolean;
  onToggle: (id: string) => void;
  onDeleteSingle: (id: string) => void;
}

function RunCard({ run, selected, onToggle, onDeleteSingle }: RunCardProps) {
  const [open, setOpen] = useState(false);
  const compliance = COMPLIANCE_CONFIG[run.compliance_status as keyof typeof COMPLIANCE_CONFIG] || COMPLIANCE_CONFIG.pass;
  const ComplianceIcon = compliance.icon;

  return (
    <Card className={cn(
      'shadow-none transition-all duration-200 overflow-hidden',
      selected
        ? 'border-violet-300 bg-violet-50/20'
        : open
          ? 'border-violet-200 shadow-sm'
          : 'border-border hover:border-violet-200 hover:shadow-sm'
    )}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-3 px-4 cursor-pointer select-none">
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div
                className="shrink-0 mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggle(run.id)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto mb-1.5 flex-nowrap scrollbar-none">
                  <Badge
                    variant="outline"
                    className="text-xs font-medium text-violet-600 border-violet-200 bg-violet-50 shrink-0"
                  >
                    {OUTPUT_TYPE_LABELS[run.output_type] || run.output_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize text-muted-foreground border-border shrink-0">
                    {run.mode}
                  </Badge>
                  <div className={cn('flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 shrink-0', compliance.className)}>
                    <ComplianceIcon className="h-3 w-3" />
                    <span>{compliance.label}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground truncate">{run.brief_summary || run.raw_request}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}</span>
                  {run.llm_model && <><span>·</span><span>{run.llm_model}</span></>}
                </div>
              </div>
              <div className="shrink-0 text-muted-foreground mt-0.5">
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-3 border-t border-border bg-violet-50/30 space-y-4">
            {run.final_prompt_full && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-violet-500" />
                    <p className="text-xs font-medium text-foreground">Full Prompt</p>
                  </div>
                  <CopyButton text={run.final_prompt_full} />
                </div>
                <p className="text-sm font-mono bg-background rounded-lg p-3 whitespace-pre-wrap break-words text-foreground border border-border leading-relaxed">
                  {run.final_prompt_full}
                </p>
              </div>
            )}
            {run.final_prompt_short && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-violet-400" />
                    <p className="text-xs font-medium text-foreground">Short Prompt</p>
                  </div>
                  <CopyButton text={run.final_prompt_short} />
                </div>
                <p className="text-sm font-mono bg-background rounded-lg p-3 whitespace-pre-wrap break-words text-foreground border border-border leading-relaxed">
                  {run.final_prompt_short}
                </p>
              </div>
            )}
            {run.variants && run.variants.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-violet-300" />
                  <p className="text-xs font-medium text-foreground">
                    {run.variants.length} Variant{run.variants.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="space-y-2">
                  {run.variants.map((v: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <p className="text-xs font-mono bg-background rounded-lg p-2 flex-1 break-words text-foreground border border-border">
                        {v}
                      </p>
                      <CopyButton text={v} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {run.compliance_notes && (
              <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                {run.compliance_notes}
              </p>
            )}
            {/* Single delete button */}
            <div className="flex justify-end border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
                onClick={() => onDeleteSingle(run.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete run
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

type DeleteTarget = { type: 'selected' | 'clear' | 'single'; ids: string[] } | null;

export function PromptorHistory() {
  const { data: runs, isLoading } = usePromptorRuns();
  const deleteRuns = useDeletePromptorRuns();
  const clearRuns = useClearPromptorRuns();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const hasActiveFilters = search !== '' || filterType !== 'all' || filterStatus !== 'all';

  const filtered = useMemo(() => (runs || []).filter((run) => {
    const matchesSearch =
      !search ||
      run.brief_summary?.toLowerCase().includes(search.toLowerCase()) ||
      run.raw_request.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || run.output_type === filterType;
    const matchesStatus = filterStatus === 'all' || run.compliance_status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  }), [runs, search, filterType, filterStatus]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filtered.map((r) => r.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterStatus('all');
  };

  const isPending = deleteRuns.isPending || clearRuns.isPending;

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'clear') {
        await clearRuns.mutateAsync();
      } else {
        await deleteRuns.mutateAsync(deleteTarget.ids);
      }
      // Remove deleted ids from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteTarget.ids.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const deleteDialogMessage = (() => {
    if (!deleteTarget) return '';
    if (deleteTarget.type === 'clear') return `This will permanently delete all ${runs?.length ?? 0} runs. This cannot be undone.`;
    if (deleteTarget.type === 'single') return 'This will permanently delete this run. This cannot be undone.';
    return `This will permanently delete ${deleteTarget.ids.length} selected run${deleteTarget.ids.length > 1 ? 's' : ''}. This cannot be undone.`;
  })();

  return (
    <div className="space-y-4">
      {/* Filters toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search runs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-border bg-muted/40 focus-visible:border-violet-400 focus-visible:ring-violet-100"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full min-w-0 flex-1 border-border bg-muted/40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="social_image">Social Image</SelectItem>
              <SelectItem value="social_copy">Social Copy</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full min-w-0 flex-1 border-border bg-muted/40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pass">Compliant</SelectItem>
              <SelectItem value="adjusted">Adjusted</SelectItem>
              <SelectItem value="refused">Refused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action / count bar */}
      {!isLoading && (runs?.length ?? 0) > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
          {selectedIds.size > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{selectedIds.size} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={deselectAll}
                >
                  Deselect all
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => setDeleteTarget({ type: 'selected', ids: Array.from(selectedIds) })}
              >
                <Trash2 className="h-3 w-3" />
                Delete selected
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={() => allFilteredSelected ? deselectAll() : selectAllFiltered()}
                    className="mr-1"
                  />
                </div>
                <span>
                  {filtered.length} run{filtered.length !== 1 ? 's' : ''}
                  {hasActiveFilters && runs?.length !== filtered.length && (
                    <span className="ml-1 text-muted-foreground/60">of {runs?.length}</span>
                  )}
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3" />
                    Clear filters
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => setDeleteTarget({ type: 'clear', ids: (runs || []).map((r) => r.id) })}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            </>
          )}
        </div>
      )}

      {/* Runs list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <History className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {runs?.length === 0 ? 'No runs yet' : 'No matching runs'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {runs?.length === 0
                ? 'Create your first prompt to see history here.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              selected={selectedIds.has(run.id)}
              onToggle={toggleOne}
              onDeleteSingle={(id) => setDeleteTarget({ type: 'single', ids: [id] })}
            />
          ))}
        </div>
      )}

      {/* Shared confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'clear' ? 'all' : ''} run{deleteTarget?.type === 'single' ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
