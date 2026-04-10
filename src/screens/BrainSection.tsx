"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { 
  BrainCircuit, 
  ChevronLeft,
  Database,
  Loader2,
  Plus,
  Search,
  FileText,
  BookOpen,
  Settings,
  Download,
  Building2,
  Package,
  Users,
  Settings2,
  MessageSquare,
  ShieldAlert,
  Scale,
  Sparkles,
  Zap,
  Target,
  Lightbulb,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentGrid, UploadDocumentDialog, EditDocumentDialog } from '@/components/brain';
import { useBrainSectionByAgent } from '@/hooks/useBrainSections';
import { useBrainDocumentsForAgent, useDeleteBrainDocument, useReorderBrainDocuments, getBrainDocumentUrl } from '@/hooks/useBrainDocuments';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { getAgentById } from '@/data/agents';
import { type BrainDocument } from '@/types/brain';
import { useAuth } from '@/contexts/AuthContext';
import { getSecureFileUrl } from '@/hooks/useFiles';
import { getFileIcon, formatFileSize, getFileTypeLabel } from '@/lib/fileTypes';
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

// Icon mapping for dynamic categories
const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Package, Users, Settings2, MessageSquare, ShieldAlert, FileText, Scale, Sparkles, Zap, Target, Lightbulb
};

// Color mapping for category tabs
const COLOR_MAP: Record<string, string> = {
  indigo: 'text-indigo-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  red: 'text-red-600',
  cyan: 'text-cyan-600',
  emerald: 'text-emerald-600',
  violet: 'text-violet-600',
};

function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}

// Helper to check if file type is a "document" that should open in new window
function isDocumentType(mimeType: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  return (
    lowerMime === 'text/csv' ||
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('excel') ||
    lowerMime.includes('msword') ||
    lowerMime.includes('word') ||
    lowerMime.includes('document') ||
    lowerMime.includes('powerpoint') ||
    lowerMime.includes('presentation') ||
    lowerMime === 'text/plain' ||
    lowerMime === 'application/json' ||
    lowerMime === 'text/xml' ||
    lowerMime === 'text/markdown' ||
    lowerMime.includes('zip') ||
    lowerMime.includes('rar') ||
    lowerMime.includes('tar') ||
    lowerMime.includes('gzip')
  );
}

