import { useState } from 'react';
import { 
  BrainCircuit, 
  Heart, 
  BookOpen,
  Plus, 
  Edit2, 
  Trash2,
  Building2,
  Package,
  Users,
  Settings2,
  MessageSquare,
  ShieldAlert,
  FileText,
  Scale,
  Sparkles,
  Zap,
  Target,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  useBrainCategories,
  useCreateBrainCategory,
  useUpdateBrainCategory,
  useDeleteBrainCategory,
  type BrainCategory,
} from '@/hooks/useBrainCategories';
import {
  useHeartCategories,
  useCreateHeartCategory,
  useUpdateHeartCategory,
  useDeleteHeartCategory,
  type HeartCategory,
} from '@/hooks/useHeartCategories';
import {
  useWishpediaCategories,
  useCreateWishpediaCategory,
  useUpdateWishpediaCategory,
  useDeleteWishpediaCategory,
  type WishpediaCategory,
} from '@/hooks/useWishpediaCategories';

// Available icons for categories
const AVAILABLE_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'Building2', icon: Building2, label: 'Building' },
  { id: 'Package', icon: Package, label: 'Package' },
  { id: 'Users', icon: Users, label: 'Users' },
  { id: 'Settings2', icon: Settings2, label: 'Settings' },
  { id: 'MessageSquare', icon: MessageSquare, label: 'Message' },
  { id: 'ShieldAlert', icon: ShieldAlert, label: 'Shield' },
  { id: 'FileText', icon: FileText, label: 'Document' },
  { id: 'Scale', icon: Scale, label: 'Scale' },
  { id: 'Sparkles', icon: Sparkles, label: 'Sparkles' },
  { id: 'Zap', icon: Zap, label: 'Zap' },
  { id: 'Target', icon: Target, label: 'Target' },
  { id: 'Lightbulb', icon: Lightbulb, label: 'Lightbulb' },
];

