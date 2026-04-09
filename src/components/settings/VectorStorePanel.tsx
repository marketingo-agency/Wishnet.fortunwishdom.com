"use client";

/**
 * Vector Store Panel
 * 
 * Displays statistics and management interface for the knowledge embeddings
 * stored in the vector database.
 */

import { useState } from 'react';
import { useBulkWishpediaIndex, useUnindexedEntryCount } from '@/hooks/useBulkWishpediaIndex';
import { 
  Database, 
  FileText, 
  Heart, 
  RefreshCw, 
  Trash2,
  Loader2,
  BrainCircuit,
  ArrowRight,
  Globe,
  Users,
  BookOpen,
} from 'lucide-react';
import { getFileTypeLabel, getFileIcon } from '@/lib/fileTypes';

/**
 * Get badge styling based on MIME type
 */
function getTypeBadgeStyles(mimeType: string | null): string {
  if (!mimeType) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  
  const lowerMime = mimeType.toLowerCase();
  
  // Spreadsheets - green
  if (lowerMime === 'text/csv' || 
      lowerMime.includes('spreadsheet') || 
      lowerMime.includes('excel') ||
      lowerMime.includes('.sheet')) {
    return 'bg-green-50 text-green-700 border-green-200';
  }
  
  // Images - blue
  if (lowerMime.startsWith('image/')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  
  // PDFs - red
  if (lowerMime.includes('pdf')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  
  // Videos - purple
  if (lowerMime.startsWith('video/')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  
  // Audio - blue
  if (lowerMime.startsWith('audio/')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  
  // Default - indigo for other documents
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

/**
 * Format agent names as natural language list: "Muse, Promptor and Osha"
 */
function formatAgentList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  useIndexedItems,
  useVectorStoreStats,
  useDeleteFromVectorStore,
  useReindexItem,
  useBulkDeleteFromVectorStore,
  type IndexedItem,
} from '@/hooks/useVectorStoreManagement';
import { getAgentById } from '@/data/agents';

export function VectorStorePanel() {
  const { data: items, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useIndexedItems();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useVectorStoreStats();
  
  const deleteFromStore = useDeleteFromVectorStore();
  const reindexItem = useReindexItem();
  const bulkDelete = useBulkDeleteFromVectorStore();
  const bulkIndex = useBulkWishpediaIndex();
  const { data: unindexedCount = 0 } = useUnindexedEntryCount();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<IndexedItem | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchItems(), refetchStats()]);
    setIsRefreshing(false);
  };

  const hasError = !!itemsError || !!statsError;

  const toggleSelection = (sourceId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
    } else {
      newSelected.add(sourceId);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items?.map(i => i.source_id) || []));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFromStore.mutateAsync({ sourceId: deleteTarget.source_id });
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    await bulkDelete.mutateAsync({ sourceIds: Array.from(selectedItems) });
    setSelectedItems(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleReindex = async (item: IndexedItem) => {
    await reindexItem.mutateAsync({
      sourceId: item.source_id,
      sourceType: item.source_type,
    });
  };

  const isLoading = itemsLoading || statsLoading;
  const hasItems = items && items.length > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Knowledge Vector Store</CardTitle>
              <CardDescription>Monitor and manage your AI knowledge base embeddings</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error State */}
        {hasError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Failed to load vector store data. Please try refreshing.
            </p>
            {itemsError && <p className="text-xs text-red-500 mt-1">{(itemsError as Error).message}</p>}
            {statsError && <p className="text-xs text-red-500 mt-1">{(statsError as Error).message}</p>}
          </div>
        )}

        {/* Statistics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Chunks"
            value={stats?.total_chunks || 0}
            loading={statsLoading}
            color="emerald"
          />
          <StatCard
            label="Documents Indexed"
            value={stats?.document_count || 0}
            subValue={`${stats?.document_chunks || 0} chunks`}
            loading={statsLoading}
            color="indigo"
          />
          <StatCard
            label="Rules Indexed"
            value={stats?.rule_count || 0}
            subValue={`${stats?.rule_chunks || 0} chunks`}
            loading={statsLoading}
            color="rose"
          />
          <StatCard
            label="Wishpedia Entries"
            value={stats?.entry_count || 0}
            subValue={`${stats?.entry_chunks || 0} chunks`}
            loading={statsLoading}
            color="amber"
          />
        </div>

        {/* Bulk Index Wishpedia */}
        {(unindexedCount > 0 || bulkIndex.isRunning) && (
          <div className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
            {bulkIndex.isRunning ? (
              <div className="flex-1 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    Indexing {bulkIndex.progress}/{bulkIndex.total}
                    {bulkIndex.currentName && (
                      <span className="text-muted-foreground ml-1">— {bulkIndex.currentName}</span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${bulkIndex.total > 0 ? (bulkIndex.progress / bulkIndex.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => bulkIndex.cancel()} className="text-xs h-7 px-2 text-muted-foreground">
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <span className="text-sm text-foreground flex-1">
                  <strong>{unindexedCount}</strong> Wishpedia {unindexedCount === 1 ? 'entry' : 'entries'} not yet indexed
                </span>
                <Button
                  size="sm"
                  onClick={() => bulkIndex.start()}
                  className="gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm"
                >
                  <Database className="w-3.5 h-3.5" />
                  Index All
                </Button>
              </>
            )}
          </div>
        )}


        {!isLoading && !hasItems && !hasError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Content Indexed Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Upload documents to Brain Knowledge, create rules in Heart, or add entries to Wishpedia to build your AI knowledge base.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/mastermind/brain" className="gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  Go to Brain
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/mastermind/heart" className="gap-2">
                  <Heart className="w-4 h-4" />
                  Go to Heart
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/mastermind/wishpedia" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Go to Wishpedia
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Indexed Items Table */}
        {(isLoading || hasItems) && (
          <>
            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={bulkDelete.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={items?.length ? selectedItems.size === items.length : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-14">Agent</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-20 text-center">Chunks</TableHead>
                    <TableHead className="w-28 hidden sm:table-cell">Category</TableHead>
                    <TableHead className="w-32 hidden md:table-cell">Indexed</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    items?.map((item) => {
                      // Determine agent icon and tooltip
                      const agentInfo = item.agent_id ? getAgentById(item.agent_id) : null;
                      const isGlobalRule = item.source_type === 'heart_rule' && item.is_global;
                      
                      // Check for multi-agent access (more than 1 agent and not global)
                      const hasMultiAgentAccess = item.restricted_agents && 
                        item.restricted_agents.length > 1 && 
                        !item.is_global;
                      
                      // Get agent names for multi-agent tooltip
                      const multiAgentNames = hasMultiAgentAccess
                        ? item.restricted_agents!.map(id => getAgentById(id)?.name || id)
                        : [];
                      const multiAgentTooltip = multiAgentNames.length > 0
                        ? `Multi-agent access: ${formatAgentList(multiAgentNames)}`
                        : '';
                      
                      return (
                        <TableRow key={`${item.source_type}-${item.source_id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.source_id)}
                              onCheckedChange={() => toggleSelection(item.source_id)}
                              aria-label={`Select ${item.source_name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center">
                                    {hasMultiAgentAccess ? (
                                      // Multi-agent access icon
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-white" />
                                      </div>
                                    ) : agentInfo ? (
                                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agentInfo.color} flex items-center justify-center`}>
                                        <agentInfo.icon className="w-4 h-4 text-white" />
                                      </div>
                                    ) : isGlobalRule ? (
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {hasMultiAgentAccess 
                                    ? multiAgentTooltip 
                                    : agentInfo 
                                      ? agentInfo.name 
                                      : isGlobalRule 
                                        ? 'All Agents' 
                                        : 'General Knowledge'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {item.source_type === 'brain_document' ? (
                                (() => {
                                  const fileIcon = getFileIcon(item.mime_type || 'application/octet-stream');
                                  const IconComponent = fileIcon.icon;
                                  return <IconComponent className={`w-4 h-4 ${fileIcon.color} shrink-0`} />;
                                })()
                              ) : item.source_type === 'wishpedia_entry' ? (
                                <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                              )}
                              <span className="truncate max-w-[120px] sm:max-w-[200px]" title={item.source_name}>
                                {item.source_name}
                              </span>
                            </div>
                          </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              item.source_type === 'brain_document' 
                                ? getTypeBadgeStyles(item.mime_type)
                                : item.source_type === 'wishpedia_entry'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                            }
                          >
                            {item.source_type === 'brain_document' 
                              ? (item.mime_type ? getFileTypeLabel(item.mime_type) : 'Document')
                              : item.source_type === 'wishpedia_entry'
                                ? 'Wishpedia'
                                : 'Rule'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.chunk_count}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="capitalize">
                            {item.source_category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {formatDistanceToNow(new Date(item.indexed_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px] hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => handleReindex(item)}
                              disabled={reindexItem.isPending}
                              title="Reindex"
                            >
                              <RefreshCw className={`w-4 h-4 ${reindexItem.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px] hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleteTarget(item)}
                              disabled={deleteFromStore.isPending}
                              title="Delete from vector store"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Vector Store?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all embeddings for "{deleteTarget?.source_name}" from the AI knowledge base. 
              The original {deleteTarget?.source_type === 'brain_document' ? 'document' : deleteTarget?.source_type === 'wishpedia_entry' ? 'entry' : 'rule'} will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedItems.size} Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all embeddings for the selected items from the AI knowledge base. 
              The original documents and rules will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove {selectedItems.size} Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  subValue,
  loading, 
  color 
}: { 
  label: string; 
  value: number; 
  subValue?: string;
  loading: boolean;
  color: 'emerald' | 'indigo' | 'rose' | 'amber';
}) {
  const colorClasses = {
    emerald: 'bg-emerald-50 border-emerald-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    rose: 'bg-rose-50 border-rose-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div>
          <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
          {subValue && (
            <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
          )}
        </div>
      )}
    </div>
  );
}
