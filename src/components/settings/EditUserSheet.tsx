import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PermissionLevelSelector } from './PermissionLevelSelector';
import { useUserPermissions, useUpdateUserPermissions } from '@/hooks/useUserPermissions';
import type { PermissionLevel, UserPermissions } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  User, 
  Upload, 
  FolderOpen, 
  Brain, 
  Bot,
  Sparkles,
  ListTodo,
  ChevronDown,
  Settings,
  Loader2,
  Shield,
  Eye,
  Trash2,
  UploadCloud,
  Plus,
  Edit,
  Settings2,
  Wand2,
  Mic,
  Share2,
  Palette,
  Boxes,
  Home,
  Cat,
  PersonStanding,
  Spade,
  Package,
  Orbit,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'agent';
  created_at: string;
}

interface EditUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: () => void;
}

const toolConfigs = [
  { 
    key: 'files_manager' as const, 
    label: 'Files Manager', 
    icon: FolderOpen,
    color: 'text-blue-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'files_can_see_admin_files', label: 'Can see admin files', icon: Eye },
      { key: 'files_can_upload', label: 'Can upload files', icon: UploadCloud },
      { key: 'files_can_delete', label: 'Can delete files', icon: Trash2 },
    ]
  },
  { 
    key: 'mastermind' as const, 
    label: 'Fortun MasterMind', 
    icon: Brain, 
    color: 'text-purple-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'mastermind_can_create', label: 'Can create', icon: Plus },
      { key: 'mastermind_can_edit', label: 'Can edit', icon: Edit },
      { key: 'mastermind_can_delete', label: 'Can delete', icon: Trash2 },
    ]
  },
  { 
    key: 'ai_agents' as const, 
    label: 'AI Agents', 
    icon: Bot, 
    color: 'text-cyan-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'ai_can_access_nexus', label: 'Nexus (Control Center)', icon: Settings2 },
      { key: 'ai_can_access_promptor', label: 'Promptor (Prompts)', icon: Wand2 },
      { key: 'ai_can_access_osha', label: 'Osha (Assistant)', icon: Bot },
      { key: 'ai_can_access_whisper', label: 'Whisper (Podcast)', icon: Mic },
      { key: 'ai_can_access_pulse', label: 'Pulse (Social)', icon: Share2 },
      { key: 'ai_can_access_pixel', label: 'Pixel (Visuals)', icon: Palette },
      { key: 'ai_can_access_atlas', label: 'ATLAS (Operations)', icon: Boxes },
      { key: 'ai_can_access_omni', label: 'Omni (Creation)', icon: Orbit },
    ]
  },
  { 
    key: 'wishdom' as const, 
    label: 'Fortun Wishdom', 
    icon: Sparkles, 
    color: 'text-fuchsia-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'wishdom_can_access_main', label: 'The Wishdom (Main)', icon: Home },
      { key: 'wishdom_can_access_plushes', label: 'Plushes', icon: Cat },
      { key: 'wishdom_can_access_figurines', label: 'Figurines', icon: PersonStanding },
      { key: 'wishdom_can_access_cards', label: 'Cards', icon: Spade },
      { key: 'wishdom_can_access_stocks', label: 'Stocks', icon: Package },
    ]
  },
  { 
    key: 'taskforce' as const, 
    label: 'Taskforce', 
    icon: ListTodo, 
    color: 'text-orange-500',
    hasAdvanced: true,
    advancedOptions: [
      { key: 'taskforce_can_create', label: 'Can create tasks', icon: Plus },
      { key: 'taskforce_can_edit', label: 'Can edit tasks', icon: Edit },
      { key: 'taskforce_can_delete', label: 'Can delete tasks', icon: Trash2 },
    ]
  },
];

