/**
 * Nexus Console Controller Hook
 * Extracts all state and handlers from NexusConsole.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LLMSettings,
  OPENAI_TEXT_MODELS,
  OPENAI_IMAGE_MODELS,
  OPENAI_DEEP_RESEARCH_MODELS,
  GEMINI_TEXT_MODELS,
  GEMINI_IMAGE_MODELS,
  useAIChat,
  useDeepResearch,
  useStreamingChat,
} from '@/hooks/useLLMSettings';
import { useProviderKeyStatus } from '@/hooks/useProviderKeyStatus';
import { useConsoleMessages, useSaveMessage, useClearMessages, useDeleteSelectedMessages, ConsoleMessage } from '@/hooks/useConsoleMessages';
import { useUploadFile, useDeleteFile } from '@/hooks/files/useFilesCore';
import { useSectors, useCreateSector } from '@/hooks/files/useSectors';
import { getFileUrl } from '@/hooks/files/fileUrls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseNexusConsoleControllerParams {
  settings: LLMSettings | null;
  initialPrompt?: string;
  initialMode?: 'text' | 'image' | 'research';
}

export function useNexusConsoleController({ settings, initialPrompt, initialMode }: UseNexusConsoleControllerParams) {
  // ── DB queries ─────────────────────────────────────────────────────────
  const { data: savedMessages = [], isLoading: messagesLoading } = useConsoleMessages();
  const { mutate: saveMessage } = useSaveMessage();
  const { mutate: clearSavedMessages } = useClearMessages();
  const deleteSelectedMessages = useDeleteSelectedMessages();

  // ── State ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [hasInitializedFromDb, setHasInitializedFromDb] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'image' | 'research'>(initialMode || 'text');
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');
  const [model, setModel] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [researchProgress, setResearchProgress] = useState<string | null>(null);
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Refs ───────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Mutations ──────────────────────────────────────────────────────────
  const { mutate: sendMessage, isPending } = useAIChat();
  const { mutate: startDeepResearch, isPending: isResearching } = useDeepResearch();
  const { streamChat } = useStreamingChat();
  const [isStreaming, setIsStreaming] = useState(false);
  const uploadFile = useUploadFile();
  const { data: sectors = [] } = useSectors();
  const createSector = useCreateSector();
  const deleteFile = useDeleteFile();

  // ── Derived ────────────────────────────────────────────────────────────
  const { data: keyStatus } = useProviderKeyStatus();
  const availableProviders = [
    keyStatus?.openai && 'openai',
    keyStatus?.gemini && 'gemini',
  ].filter(Boolean) as ('openai' | 'gemini')[];

  const currentModels = (() => {
    if (mode === 'research') return provider === 'openai' ? OPENAI_DEEP_RESEARCH_MODELS : [];
    return provider === 'openai'
      ? (mode === 'text' ? OPENAI_TEXT_MODELS : OPENAI_IMAGE_MODELS)
      : (mode === 'text' ? GEMINI_TEXT_MODELS : GEMINI_IMAGE_MODELS);
  })();

  const isDisabled = availableProviders.length === 0;

  // ── Effects ────────────────────────────────────────────────────────────

  // Init from DB
  useEffect(() => {
    if (!messagesLoading && savedMessages.length > 0 && !hasInitializedFromDb) {
      setMessages(savedMessages);
      setHasInitializedFromDb(true);
    } else if (!messagesLoading && savedMessages.length === 0 && !hasInitializedFromDb) {
      setHasInitializedFromDb(true);
    }
  }, [savedMessages, messagesLoading, hasInitializedFromDb]);

  // Provider init from settings
  useEffect(() => {
    if (!settings || !keyStatus) return;
    if (mode === 'research') {
      if (keyStatus.openai) {
        setProvider('openai');
        if (OPENAI_DEEP_RESEARCH_MODELS.length > 0) setModel(OPENAI_DEEP_RESEARCH_MODELS[0].value);
      }
      return;
    }
    if (mode === 'text' && settings.active_text_provider) {
      const tp = settings.active_text_provider;
      if ((tp === 'openai' && keyStatus.openai) || (tp === 'gemini' && keyStatus.gemini)) setProvider(tp);
    } else if (mode === 'image' && settings.active_image_provider) {
      const tp = settings.active_image_provider;
      if ((tp === 'openai' && keyStatus.openai) || (tp === 'gemini' && keyStatus.gemini)) setProvider(tp);
    }
  }, [settings, mode, keyStatus]);

  // Model init
  useEffect(() => {
    if (settings && currentModels.length > 0) {
      if (mode === 'research') { setModel(currentModels[0].value); return; }
      let savedModel: string | undefined;
      if (provider === 'openai') savedModel = mode === 'text' ? settings.openai_text_model : settings.openai_image_model;
      else savedModel = mode === 'text' ? settings.gemini_text_model : settings.gemini_image_model;
      const exists = currentModels.some(m => m.value === savedModel);
      setModel(exists && savedModel ? savedModel : currentModels[0].value);
    } else if (currentModels.length > 0) {
      setModel(currentModels[0].value);
    }
  }, [provider, mode, settings, currentModels]);

  // Initial prompt
  useEffect(() => {
    if (initialPrompt) setInput(initialPrompt);
    if (initialMode) setMode(initialMode);
  }, [initialPrompt, initialMode]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!input.trim() || isPending || isResearching || isStreaming || availableProviders.length === 0) return;

    const userMessage: ConsoleMessage = {
      id: Date.now().toString(), role: 'user', content: input,
      timestamp: new Date(), provider, model, mode,
    };
    setMessages(prev => [...prev, userMessage]);
    saveMessage({ role: 'user', content: input, provider, model, mode });
    const currentInput = input;
    setInput('');

    if (mode === 'research') {
      startDeepResearch(
        { message: currentInput, model, onProgress: (status) => setResearchProgress(status) },
        {
          onSuccess: (data) => {
            setResearchProgress(null);
            const msg: ConsoleMessage = {
              id: (Date.now() + 1).toString(), role: 'assistant', content: data.content,
              timestamp: new Date(), provider, model, mode,
            };
            setMessages(prev => [...prev, msg]);
            saveMessage({ role: 'assistant', content: data.content, provider, model, mode });
          },
          onError: (error) => {
            setResearchProgress(null);
            const msg: ConsoleMessage = {
              id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${error.message}`,
              timestamp: new Date(), provider, model, mode,
            };
            setMessages(prev => [...prev, msg]);
            saveMessage({ role: 'assistant', content: `Error: ${error.message}`, provider, model, mode });
          },
        }
      );
      return;
    }

    const conversationHistory = mode === 'text'
      ? messages.filter(m => !m.isImage && m.mode !== 'image' && m.mode !== 'research')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : undefined;

    // AGENT-005: use SSE streaming for text chat with OpenAI
    if (mode === 'text' && provider === 'openai') {
      const streamMsgId = (Date.now() + 1).toString();
      // Add empty assistant message that will be filled progressively
      const streamMsg: ConsoleMessage = {
        id: streamMsgId, role: 'assistant', content: '',
        timestamp: new Date(), provider, model, mode,
      };
      setMessages(prev => [...prev, streamMsg]);
      setIsStreaming(true);

      streamChat({
        message: currentInput, provider, model, mode,
        temperature: temperature[0],
        systemPrompt,
        conversationHistory,
        onChunk: (chunk) => {
          setMessages(prev => prev.map(m =>
            m.id === streamMsgId ? { ...m, content: m.content + chunk } : m
          ));
        },
        onDone: (fullText) => {
          setIsStreaming(false);
          saveMessage({ role: 'assistant', content: fullText, provider, model, mode });
        },
        onError: (error) => {
          setIsStreaming(false);
          setMessages(prev => prev.map(m =>
            m.id === streamMsgId ? { ...m, content: `Error: ${error.message}` } : m
          ));
          saveMessage({ role: 'assistant', content: `Error: ${error.message}`, provider, model, mode });
        },
      });
      return;
    }

    // Non-streaming path (image, video, Gemini text)
    sendMessage(
      {
        message: currentInput, provider, model, mode: mode as 'text' | 'image',
        temperature: temperature[0],
        systemPrompt: mode !== 'image' ? systemPrompt : undefined,
        isDeepResearch: false, conversationHistory,
      },
      {
        onSuccess: async (data) => {
          const isImage = mode === 'image' && !!(data.imageUrl || data.content?.startsWith('data:image'));
          let permanentImageUrl = isImage ? (data.imageUrl || data.content) : undefined;

          if (isImage && permanentImageUrl) {
            try {
              const response = await fetch(permanentImageUrl);
              const blob = await response.blob();
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
              const file = new File([blob], `nexus-image-${timestamp}.png`, { type: blob.type || 'image/png' });
              let nexusSector = sectors.find(s => s.name === 'Nexus AI');
              if (!nexusSector) nexusSector = await createSector.mutateAsync({ name: 'Nexus AI', color: '#84cc16' });
              const uploadedRecord = await uploadFile.mutateAsync({ file, sectorId: nexusSector.id });
              permanentImageUrl = getFileUrl(uploadedRecord.storage_path);
            } catch (err) {
              console.warn('Failed to auto-save generated image:', err);
              toast.warning('Image generated but could not be saved to Files Manager');
            }
          }

          const assistantMessage: ConsoleMessage = {
            id: (Date.now() + 1).toString(), role: 'assistant',
            content: isImage ? 'Image generated successfully!' : data.content,
            timestamp: new Date(), isImage, imageUrl: permanentImageUrl, provider, model, mode,
          };
          setMessages(prev => [...prev, assistantMessage]);
          saveMessage({
            role: 'assistant', content: isImage ? 'Image generated successfully!' : data.content,
            isImage, imageUrl: permanentImageUrl, provider, model, mode,
          });
        },
        onError: (error) => {
          const msg: ConsoleMessage = {
            id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${error.message}`,
            timestamp: new Date(), provider, model, mode,
          };
          setMessages(prev => [...prev, msg]);
          saveMessage({ role: 'assistant', content: `Error: ${error.message}`, provider, model, mode });
        },
      }
    );
  }, [input, isPending, isResearching, isStreaming, availableProviders, provider, model, mode, messages, sendMessage, saveMessage, startDeepResearch, streamChat, temperature, systemPrompt, sectors, createSector, uploadFile]);

  const handleCopy = useCallback(async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    clearSavedMessages();
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [clearSavedMessages]);

  const toggleMessageSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    deleteSelectedMessages.mutate(idsArray, {
      onSuccess: () => {
        setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setSelectionMode(false);
        toast.success(`${idsArray.length} message(s) deleted`);
      },
      onError: (err: any) => { toast.error('Failed to delete messages: ' + err.message); },
    });
  }, [selectedIds, deleteSelectedMessages]);

  const handleDeleteImage = useCallback(async (message: ConsoleMessage) => {
    if (!message.imageUrl) return;
    setSavingImageId(message.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: files } = await supabase
        .from('files').select('id, storage_path').eq('user_id', user.id)
        .ilike('name', 'nexus-image-%').order('created_at', { ascending: false }).limit(50);
      const matchingFile = files?.find(f => getFileUrl(f.storage_path) === message.imageUrl);
      if (matchingFile) await deleteFile.mutateAsync({ id: matchingFile.id, storagePath: matchingFile.storage_path });
      setMessages(prev => prev.map(m =>
        m.id === message.id ? { ...m, isImage: false, imageUrl: undefined, content: 'Image deleted from Files Manager.' } : m
      ));
      toast.success('Image deleted from Files Manager');
    } catch (error: any) {
      toast.error('Failed to delete image: ' + error.message);
    } finally { setSavingImageId(null); }
  }, [deleteFile]);

  // CODE-003: handleRegenerate used document.querySelector('[data-nexus-send]')
  // to imperatively click a button — a fragile anti-pattern that fails silently
  // if the button isn't in the DOM. Instead, set state and let a useEffect
  // trigger the send on the next render cycle.
  const [pendingRegenerate, setPendingRegenerate] = useState(false);

  useEffect(() => {
    if (pendingRegenerate && input.trim()) {
      setPendingRegenerate(false);
      handleSend();
    }
  }, [pendingRegenerate, input, handleSend]);

  const handleRegenerate = useCallback((message: ConsoleMessage) => {
    const msgIndex = messages.findIndex(m => m.id === message.id);
    if (msgIndex > 0) {
      const prevUserMsg = messages[msgIndex - 1];
      if (prevUserMsg.role === 'user') {
        setInput(prevUserMsg.content);
        setMode('image');
        setPendingRegenerate(true);
      }
    }
  }, [messages]);

  const handleModeChange = useCallback((newMode: 'text' | 'image' | 'research') => {
    setMode(newMode);
    if (newMode === 'research' && keyStatus?.openai) {
      setProvider('openai');
      if (OPENAI_DEEP_RESEARCH_MODELS.length > 0) setModel(OPENAI_DEEP_RESEARCH_MODELS[0].value);
    }
  }, [keyStatus]);

  return {
    // State
    messages, input, setInput, mode, provider, setProvider, model, setModel,
    copiedId, showAdvanced, setShowAdvanced, temperature, setTemperature,
    systemPrompt, setSystemPrompt, researchProgress,
    savingImageId, selectionMode, setSelectionMode, selectedIds,
    isPending, isResearching, isStreaming, messagesLoading, isDisabled,
    availableProviders, currentModels,

    // Refs
    scrollRef,

    // Handlers
    handleSend, handleCopy, clearChat, toggleMessageSelection,
    handleDeleteSelected, handleDeleteImage, handleRegenerate, handleModeChange,

    // Mutations state
    deleteSelectedMessages,
  };
}
