import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFileSettings, useUpdateFileSettings, useStorageStats } from '@/hooks/useFileSettings';
import { 
  HardDrive, 
  Upload, 
  FileType, 
  Trash2, 
  Database,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  Save,
  AlertTriangle
} from 'lucide-react';

const FILE_TYPE_CATEGORIES = [
  { 
    id: 'images', 
    label: 'Images', 
    icon: Image,
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'],
    color: 'text-pink-500'
  },
  { 
    id: 'documents', 
    label: 'Documents', 
    icon: FileText,
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md', 'csv'],
    color: 'text-blue-500'
  },
  { 
    id: 'videos', 
    label: 'Videos', 
    icon: Video,
    extensions: ['mp4', 'webm', 'mov', 'avi'],
    color: 'text-purple-500'
  },
  { 
    id: 'audio', 
    label: 'Audio', 
    icon: Music,
    extensions: ['mp3', 'wav', 'm4a', 'ogg'],
    color: 'text-green-500'
  },
  { 
    id: 'archives', 
    label: 'Archives', 
    icon: Archive,
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    color: 'text-amber-500'
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FilesManagerSettings() {
  const { data: settings, isLoading: settingsLoading } = useFileSettings();
  const { data: storageStats, isLoading: statsLoading } = useStorageStats();
  const updateSettings = useUpdateFileSettings();

  // Local state for form
  const [maxFileSize, setMaxFileSize] = useState(100);
  const [storageQuota, setStorageQuota] = useState(5);
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);
  const [neverAutoDelete, setNeverAutoDelete] = useState(false);
  const [allowAllTypes, setAllowAllTypes] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setMaxFileSize(settings.max_file_size_mb);
      setStorageQuota(settings.total_storage_quota_gb);
      setAutoDeleteDays(settings.auto_delete_trash_days ?? 30);
      setNeverAutoDelete(settings.auto_delete_trash_days === null);
      
      if (settings.allowed_file_types === null) {
        setAllowAllTypes(true);
        setSelectedTypes([]);
      } else {
        setAllowAllTypes(false);
        // Convert extensions back to category IDs
        const categoryIds = FILE_TYPE_CATEGORIES
          .filter(cat => cat.extensions.some(ext => settings.allowed_file_types?.includes(ext)))
          .map(cat => cat.id);
        setSelectedTypes(categoryIds);
      }
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (!settings) return;
    
    const currentAllowedTypes = allowAllTypes 
      ? null 
      : FILE_TYPE_CATEGORIES
          .filter(cat => selectedTypes.includes(cat.id))
          .flatMap(cat => cat.extensions);
    
    const settingsAllowedTypes = settings.allowed_file_types;
    const typesMatch = 
      (currentAllowedTypes === null && settingsAllowedTypes === null) ||
      (currentAllowedTypes?.sort().join(',') === settingsAllowedTypes?.sort().join(','));

    const changed = 
      maxFileSize !== settings.max_file_size_mb ||
      storageQuota !== settings.total_storage_quota_gb ||
      (neverAutoDelete ? null : autoDeleteDays) !== settings.auto_delete_trash_days ||
      !typesMatch;
    
    setHasChanges(changed);
  }, [maxFileSize, storageQuota, autoDeleteDays, neverAutoDelete, allowAllTypes, selectedTypes, settings]);

  const handleSave = () => {
    const allowedTypes = allowAllTypes 
      ? null 
      : FILE_TYPE_CATEGORIES
          .filter(cat => selectedTypes.includes(cat.id))
          .flatMap(cat => cat.extensions);

    updateSettings.mutate({
      max_file_size_mb: maxFileSize,
      total_storage_quota_gb: storageQuota,
      auto_delete_trash_days: neverAutoDelete ? null : autoDeleteDays,
      allowed_file_types: allowedTypes,
    });
  };

  const toggleFileType = (categoryId: string) => {
    setSelectedTypes(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const usedBytes = storageStats?.used ?? 0;
  const totalBytes = (storageQuota || 5) * 1024 * 1024 * 1024;
  const usagePercent = (usedBytes / totalBytes) * 100;
  return (
    <div className="space-y-6">

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Limits Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Upload className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-base">Upload Limits</CardTitle>
                <CardDescription>Maximum file size (synced with Supabase Storage)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Max file size</Label>
                <span className="text-lg font-semibold text-cyan-600">{maxFileSize} MB</span>
              </div>
              <Slider
                value={[maxFileSize]}
                onValueChange={([value]) => setMaxFileSize(value)}
                min={10}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 MB</span>
                <span>1 GB</span>
              </div>
            </div>
            {storageStats?.bucket_limits?.files?.file_size_limit && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current bucket limit:</span>
                  <span className="font-medium">{Math.round(storageStats.bucket_limits.files.file_size_limit / 1024 / 1024)} MB</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is the maximum size allowed for individual file uploads.
                  Files exceeding this limit will be rejected by the storage system.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Quota Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">Storage Quota</CardTitle>
                <CardDescription>Application-level storage limit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Storage quota</Label>
                <span className="text-lg font-semibold text-cyan-600">{storageQuota} GB</span>
              </div>
              <Slider
                value={[storageQuota]}
                onValueChange={([value]) => setStorageQuota(value)}
                min={1}
                max={100}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 GB</span>
                <span>100 GB</span>
              </div>
            </div>
            {storageStats?.total && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current quota:</span>
                  <span className="font-medium">{(storageStats.total / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is the total storage capacity available for all files.
                  When this limit is reached, new uploads will be prevented.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Allowed File Types Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileType className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Allowed File Types</CardTitle>
                <CardDescription>Restrict which files can be uploaded</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="allow-all" className="text-sm cursor-pointer">
                Allow all file types
              </Label>
              <Switch
                id="allow-all"
                checked={allowAllTypes}
                onCheckedChange={(checked) => {
                  setAllowAllTypes(checked);
                  if (checked) setSelectedTypes([]);
                }}
              />
            </div>
            
            {!allowAllTypes && (
              <div className="grid grid-cols-2 gap-2">
                {FILE_TYPE_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedTypes.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary/5 border-primary' 
                          : 'bg-background border-border hover:border-muted-foreground/30'
                      }`}
                      onClick={() => toggleFileType(category.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleFileType(category.id)}
                      />
                      <Icon className={`w-4 h-4 ${category.color}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-Cleanup Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base">Auto-Cleanup</CardTitle>
                <CardDescription>Automatically delete trashed files</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="never-delete" className="text-sm cursor-pointer">
                Never auto-delete
              </Label>
              <Switch
                id="never-delete"
                checked={neverAutoDelete}
                onCheckedChange={setNeverAutoDelete}
              />
            </div>
            
            {!neverAutoDelete && (
              <div className="space-y-2">
                <Label>Delete trash after</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={autoDeleteDays}
                    onChange={(e) => setAutoDeleteDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                    min={1}
                    max={365}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Files in trash will be permanently deleted after this period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button - Above Storage Breakdown */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">You have unsaved changes</span>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Storage Breakdown Card - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Storage Breakdown</CardTitle>
              <CardDescription>Usage by storage bucket</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Files Bucket */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-sm font-medium">Files Manager</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageStats?.buckets?.files?.size ?? 0)} ({storageStats?.buckets?.files?.count ?? 0} files)
                  </span>
                </div>
                <Progress 
                  value={((storageStats?.buckets?.files?.size ?? 0) / totalBytes) * 100} 
                  className="h-2 [&>div]:bg-cyan-500"
                />
              </div>

              {/* Brain Documents Bucket */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-sm font-medium">Brain Knowledge</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageStats?.buckets?.['brain-documents']?.size ?? 0)} ({storageStats?.buckets?.['brain-documents']?.count ?? 0} docs)
                  </span>
                </div>
                <Progress 
                  value={((storageStats?.buckets?.['brain-documents']?.size ?? 0) / totalBytes) * 100} 
                  className="h-2 [&>div]:bg-indigo-500"
                />
              </div>

              {/* Total */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Usage</span>
                  <span className="font-semibold">
                    {formatBytes(usedBytes)} / {storageQuota} GB ({usagePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