export function EditUserSheet({ open, onOpenChange, user, onSave }: EditUserSheetProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: userPermissions, isLoading: isLoadingPermissions } = useUserPermissions(user?.id);
  const updatePermissions = useUpdateUserPermissions();
  
  // Local permissions state
  const [permissions, setPermissions] = useState<Partial<UserPermissions>>({
    files_manager: 'none',
    mastermind: 'none',
    ai_agents: 'none',
    wishdom: 'none',
    
    taskforce: 'none',
    can_access_branding: false,
    can_access_user_management: false,
    // Files Manager
    files_can_see_admin_files: false,
    files_can_delete: true,
    files_can_upload: true,
    // AI Agents
    ai_can_access_nexus: true,
    ai_can_access_promptor: true,
    ai_can_access_osha: true,
    ai_can_access_whisper: true,
    ai_can_access_pulse: true,
    ai_can_access_pixel: true,
    ai_can_access_atlas: true,
    ai_can_access_omni: true,
    // Wishdom
    wishdom_can_access_main: true,
    wishdom_can_access_plushes: true,
    wishdom_can_access_figurines: true,
    wishdom_can_access_cards: true,
    wishdom_can_access_stocks: true,
    // MasterMind
    mastermind_can_create: true,
    mastermind_can_edit: true,
    mastermind_can_delete: true,
    // Taskforce
    taskforce_can_create: true,
    taskforce_can_edit: true,
    taskforce_can_delete: true,
  });

  // Initialize form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setRole(user.role);
      setAvatarUrl(user.avatar_url);
    }
  }, [user]);

  // Initialize permissions when loaded
  useEffect(() => {
    if (userPermissions) {
      setPermissions({
        files_manager: userPermissions.files_manager,
        mastermind: userPermissions.mastermind,
        ai_agents: userPermissions.ai_agents,
        wishdom: userPermissions.wishdom,
        
        taskforce: userPermissions.taskforce,
        can_access_branding: userPermissions.can_access_branding,
        can_access_user_management: userPermissions.can_access_user_management,
        // Files Manager
        files_can_see_admin_files: userPermissions.files_can_see_admin_files,
        files_can_delete: userPermissions.files_can_delete,
        files_can_upload: userPermissions.files_can_upload,
        // AI Agents
        ai_can_access_nexus: userPermissions.ai_can_access_nexus,
        ai_can_access_promptor: userPermissions.ai_can_access_promptor,
        ai_can_access_osha: userPermissions.ai_can_access_osha,
        ai_can_access_whisper: userPermissions.ai_can_access_whisper,
        ai_can_access_pulse: userPermissions.ai_can_access_pulse,
        ai_can_access_pixel: userPermissions.ai_can_access_pixel,
        ai_can_access_atlas: userPermissions.ai_can_access_atlas,
        ai_can_access_omni: userPermissions.ai_can_access_omni,
        // Wishdom
        wishdom_can_access_main: userPermissions.wishdom_can_access_main,
        wishdom_can_access_plushes: userPermissions.wishdom_can_access_plushes,
        wishdom_can_access_figurines: userPermissions.wishdom_can_access_figurines,
        wishdom_can_access_cards: userPermissions.wishdom_can_access_cards,
        wishdom_can_access_stocks: userPermissions.wishdom_can_access_stocks,
        // MasterMind
        mastermind_can_create: userPermissions.mastermind_can_create,
        mastermind_can_edit: userPermissions.mastermind_can_edit,
        mastermind_can_delete: userPermissions.mastermind_can_delete,
        // Taskforce
        taskforce_can_create: userPermissions.taskforce_can_create,
        taskforce_can_edit: userPermissions.taskforce_can_edit,
        taskforce_can_delete: userPermissions.taskforce_can_delete,
      });
    }
  }, [userPermissions]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      setAvatarUrl(urlData.publicUrl);
      toast.success('Avatar uploaded');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          avatar_url: avatarUrl 
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      // Update role via edge function
      if (role !== user.role) {
        const response = await supabase.functions.invoke('manage-users', {
          body: { 
            action: 'updateRole',
            userId: user.id,
            role: role 
          }
        });
        
        if (response.error) throw response.error;
      }

      // Update permissions (only for agents)
      if (role === 'agent') {
        await updatePermissions.mutateAsync({
          userId: user.id,
          permissions: permissions,
        });
      }

      // Invalidate all user-touching queries after role/profile update
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast.success('User updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update user', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleToolExpanded = (key: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update user profile and access permissions
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Profile Information
              </h3>
              
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: 'admin' | 'agent') => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Agent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {role === 'admin' 
                    ? 'Admins have full access to all tools and settings'
                    : 'Agents have customizable access permissions'
                  }
                </p>
              </div>
            </div>

            {/* Permissions Section - Only for agents */}
            {role === 'agent' && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Tool Access Permissions
                  </h3>
                  
                  {isLoadingPermissions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {toolConfigs.map((tool) => {
                        const Icon = tool.icon;
                        const hasAdvanced = tool.hasAdvanced && tool.advancedOptions;
                        const currentPermissionLevel = permissions[tool.key] as PermissionLevel || 'none';
                        const showAdvanced = hasAdvanced && currentPermissionLevel === 'limited';
                        const isExpanded = expandedTools.has(tool.key);
                        
                        return (
                          <div 
                            key={tool.key}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="p-3 bg-card">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg bg-muted ${tool.color}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium flex-1">{tool.label}</span>
                                {showAdvanced && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => toggleToolExpanded(tool.key)}
                                  >
                                    <ChevronDown 
                                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                    />
                                  </Button>
                                )}
                              </div>
                              <PermissionLevelSelector
                                value={currentPermissionLevel}
                                onChange={(level) => {
                                  setPermissions(prev => ({ ...prev, [tool.key]: level }));
                                  // Auto-expand advanced options when "limited" is selected
                                  if (level === 'limited' && hasAdvanced) {
                                    setExpandedTools(prev => new Set(prev).add(tool.key));
                                  }
                                }}
                              />
                            </div>
                            
                            {/* Advanced options - only visible when permission level is "limited" */}
                            {showAdvanced && isExpanded && tool.advancedOptions && (
                              <div className="border-t bg-muted/30 p-3 space-y-3">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Advanced Options
                                </p>
                                {tool.advancedOptions.map((option) => {
                                  const OptionIcon = option.icon;
                                  return (
                                    <div 
                                      key={option.key}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <OptionIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{option.label}</span>
                                      </div>
                                      <Switch
                                        checked={permissions[option.key as keyof typeof permissions] as boolean}
                                        onCheckedChange={(checked) => 
                                          setPermissions(prev => ({ ...prev, [option.key]: checked }))
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Settings Access */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Settings Access
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted text-emerald-500">
                          <Settings className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Branding Settings</p>
                          <p className="text-xs text-muted-foreground">Can customize app appearance</p>
                        </div>
                      </div>
                      <Switch
                        checked={permissions.can_access_branding ?? undefined}
                        onCheckedChange={(checked) =>
                          setPermissions(prev => ({ ...prev, can_access_branding: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted text-red-500">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">User Management</p>
                          <p className="text-xs text-muted-foreground">Can manage other users</p>
                        </div>
                      </div>
                      <Switch
                        checked={permissions.can_access_user_management ?? undefined}
                        onCheckedChange={(checked) =>
                          setPermissions(prev => ({ ...prev, can_access_user_management: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