// Helper to render preview content based on mime type
function renderPreviewContent(
  doc: BrainDocument, 
  publicUrl: string, 
  secureUrl: string | null
) {
  const mimeType = doc.mime_type;

  if (mimeType.startsWith('image/')) {
    return (
      <Image
        src={secureUrl || publicUrl}
        alt={doc.name}
        width={800}
        height={600}
        className="max-w-full max-h-full object-contain"
        unoptimized
      />
    );
  }

  if (mimeType.includes('pdf')) {
    // Use secure URL for PDF if available
    const pdfUrl = secureUrl || publicUrl;
    return (
      <iframe
        src={pdfUrl}
        title={doc.name}
        className="w-full h-full border-0"
      />
    );
  }

  if (mimeType.startsWith('video/')) {
    return (
      <video 
        src={publicUrl} 
        controls 
        className="max-w-full max-h-full"
      >
        Your browser does not support video playback.
      </video>
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-muted-foreground/50" />
        <p className="text-muted-foreground font-medium">{doc.name}</p>
        <audio src={publicUrl} controls className="w-full max-w-md">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Document types (spreadsheets, Word, PowerPoint, text files, archives) - show metadata card
  if (isDocumentType(mimeType)) {
    const fileIconData = getFileIcon(mimeType, doc.name);
    const FileIcon = fileIconData.icon;
    const typeLabel = getFileTypeLabel(mimeType, doc.name);
    const fileSize = formatFileSize(doc.size);
    const previewUrl = secureUrl || publicUrl;

    return (
      <div className="flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${fileIconData.bg} flex items-center justify-center`}>
          <FileIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${fileIconData.color}`} />
        </div>
        <div className="text-center">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">{doc.name}</h3>
          <p className="text-sm text-muted-foreground">{fileSize} • {typeLabel}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={() => window.open(previewUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Preview in New Window
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = previewUrl;
              link.download = doc.name;
              link.click();
            }}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  // Fallback for unsupported types
  const fallbackIconData = getFileIcon(mimeType, doc.name);
  const FallbackIcon = fallbackIconData.icon;
  const fallbackUrl = secureUrl || publicUrl;

  return (
      <div className="flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${fallbackIconData.bg} flex items-center justify-center`}>
          <FallbackIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${fallbackIconData.color}`} />
        </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">{doc.name}</h3>
        <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
      </div>
      <Button
        onClick={() => window.open(fallbackUrl, '_blank')}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Download File
      </Button>
    </div>
  );
}

export default function BrainSection() {
  const router = useRouter();
  const { sectionType } = useParams<{ sectionType: string }>();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<BrainDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<BrainDocument | null>(null);
  const [editDoc, setEditDoc] = useState<BrainDocument | null>(null);

  const isGeneral = sectionType === 'general';
  const agent = !isGeneral ? getAgentById(sectionType || '') : null;

  const { data: section, isLoading: sectionLoading } = useBrainSectionByAgent(sectionType || null);
  // Use the new agent-aware hook that includes restricted documents
  const { data: documents, isLoading: docsLoading } = useBrainDocumentsForAgent(sectionType || null);
  const { data: brainCategories } = useBrainCategories();
  const deleteMutation = useDeleteBrainDocument();
  const reorderMutation = useReorderBrainDocuments();

  // Search match helper
  const matchesSearch = (doc: BrainDocument) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.description?.toLowerCase().includes(q) ||
      doc.original_name?.toLowerCase().includes(q)
    );
  };

  // Filter documents by category and search
  const filteredDocs = (documents || []).filter(doc => {
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    return matchesCategory && matchesSearch(doc);
  });

  // Count documents per category (search-aware)
  const searchedDocs = (documents || []).filter(matchesSearch);
  const categoryCounts = (brainCategories || []).reduce((acc, cat) => {
    acc[cat.id] = searchedDocs.filter(d => d.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  // Disable DnD when filtered or searching to prevent sort_order collisions
  const isDndDisabled = activeCategory !== 'all' || searchQuery.length > 0;

  const handleViewDocument = (doc: BrainDocument) => {
    setPreviewDoc(doc);
  };

  const handleEditDocument = (doc: BrainDocument) => {
    setEditDoc(doc);
  };

  const handleDeleteDocument = async () => {
    if (!deleteDoc) return;
    await deleteMutation.mutateAsync({ 
      id: deleteDoc.id, 
      storagePath: deleteDoc.storage_path 
    });
    setDeleteDoc(null);
  };

  const handleReorder = (reorderedDocs: BrainDocument[]) => {
    // Calculate new sort_order values based on new positions
    const updates = reorderedDocs.map((doc, index) => ({
      id: doc.id,
      sort_order: index + 1,
    }));
    reorderMutation.mutate(updates);
  };

  // Get section title and icon
  const sectionTitle = isGeneral ? 'General Knowledge' : `${agent?.name} Knowledge`;
  const sectionDescription = isGeneral 
    ? 'Shared knowledge accessible to all AI agents. Organize by category.'
    : `Specialized knowledge for the ${agent?.name} AI agent.`;
  const SectionIcon = isGeneral ? BookOpen : agent?.icon || BrainCircuit;
  const sectionGradient = isGeneral ? 'from-indigo-500 to-indigo-600' : agent?.color || 'from-gray-500 to-gray-600';

  // Get preview URLs for the document
  const publicPreviewUrl = previewDoc ? getBrainDocumentUrl(previewDoc.storage_path) : '';
  const securePreviewUrl = previewDoc && session?.access_token 
    ? getSecureFileUrl('brain-documents', previewDoc.storage_path, previewDoc.name, session.access_token) 
    : null;

  // Show loading spinner while data is fetching
  if (sectionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">Section not found</h2>
          <Button onClick={() => router.push('/mastermind/brain')}>Back to Brain</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/mastermind/brain')}
              className="gap-2 text-muted-foreground hover:text-foreground -ml-2 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Brain</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${sectionGradient} flex items-center justify-center shadow-sm shrink-0`}>
                <SectionIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-semibold text-foreground truncate">{sectionTitle}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block line-clamp-1">{sectionDescription}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => setUploadOpen(true)}
              className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-sm"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Document</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/mastermind/vector-store')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] hover:bg-emerald-50 hover:border-emerald-200"
                  >
                    <Database className="w-4 h-4 text-emerald-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>RAG Knowledge Base</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push('/settings?tab=mastermind')}
                    className="h-8 w-8 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px]"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>MasterMind Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Category Tabs - ToggleGroup style like HeartRules */}
        <div className="px-4 sm:px-6 py-3 border-b border-border/50 bg-muted/50/50 overflow-x-auto scrollbar-hide">
          <ToggleGroup
            type="single"
            value={activeCategory}
            onValueChange={(value) => value && setActiveCategory(value)}
            className="justify-start gap-2 min-w-max"
          >
            <ToggleGroupItem
              value="all"
              className={`px-3 sm:px-4 py-2 h-8 sm:h-9 rounded-full text-xs sm:text-sm font-medium transition-all gap-1.5 sm:gap-2 ${
                activeCategory === 'all'
                  ? 'bg-card shadow-sm border border-border text-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-card/50'
              }`}
            >
              All
              <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
                {searchedDocs.length}
              </Badge>
            </ToggleGroupItem>
            
            {(brainCategories || []).map((cat) => {
              const Icon = getIconComponent(cat.icon);
              const isActive = activeCategory === cat.id;
              const color = COLOR_MAP[cat.color] || 'text-muted-foreground';
              const count = categoryCounts[cat.id] || 0;
              
              return (
                <TooltipProvider key={cat.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={cat.id}
                        className={`px-3 sm:px-4 py-2 h-8 sm:h-9 rounded-full text-xs sm:text-sm font-medium transition-all gap-1.5 sm:gap-2 whitespace-nowrap ${
                          isActive
                            ? 'bg-card shadow-sm border border-border text-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-card/50'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? color : ''}`} />
                        <span className="text-xs sm:text-sm">{cat.name}</span>
                        <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
                          {count}
                        </Badge>
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">{cat.name}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </ToggleGroup>
        </div>

        {/* Document Grid */}
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-6">
            <DocumentGrid
              documents={filteredDocs}
              isLoading={docsLoading}
              onViewDocument={handleViewDocument}
              onEditDocument={handleEditDocument}
              onDeleteDocument={(doc) => setDeleteDoc(doc)}
              onReorder={isDndDisabled ? undefined : handleReorder}
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              categoryName={(brainCategories || []).find(c => c.id === activeCategory)?.name}
            />
          </div>
        </ScrollArea>
      </div>

      {/* Upload Dialog */}
      {section && (
        <UploadDocumentDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          sectionId={section.id}
          defaultCategory={activeCategory !== 'all' ? activeCategory : (brainCategories?.[0]?.id || 'brand')}
          agentId={sectionType}
        />
      )}

      {/* Edit Dialog */}
      <EditDocumentDialog
        open={!!editDoc}
        onOpenChange={() => setEditDoc(null)}
        document={editDoc}
      />

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="w-full sm:w-[80vw] max-w-full sm:max-w-[80vw] h-[90vh] sm:h-[80vh] max-h-[90vh] sm:max-h-[80vh] p-0 overflow-hidden bg-card/95 backdrop-blur-sm flex flex-col">
          <DialogHeader className="p-3 sm:p-4 border-b shrink-0">
            <DialogTitle className="text-center text-sm sm:text-base truncate px-2">{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 sm:p-4 flex-1 overflow-auto bg-muted/50">
            {previewDoc && renderPreviewContent(previewDoc, publicPreviewUrl, securePreviewUrl)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDocument();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
