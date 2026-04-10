"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Lock, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { PixelTopBar, type PixelMode } from '@/components/pixel/PixelTopBar';
import { PixelStudio } from '@/components/pixel/PixelStudio';
import { extractTextFromFile, ACCEPTED_FILE_TYPES } from '@/lib/fileProcessing';
import { PixelControlPanel, type PostSize } from '@/components/pixel/PixelControlPanel';
import { PixelContextPanel } from '@/components/pixel/PixelContextPanel';
import { PixelBlueprintPanel } from '@/components/pixel/PixelBlueprintPanel';
import { PixelSettings } from '@/components/pixel/PixelSettings';
import { usePixelSettings, usePixelMessages, DEFAULT_PIXEL_SETTINGS, type PixelBlueprint } from '@/hooks/usePixel';
import { useAgentSettings } from '@/hooks/useAgentSettings';
import type { PendingAttachment } from '@/types/attachments';
import { toast } from 'sonner';

export default function PixelAgent() {
  const router = useRouter();
  const [mode, setMode] = useState<PixelMode>('facebook');
  const [activeBlueprint, setActiveBlueprint] = useState<PixelBlueprint | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blueprintsOpen, setBlueprintsOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [globalReferences, setGlobalReferences] = useState<PendingAttachment[]>([]);
  const [lastAudit, setLastAudit] = useState<{ heartCount: number; brainCount: number; complianceStatus: string } | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<PostSize | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileControlOpen, setMobileControlOpen] = useState(false);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const globalRefInputRef = useRef<HTMLInputElement>(null);
  const toggleFullscreen = useCallback(() => setIsFullscreen(f => !f), []);
  const isMobile = useIsMobile();

  const { data: settings = DEFAULT_PIXEL_SETTINGS, isLoading: loadingSettings } = usePixelSettings();
  const { data: agentSettings, isLoading: loadingAgentSettings } = useAgentSettings('pixel');
  const { data: messages = [], isLoading: isLoadingMessages, refetch } = usePixelMessages();

  const isInactive = !loadingAgentSettings && agentSettings && !agentSettings.is_active;

  const handleModeChange = (newMode: PixelMode) => {
    setMode(newMode);
    setSelectedPostType(null);
    setSelectedSize(null);
  };

  const handlePostTypeSelect = (id: string) => {
    setSelectedPostType(id);
    setSelectedSize(null);
  };

  const handleStarterPrompt = (prompt: string) => {
    starterPromptRef.current = prompt;
    setStarterTrigger(t => t + 1);
  };

  const handleGlobalRefSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) { toast.error(`${file.name}: unsupported file type`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: exceeds 10MB limit`); continue; }
      newAttachments.push({ id: crypto.randomUUID(), file, name: file.name, type: file.type, status: 'processing' });
    }
    setGlobalReferences(prev => {
      const updated = [...prev, ...newAttachments];
      // Process each new attachment
      for (const att of newAttachments) {
        extractTextFromFile(att.file).then(result => {
          setGlobalReferences(curr => curr.map(a => a.id === att.id ? { ...a, status: 'ready' as const, extractedContent: result.text, isImage: result.isImage, base64: result.base64 } : a));
        }).catch((e: any) => {
          setGlobalReferences(curr => curr.map(a => a.id === att.id ? { ...a, status: 'error' as const, errorMessage: e.message } : a));
        });
      }
      return updated;
    });
    // Reset input so same file can be re-selected
    if (globalRefInputRef.current) globalRefInputRef.current.value = '';
  }, []);

  const handleRemoveGlobalRef = useCallback((id: string) => {
    setGlobalReferences(prev => prev.filter(a => a.id !== id));
  }, []);

  const starterPromptRef = useRef<string>('');
  const [starterTrigger, setStarterTrigger] = useState(0);

  return (
    <div className={cn(
      'flex flex-col relative overflow-hidden border border-border',
      isFullscreen
        ? 'fixed inset-0 z-50 bg-background rounded-none'
        : 'h-[calc(100vh-80px)] rounded-xl'
    )}>
      {/* Hidden file input for global references */}
      <input
        ref={globalRefInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="hidden"
        onChange={e => handleGlobalRefSelect(e.target.files)}
      />

      <PixelTopBar
        mode={mode}
        onModeChange={handleModeChange}
        onOpenSettings={() => setSettingsOpen(true)}
        isConnected={!isInactive}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex flex-1 min-h-0">
        <div className="hidden md:flex">
          <PixelControlPanel
            mode={mode}
            activeBlueprint={activeBlueprint}
            onBlueprintSelect={setActiveBlueprint}
            selectedPostType={selectedPostType}
            onPostTypeSelect={handlePostTypeSelect}
            onAttachFile={() => globalRefInputRef.current?.click()}
            onNewBlueprint={() => setBlueprintsOpen(true)}
            isPending={false}
            globalReferences={globalReferences}
            onRemoveReference={handleRemoveGlobalRef}
          />
        </div>

        <PixelStudio
          messages={messages}
          settings={settings}
          isLoadingMessages={isLoadingMessages}
          onMessagesChange={() => refetch()}
          activeBlueprint={activeBlueprint}
          onBlueprintSelect={setActiveBlueprint}
          mode={mode}
          styleLock={false}
          fileInputRef={fileInputRef}
          pendingAttachments={pendingAttachments}
          onAttachmentsChange={setPendingAttachments}
          onAuditUpdate={setLastAudit}
          onSendStarterPrompt={handleStarterPrompt}
          _starterPrompt={starterPromptRef.current}
          _starterTrigger={starterTrigger}
          selectedPostType={selectedPostType}
          selectedSize={selectedSize}
          globalReferences={globalReferences}
        />

        <div className="hidden lg:flex">
          <PixelContextPanel
            selectedPostType={selectedPostType}
            selectedSize={selectedSize}
            onSizeSelect={setSelectedSize}
            mode={mode}
            lastAudit={lastAudit}
          />
        </div>
      </div>

      {/* Mobile floating action buttons for hidden panels */}
      {!isInactive && isMobile && (
        <div className="absolute bottom-5 left-3 flex gap-2 z-10 md:hidden">
          <button
            onClick={() => setMobileControlOpen(true)}
            className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-foreground shadow-lg active:scale-95 transition-transform"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMobileContextOpen(true)}
            className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center text-foreground shadow-lg active:scale-95 transition-transform lg:hidden"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mobile Control Panel Sheet */}
      <Sheet open={mobileControlOpen} onOpenChange={setMobileControlOpen}>
        <SheetContent side="left" className="w-[300px] p-0 bg-background border-border">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-foreground text-sm">Controls</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            <PixelControlPanel
              mode={mode}
              activeBlueprint={activeBlueprint}
              onBlueprintSelect={setActiveBlueprint}
              selectedPostType={selectedPostType}
              onPostTypeSelect={(id) => { handlePostTypeSelect(id); setMobileControlOpen(false); }}
              onAttachFile={() => globalRefInputRef.current?.click()}
              onNewBlueprint={() => { setBlueprintsOpen(true); setMobileControlOpen(false); }}
              isPending={false}
              globalReferences={globalReferences}
              onRemoveReference={handleRemoveGlobalRef}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Context Panel Sheet */}
      <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
        <SheetContent side="right" className="w-[300px] p-0 bg-background border-border">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-foreground text-sm">Context & Sizes</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100%-60px)]">
            <PixelContextPanel
              selectedPostType={selectedPostType}
              selectedSize={selectedSize}
              onSizeSelect={(size) => { setSelectedSize(size); setMobileContextOpen(false); }}
              mode={mode}
              lastAudit={lastAudit}
            />
          </div>
        </SheetContent>
      </Sheet>

      {isInactive && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4 z-10">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1 text-foreground">Pixel is Inactive</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Pixel has been deactivated. Enable it in the Nexus Control Center.
            </p>
          </div>
          <Button
            onClick={() => router.push('/ai-agents/nexus?tab=agents')}
            className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white border-0"
          >
            <Palette className="h-4 w-4 mr-2" />
            Go to Nexus
          </Button>
        </div>
      )}

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-pink-500" />
              Pixel Settings
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {!loadingSettings && <PixelSettings settings={settings} />}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={blueprintsOpen} onOpenChange={setBlueprintsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-pink-500" />
              Visual Templates
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <PixelBlueprintPanel
              onApply={(bp) => {
                setActiveBlueprint(bp);
                setBlueprintsOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