// Colors for Brain and Heart categories
const CATEGORY_COLORS = [
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { id: 'green', label: 'Green', class: 'bg-green-500' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { id: 'red', label: 'Red', class: 'bg-red-500' },
];

// Restricted brand-safe colors for Wishpedia categories
const WISHPEDIA_COLORS = [
  { id: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { id: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { id: 'yellow', label: 'Gold', class: 'bg-yellow-600' },
  { id: 'stone', label: 'Stone', class: 'bg-stone-500' },
  { id: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { id: 'zinc', label: 'Zinc', class: 'bg-zinc-500' },
];

function getIconComponent(iconName: string): LucideIcon {
  const found = AVAILABLE_ICONS.find(i => i.id === iconName);
  return found?.icon || FileText;
}

function getColorClass(color: string): string {
  const found = CATEGORY_COLORS.find(c => c.id === color);
  return found?.class || 'bg-muted/500';
}

export function MasterMindSettings() {
  const { data: brainCategories, isLoading: brainLoading } = useBrainCategories();
  const { data: heartCategories, isLoading: heartLoading } = useHeartCategories();
  const { data: wishpediaCategories, isLoading: wishpediaLoading } = useWishpediaCategories();

  const createBrainCategory = useCreateBrainCategory();
  const updateBrainCategory = useUpdateBrainCategory();
  const deleteBrainCategory = useDeleteBrainCategory();

  const createHeartCategory = useCreateHeartCategory();
  const updateHeartCategory = useUpdateHeartCategory();
  const deleteHeartCategory = useDeleteHeartCategory();

  const createWishpediaCategory = useCreateWishpediaCategory();
  const updateWishpediaCategory = useUpdateWishpediaCategory();
  const deleteWishpediaCategory = useDeleteWishpediaCategory();

  // Brain dialog state
  const [brainDialogOpen, setBrainDialogOpen] = useState(false);
  const [editingBrain, setEditingBrain] = useState<BrainCategory | null>(null);
  const [brainForm, setBrainForm] = useState({ id: '', name: '', description: '', icon: 'FileText', color: 'indigo' });

  // Heart dialog state
  const [heartDialogOpen, setHeartDialogOpen] = useState(false);
  const [editingHeart, setEditingHeart] = useState<HeartCategory | null>(null);
  const [heartForm, setHeartForm] = useState({ id: '', name: '', description: '', icon: 'MessageSquare', color: 'violet' });

  // Wishpedia dialog state
  const [wishpediaDialogOpen, setWishpediaDialogOpen] = useState(false);
  const [editingWishpedia, setEditingWishpedia] = useState<WishpediaCategory | null>(null);
  const [wishpediaForm, setWishpediaForm] = useState({ name: '', description: '', icon: 'Users', color: 'amber', has_angle_views: false });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'brain' | 'heart' | 'wishpedia'; id: string; name: string } | null>(null);

  // Brain category handlers
  const openBrainDialog = (category?: BrainCategory) => {
    if (category) {
      setEditingBrain(category);
      setBrainForm({
        id: category.id,
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        color: category.color || 'indigo',
      });
    } else {
      setEditingBrain(null);
      setBrainForm({ id: '', name: '', description: '', icon: 'FileText', color: 'indigo' });
    }
    setBrainDialogOpen(true);
  };

  const handleSaveBrain = async () => {
    if (!brainForm.name.trim()) return;

    if (editingBrain) {
      await updateBrainCategory.mutateAsync({
        id: editingBrain.id,
        updates: {
          name: brainForm.name,
          description: brainForm.description || undefined,
          icon: brainForm.icon,
          color: brainForm.color,
        },
      });
    } else {
      const id = brainForm.id.trim() || brainForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createBrainCategory.mutateAsync({
        id,
        name: brainForm.name,
        description: brainForm.description || undefined,
        icon: brainForm.icon,
        color: brainForm.color,
      });
    }
    setBrainDialogOpen(false);
  };

  // Heart category handlers
  const openHeartDialog = (category?: HeartCategory) => {
    if (category) {
      setEditingHeart(category);
      setHeartForm({
        id: category.id,
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        color: category.color,
      });
    } else {
      setEditingHeart(null);
      setHeartForm({ id: '', name: '', description: '', icon: 'MessageSquare', color: 'violet' });
    }
    setHeartDialogOpen(true);
  };

  const handleSaveHeart = async () => {
    if (!heartForm.name.trim()) return;

    if (editingHeart) {
      await updateHeartCategory.mutateAsync({
        id: editingHeart.id,
        updates: {
          name: heartForm.name,
          description: heartForm.description || undefined,
          icon: heartForm.icon,
          color: heartForm.color,
        },
      });
    } else {
      const id = heartForm.id.trim() || heartForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createHeartCategory.mutateAsync({
        id,
        name: heartForm.name,
        description: heartForm.description || undefined,
        icon: heartForm.icon,
        color: heartForm.color,
      });
    }
    setHeartDialogOpen(false);
  };

  // Wishpedia category handlers
  const openWishpediaDialog = (category?: WishpediaCategory) => {
    if (category) {
      setEditingWishpedia(category);
      setWishpediaForm({
        name: category.name,
        description: category.description || '',
        icon: category.icon,
        color: category.color,
        has_angle_views: category.has_angle_views,
      });
    } else {
      setEditingWishpedia(null);
      setWishpediaForm({ name: '', description: '', icon: 'Users', color: 'amber', has_angle_views: false });
    }
    setWishpediaDialogOpen(true);
  };

  const handleSaveWishpedia = async () => {
    if (!wishpediaForm.name.trim()) return;

    if (editingWishpedia) {
      await updateWishpediaCategory.mutateAsync({
        id: editingWishpedia.id,
        updates: {
          name: wishpediaForm.name,
          description: wishpediaForm.description || undefined,
          icon: wishpediaForm.icon,
          color: wishpediaForm.color,
          has_angle_views: wishpediaForm.has_angle_views,
        },
      });
    } else {
      await createWishpediaCategory.mutateAsync({
        name: wishpediaForm.name,
        description: wishpediaForm.description || undefined,
        icon: wishpediaForm.icon,
        color: wishpediaForm.color,
        has_angle_views: wishpediaForm.has_angle_views,
      });
    }
    setWishpediaDialogOpen(false);
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'brain') {
      await deleteBrainCategory.mutateAsync(deleteTarget.id);
    } else if (deleteTarget.type === 'heart') {
      await deleteHeartCategory.mutateAsync(deleteTarget.id);
    } else {
      await deleteWishpediaCategory.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-8">
      {/* Brain Categories Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Brain Knowledge Categories</CardTitle>
                <CardDescription>Organize your knowledge base documents into categories</CardDescription>
              </div>
            </div>
            <Button onClick={() => openBrainDialog()} className="gap-1 sm:gap-2 bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {brainLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {brainCategories?.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const colorClass = getColorClass(category.color ?? '');
                return (
                  <div
                    key={category.id}
                    className="group relative p-4 border border-border rounded-lg transition-all overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass} bg-opacity-20`}>
                        <IconComponent className={`w-4 h-4 ${colorClass.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">{category.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description || 'No description'}</p>
                      </div>
                    </div>
                    {/* Hover overlay with centered icons */}
                    <div className="absolute inset-0 bg-card/90 backdrop-blur-[1px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm hover:bg-indigo-50"
                        onClick={() => openBrainDialog(category)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget({ type: 'brain', id: category.id, name: category.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heart Categories Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Heart Rule Categories</CardTitle>
                <CardDescription>Define categories for AI behavior rules</CardDescription>
              </div>
            </div>
            <Button onClick={() => openHeartDialog()} className="gap-1 sm:gap-2 bg-rose-500 hover:bg-rose-600">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {heartLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {heartCategories?.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <div
                    key={category.id}
                    className="group relative p-4 border border-border rounded-lg transition-all overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getColorClass(category.color)} bg-opacity-20`}>
                        <IconComponent className={`w-4 h-4 ${getColorClass(category.color).replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">{category.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description || 'No description'}</p>
                      </div>
                    </div>
                    {/* Hover overlay with centered icons */}
                    <div className="absolute inset-0 bg-card/90 backdrop-blur-[1px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm hover:bg-rose-50"
                        onClick={() => openHeartDialog(category)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget({ type: 'heart', id: category.id, name: category.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brain Category Dialog */}
      <Dialog open={brainDialogOpen} onOpenChange={setBrainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrain ? 'Edit Brain Category' : 'Add Brain Category'}</DialogTitle>
            <DialogDescription>
              {editingBrain ? 'Update the category details' : 'Create a new category for organizing knowledge documents'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brain-icon">Icon</Label>
                <Select value={brainForm.icon} onValueChange={(v) => setBrainForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.id} value={icon.id}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={brainForm.color} onValueChange={(v) => setBrainForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_COLORS.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brain-name">Name</Label>
              <Input
                id="brain-name"
                value={brainForm.name}
                onChange={(e) => setBrainForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Brand & Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brain-desc">Description</Label>
              <Textarea
                id="brain-desc"
                value={brainForm.description}
                onChange={(e) => setBrainForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What kind of documents belong in this category?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrainDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveBrain} 
              disabled={!brainForm.name.trim() || createBrainCategory.isPending || updateBrainCategory.isPending}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {editingBrain ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Heart Category Dialog */}
      <Dialog open={heartDialogOpen} onOpenChange={setHeartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHeart ? 'Edit Heart Category' : 'Add Heart Category'}</DialogTitle>
            <DialogDescription>
              {editingHeart ? 'Update the category details' : 'Create a new category for organizing behavior rules'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heart-icon">Icon</Label>
                <Select value={heartForm.icon} onValueChange={(v) => setHeartForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.id} value={icon.id}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={heartForm.color} onValueChange={(v) => setHeartForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_COLORS.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heart-name">Name</Label>
              <Input
                id="heart-name"
                value={heartForm.name}
                onChange={(e) => setHeartForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Communication Style"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heart-desc">Description</Label>
              <Textarea
                id="heart-desc"
                value={heartForm.description}
                onChange={(e) => setHeartForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What kind of rules belong in this category?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeartDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveHeart} 
              disabled={!heartForm.name.trim() || createHeartCategory.isPending || updateHeartCategory.isPending}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {editingHeart ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will not delete associated documents or rules, but they may become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wishpedia Categories Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Wishpedia Categories</CardTitle>
                <CardDescription>Define encyclopedia categories for your entries</CardDescription>
              </div>
            </div>
            <Button onClick={() => openWishpediaDialog()} className="gap-1 sm:gap-2 bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {wishpediaLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {wishpediaCategories?.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const colorClass = getColorClass(category.color ?? '');
                return (
                  <div
                    key={category.id}
                    className="group relative p-4 border border-border rounded-lg transition-all overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass} bg-opacity-20`}>
                        <IconComponent className={`w-4 h-4 ${colorClass.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground text-sm truncate">{category.name}</h4>
                          {category.has_angle_views && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">6-Angle</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{category.description || 'No description'}</p>
                      </div>
                    </div>
                    {/* Hover overlay with centered icons */}
                    <div className="absolute inset-0 bg-card/90 backdrop-blur-[1px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm hover:bg-amber-50"
                        onClick={() => openWishpediaDialog(category)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 min-h-[44px] min-w-[44px] bg-card shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget({ type: 'wishpedia', id: category.id, name: category.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wishpedia Category Dialog */}
      <Dialog open={wishpediaDialogOpen} onOpenChange={setWishpediaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWishpedia ? 'Edit Wishpedia Category' : 'Add Wishpedia Category'}</DialogTitle>
            <DialogDescription>
              {editingWishpedia ? 'Update the category details' : 'Create a new category for encyclopedia entries'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={wishpediaForm.icon} onValueChange={(v) => setWishpediaForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => {
                      const IconComp = icon.icon;
                      return (
                        <SelectItem key={icon.id} value={icon.id}>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={wishpediaForm.color} onValueChange={(v) => setWishpediaForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WISHPEDIA_COLORS.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={wishpediaForm.name}
                onChange={(e) => setWishpediaForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Character, Place, Item"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={wishpediaForm.description}
                onChange={(e) => setWishpediaForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What kind of entries belong in this category?"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <div>
                <Label>6-Angle View Uploads</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Entries require 6 structured angle images (front, back, left, right, top, bottom)
                </p>
              </div>
              <Switch
                checked={wishpediaForm.has_angle_views}
                onCheckedChange={(v) => setWishpediaForm(f => ({ ...f, has_angle_views: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWishpediaDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveWishpedia} 
              disabled={!wishpediaForm.name.trim() || createWishpediaCategory.isPending || updateWishpediaCategory.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {editingWishpedia ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
