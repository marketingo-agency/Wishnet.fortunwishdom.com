import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Check, Bot, Loader2, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUploadBrainDocument } from '@/hooks/useBrainDocuments';
import { useBrainCategories } from '@/hooks/useBrainCategories';
import { useBrainSections } from '@/hooks/useBrainSections';
import { useGetOrCreateBrainFolder, useCreateLinkedFile } from '@/hooks/useFiles';
import { useFileSettings } from '@/hooks/useFileSettings';
import { useAuth } from '@/contexts/AuthContext';
import { AI_AGENTS } from '@/data/agents';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  defaultCategory?: string;
  agentId?: string; // ID of current agent (if on agent-specific page)
}

export function UploadDocumentDialog({ 
  open, 
  onOpenChange, 
  sectionId,
  defaultCategory = 'brand',
  agentId
}: UploadDocumentDialogProps) {
  // Determine if we're on an agent-specific page
  const isAgentSpecific = agentId && agentId !== 'general';
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory);
  
  // New destination-based state
  const [destination, setDestination] = useState<'general' | 'agent'>(
    isAgentSpecific ? 'agent' : 'general'
  );
  const [selectedAgent, setSelectedAgent] = useState<string>(
    isAgentSpecific ? agentId : ''
  );
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [restrictedAgents, setRestrictedAgents] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const uploadMutation = useUploadBrainDocument();
  const { data: brainCategories } = useBrainCategories();
  const { data: brainSections } = useBrainSections();
  const getOrCreateBrainFolder = useGetOrCreateBrainFolder();
  const createLinkedFile = useCreateLinkedFile();
  const { data: fileSettings } = useFileSettings();

  const maxSizeBytes = (fileSettings?.max_file_size_mb || 100) * 1024 * 1024;

  // Get sections for destination lookup
  const generalSection = brainSections?.find(s => s.type === 'general');
  const agentSections = brainSections?.filter(s => s.type === 'agent') || [];

  // Update category when defaultCategory changes or when categories load
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    } else if (brainCategories?.[0]?.id) {
      setCategory(brainCategories[0].id);
    }
  }, [defaultCategory, brainCategories]);

  // Reset state when dialog opens based on context
  useEffect(() => {
    if (open) {
      const isAgentContext = agentId && agentId !== 'general';
      setDestination(isAgentContext ? 'agent' : 'general');
      setSelectedAgent(isAgentContext ? agentId : '');
      setRestrictAccess(false);
      setRestrictedAgents([]);
    }
  }, [open, agentId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Check file size against limit
      if (selectedFile.size > maxSizeBytes) {
        toast.error(`File exceeds the ${fileSettings?.max_file_size_mb || 100}MB limit`);
        return;
      }
      
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, '')); // Remove extension for default name
      }
    }
  }, [name, maxSizeBytes, fileSettings?.max_file_size_mb]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/*': ['.txt', '.md', '.csv'],
    },
  });

  const handleSubmit = async () => {
    if (!file || !user) return;

    // Determine target section based on destination
    let targetSectionId = sectionId;
    
    if (destination === 'general' && generalSection) {
      targetSectionId = generalSection.id;
    } else if (destination === 'agent' && selectedAgent) {
      const agentSection = agentSections.find(s => s.agent_id === selectedAgent);
      if (agentSection) {
        targetSectionId = agentSection.id;
      }
    }

    // Determine restricted agents (only for general knowledge with restrictions)
    const restrictedAgentsList = 
      destination === 'general' && restrictAccess && restrictedAgents.length > 0
        ? restrictedAgents
        : undefined;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate smooth progress
    progressIntervalRef.current = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 5, 80));
    }, 200);

    try {
      // Upload brain document
      const brainDoc = await uploadMutation.mutateAsync({
        file,
        sectionId: targetSectionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- category value comes from a dynamic select; Supabase enum type is not exported
        category: category as any,
        name: name || file.name,
        description: description || undefined,
        restrictedAgents: restrictedAgentsList,
      });

      // Also create a linked file in Files Manager
      try {
        const folder = await getOrCreateBrainFolder.mutateAsync();
        
        await createLinkedFile.mutateAsync({
          name: brainDoc.name,
          originalName: brainDoc.original_name,
          storagePath: brainDoc.storage_path,
          mimeType: brainDoc.mime_type,
          size: brainDoc.size,
          sectorId: folder.id,
          description: `Brain document: ${brainDoc.description || name || file.name}`,
        });
      } catch (error) {
        Sentry.captureException(error instanceof Error ? error : new Error('Failed to create linked file in Files Manager'), { extra: { context: 'Failed to create linked file in Files Manager' } });
      }

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setUploadProgress(100);

      // Reset and close after brief delay
      setTimeout(() => {
        setFile(null);
        setName('');
        setDescription('');
        setCategory(defaultCategory || brainCategories?.[0]?.id || 'brand');
        setDestination(isAgentSpecific ? 'agent' : 'general');
        setSelectedAgent(isAgentSpecific ? agentId || '' : '');
        setRestrictAccess(false);
        setRestrictedAgents([]);
        setIsUploading(false);
        setUploadProgress(0);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsUploading(false);
      setUploadProgress(0);
      // CODE-02: surface the failure instead of silently resetting.
      Sentry.captureException(error instanceof Error ? error : new Error('Brain document upload failed'), { extra: { context: 'UploadDocumentDialog upload' } });
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Could not upload the document. Please try again.',
      });
    }
  };

  const toggleRestrictedAgent = (agentId: string) => {
    setRestrictedAgents(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Validation for submit button
  const canSubmit = file && !isUploading && !getOrCreateBrainFolder.isPending && (
    destination === 'general' 
      ? (!restrictAccess || restrictedAgents.length > 0)
      : !!selectedAgent
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a document to your knowledge base. It will be available to AI agents and stored in your Files Manager.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* File Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 rounded-xl p-6 text-center cursor-pointer transition-colors overflow-hidden ${
                isDragActive 
                  ? 'border-dashed border-indigo-500 bg-indigo-50' 
                  : file 
                    ? 'border-solid border-emerald-400 bg-emerald-50'
                    : 'border-dashed border-border hover:border-border'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex w-full items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-foreground whitespace-normal break-all">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="ml-auto flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/70 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    PDF, DOC, XLSX, images, and more
                  </p>
                </>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this document"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(brainCategories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this document..."
                rows={2}
              />
            </div>

            {/* Document Destination */}
            <div className="space-y-3">
              <Label>Document Destination</Label>
              
              {/* General Knowledge Option */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  destination === 'general' 
                    ? 'bg-indigo-50 border-indigo-400' 
                    : 'bg-card border-border hover:border-border'
                }`}
                onClick={() => setDestination('general')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    destination === 'general' ? 'border-indigo-500' : 'border-border'
                  }`}>
                    {destination === 'general' && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-medium text-foreground">General Knowledge</p>
                      <p className="text-xs text-muted-foreground">Available to all AI agents by default</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent-Specific Option */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  destination === 'agent' 
                    ? 'bg-purple-50 border-purple-400' 
                    : 'bg-card border-border hover:border-border'
                }`}
                onClick={() => setDestination('agent')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    destination === 'agent' ? 'border-purple-500' : 'border-border'
                  }`}>
                    {destination === 'agent' && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-foreground">Agent-Specific Knowledge</p>
                      <p className="text-xs text-muted-foreground">Only for the selected agent</p>
                    </div>
                  </div>
                </div>
                
                {/* Agent selector when this option is selected */}
                {destination === 'agent' && (
                  <div className="mt-3 ml-7">
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_AGENTS.map((agent) => {
                          const Icon = agent.icon;
                          return (
                            <SelectItem key={agent.id} value={agent.id}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {agent.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Access Restrictions - Only for General Knowledge */}
            {destination === 'general' && (
              <div className="space-y-3">
                <Label>Agent Access</Label>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-card shadow-sm flex items-center justify-center">
                      <Bot className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Restrict to specific agents</p>
                      <p className="text-xs text-muted-foreground">Limit which agents can access this document</p>
                    </div>
                  </div>
                  <Switch 
                    checked={restrictAccess} 
                    onCheckedChange={(checked) => {
                      setRestrictAccess(checked);
                      if (!checked) setRestrictedAgents([]);
                    }}
                  />
                </div>
                
                {restrictAccess && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Select which agents can access this document:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AI_AGENTS.map((agent) => {
                        const Icon = agent.icon;
                        const isSelected = restrictedAgents.includes(agent.id);
                        return (
                          <div
                            key={agent.id}
                            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-indigo-50 border-indigo-400 shadow-sm' 
                                : 'bg-card border-border hover:border-border hover:shadow-sm'
                            }`}
                            onClick={() => toggleRestrictedAgent(agent.id)}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {restrictedAgents.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Select at least one agent
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <div className="relative">
            {/* Progress bar beneath button during upload */}
            {isUploading && (
              <div className="absolute -bottom-2.5 left-0 right-0 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
