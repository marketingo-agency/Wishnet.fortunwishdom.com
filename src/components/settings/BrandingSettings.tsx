import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FortunLogo } from '@/components/brand/FortunLogo';
import { useBranding, useUpdateBranding } from '@/hooks/useBranding';
import { useFiles, useUploadFile, getFileUrl } from '@/hooks/useFiles';
import { SecureImage } from '@/components/files/SecureImage';
import { 
  LogIn, Layout, Globe, Type, Upload, Image, RotateCcw, Loader2, Palette, PanelLeftClose,
  // Shapes & Symbols
  Infinity as InfinityIcon, Circle, Square, Star, Heart, Shield, Zap, Diamond, Hexagon, Triangle, Pentagon, Octagon,
  // Business & Work
  Home, Building2, Briefcase, Store, Wallet, CreditCard, PiggyBank, Coins, ShoppingCart, ShoppingBag,
  // Tech & Digital
  Code, Terminal, Database, Server, Laptop, Smartphone, Wifi, Bot, Brain, Cpu, Monitor,
  // Nature & Weather
  Sun, Moon, Cloud, Flame, Leaf, TreeDeciduous, Flower2, Mountain, Waves, Snowflake, Droplets, Wind,
  // Objects & Tools
  Key, Lock, Crown, Trophy, Medal, Award, Rocket, Lightbulb, Compass, Target, Hammer, Wrench, Scissors,
  // Communication
  Bell, Mail, MessageCircle, Megaphone, Send, Phone, Radio, Podcast,
  // Media & Creative
  Camera, Music, Headphones, Mic, Feather, Pencil, Book, Bookmark, Paintbrush, Film,
  // Food & Drink
  Coffee, Pizza, Cake, Wine, Utensils, Apple, Cherry, IceCream,
  // Transport
  Car, Plane, Ship, Train, Bike, Bus,
  // Animals & Nature
  Bird, Fish, Bug, Cat, Dog,
  // Misc
  Globe2, Map, Flag, Gift, Sparkles, Gem, Anchor, Umbrella, Watch, Glasses, Gamepad2, Puzzle, GraduationCap, Stethoscope, Scale, Gavel
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const faviconOptions = [
  // Shapes & Symbols
  { name: 'infinity', component: InfinityIcon, isDefault: true },
  { name: 'circle', component: Circle },
  { name: 'square', component: Square },
  { name: 'star', component: Star },
  { name: 'heart', component: Heart },
  { name: 'diamond', component: Diamond },
  { name: 'hexagon', component: Hexagon },
  { name: 'triangle', component: Triangle },
  { name: 'pentagon', component: Pentagon },
  { name: 'octagon', component: Octagon },
  { name: 'gem', component: Gem },
  { name: 'sparkles', component: Sparkles },
  
  // Business & Work
  { name: 'building', component: Building2 },
  { name: 'briefcase', component: Briefcase },
  { name: 'store', component: Store },
  { name: 'wallet', component: Wallet },
  { name: 'creditCard', component: CreditCard },
  { name: 'piggyBank', component: PiggyBank },
  { name: 'coins', component: Coins },
  { name: 'shoppingCart', component: ShoppingCart },
  { name: 'shoppingBag', component: ShoppingBag },
  
  // Tech & Digital
  { name: 'code', component: Code },
  { name: 'terminal', component: Terminal },
  { name: 'database', component: Database },
  { name: 'server', component: Server },
  { name: 'laptop', component: Laptop },
  { name: 'smartphone', component: Smartphone },
  { name: 'monitor', component: Monitor },
  { name: 'wifi', component: Wifi },
  { name: 'bot', component: Bot },
  { name: 'brain', component: Brain },
  { name: 'cpu', component: Cpu },
  
  // Nature & Weather
  { name: 'sun', component: Sun },
  { name: 'moon', component: Moon },
  { name: 'cloud', component: Cloud },
  { name: 'flame', component: Flame },
  { name: 'leaf', component: Leaf },
  { name: 'tree', component: TreeDeciduous },
  { name: 'flower', component: Flower2 },
  { name: 'mountain', component: Mountain },
  { name: 'waves', component: Waves },
  { name: 'snowflake', component: Snowflake },
  { name: 'droplets', component: Droplets },
  { name: 'wind', component: Wind },
  
  // Objects & Tools
  { name: 'home', component: Home },
  { name: 'key', component: Key },
  { name: 'lock', component: Lock },
  { name: 'shield', component: Shield },
  { name: 'crown', component: Crown },
  { name: 'trophy', component: Trophy },
  { name: 'medal', component: Medal },
  { name: 'award', component: Award },
  { name: 'rocket', component: Rocket },
  { name: 'zap', component: Zap },
  { name: 'lightbulb', component: Lightbulb },
  { name: 'compass', component: Compass },
  { name: 'target', component: Target },
  { name: 'hammer', component: Hammer },
  { name: 'wrench', component: Wrench },
  { name: 'scissors', component: Scissors },
  
  // Communication
  { name: 'bell', component: Bell },
  { name: 'mail', component: Mail },
  { name: 'messageCircle', component: MessageCircle },
  { name: 'megaphone', component: Megaphone },
  { name: 'send', component: Send },
  { name: 'phone', component: Phone },
  { name: 'radio', component: Radio },
  { name: 'podcast', component: Podcast },
  
  // Media & Creative
  { name: 'camera', component: Camera },
  { name: 'music', component: Music },
  { name: 'headphones', component: Headphones },
  { name: 'mic', component: Mic },
  { name: 'palette', component: Palette },
  { name: 'feather', component: Feather },
  { name: 'pencil', component: Pencil },
  { name: 'paintbrush', component: Paintbrush },
  { name: 'book', component: Book },
  { name: 'bookmark', component: Bookmark },
  { name: 'film', component: Film },
  
  // Food & Drink
  { name: 'coffee', component: Coffee },
  { name: 'pizza', component: Pizza },
  { name: 'cake', component: Cake },
  { name: 'wine', component: Wine },
  { name: 'utensils', component: Utensils },
  { name: 'apple', component: Apple },
  { name: 'cherry', component: Cherry },
  { name: 'iceCream', component: IceCream },
  
  // Transport
  { name: 'car', component: Car },
  { name: 'plane', component: Plane },
  { name: 'ship', component: Ship },
  { name: 'train', component: Train },
  { name: 'bike', component: Bike },
  { name: 'bus', component: Bus },
  
  // Animals
  { name: 'bird', component: Bird },
  { name: 'fish', component: Fish },
  { name: 'bug', component: Bug },
  { name: 'cat', component: Cat },
  { name: 'dog', component: Dog },
  
  // Misc
  { name: 'globe', component: Globe2 },
  { name: 'map', component: Map },
  { name: 'flag', component: Flag },
  { name: 'gift', component: Gift },
  { name: 'anchor', component: Anchor },
  { name: 'umbrella', component: Umbrella },
  { name: 'watch', component: Watch },
  { name: 'glasses', component: Glasses },
  { name: 'gamepad', component: Gamepad2 },
  { name: 'puzzle', component: Puzzle },
  { name: 'graduationCap', component: GraduationCap },
  { name: 'stethoscope', component: Stethoscope },
  { name: 'scale', component: Scale },
  { name: 'gavel', component: Gavel },
];

const colorPresets = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#14B8A6', '#6366F1', '#D946EF',
  '#0EA5E9', '#22C55E', '#A855F7', '#F43F5E'
];

export function BrandingSettings() {
  const { data: branding, isLoading: isBrandingLoading } = useBranding();
  const updateBranding = useUpdateBranding();
  const uploadFile = useUploadFile();
  const { data: imageFiles } = useFiles('all', 'images');

  const [appTitle, setAppTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [showFaviconGallery, setShowFaviconGallery] = useState(false);
  const [selectedFaviconColor, setSelectedFaviconColor] = useState('#3B82F6');

  const loginLogoRef = useRef<HTMLInputElement>(null);
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const miniLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding?.app_title) {
      setAppTitle(branding.app_title);
    }
  }, [branding?.app_title]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'login_logo_url' | 'main_logo_url' | 'mini_logo_url' | 'favicon_url'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingField(field);

    try {
      const uploadedFile = await uploadFile.mutateAsync({ file });
      const publicUrl = getFileUrl(uploadedFile.storage_path);

      await updateBranding.mutateAsync({ [field]: publicUrl });
      toast.success('Uploaded and saved successfully');
    } catch (error) {
      toast.error('Failed to upload', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    setUploadingField(null);
    event.target.value = '';
  };

  const handleSelectFromFiles = async (url: string, field: 'login_logo_url' | 'main_logo_url' | 'mini_logo_url' | 'favicon_url') => {
    try {
      await updateBranding.mutateAsync({ [field]: url });
      toast.success('Logo updated successfully');
      setPickerField(null);
    } catch (error) {
      toast.error('Failed to update', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleResetLogo = async (field: 'login_logo_url' | 'main_logo_url' | 'mini_logo_url' | 'favicon_url') => {
    try {
      await updateBranding.mutateAsync({ [field]: null });
      toast.success('Reset to default');
    } catch (error) {
      toast.error('Failed to reset', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSaveTitle = async () => {
    if (!appTitle.trim()) {
      toast.error('App title cannot be empty');
      return;
    }

    setIsSavingTitle(true);
    try {
      await updateBranding.mutateAsync({ app_title: appTitle.trim() });
      toast.success('App title updated');
    } catch (error) {
      toast.error('Failed to update title', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsSavingTitle(false);
  };

  const handleSelectFaviconFromGallery = async (IconComponent: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, iconName: string) => {
    try {
      setUploadingField('favicon_url');
      
      // Create a temporary container to render the icon
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Use ReactDOM to render the icon
      const ReactDOM = await import('react-dom/client');
      const root = ReactDOM.createRoot(tempDiv);
      
      // Render and wait for it to complete
      await new Promise<void>((resolve) => {
        root.render(<IconComponent style={{ color: selectedFaviconColor, width: 64, height: 64 }} />);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      
      // Get the rendered SVG element
      const renderedSvg = tempDiv.querySelector('svg');
      
      if (!renderedSvg) {
        root.unmount();
        document.body.removeChild(tempDiv);
        throw new Error('Failed to render icon');
      }
      
      // Clone the SVG and set proper attributes for canvas rendering
      const svgClone = renderedSvg.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', '64');
      svgClone.setAttribute('height', '64');
      svgClone.setAttribute('stroke', selectedFaviconColor);
      
      // Convert SVG to data URL
      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
      
      // Clean up React root
      root.unmount();
      document.body.removeChild(tempDiv);
      
      // Load SVG as image and draw to canvas, then upload blob to storage
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(img, 0, 0, 64, 64);
            }
            
            // Convert to blob and upload to Supabase Storage
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
            if (!blob) throw new Error('Failed to generate favicon image');
            
            const file = new File([blob], `favicon-${iconName}.png`, { type: 'image/png' });
            const uploadedFile = await uploadFile.mutateAsync({ file });
            const publicUrl = getFileUrl(uploadedFile.storage_path);
            
            await updateBranding.mutateAsync({ favicon_url: publicUrl });
            toast.success('Favicon updated from gallery');
            setShowFaviconGallery(false);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load icon image'));
        img.src = svgDataUrl;
      });
    } catch (error) {
      toast.error('Failed to update favicon', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploadingField(null);
    }
  };

  if (isBrandingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Login Logo */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Login Logo</CardTitle>
            </div>
            <CardDescription>Logo displayed on the login page. Recommended: 200×80px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed border-border min-h-[120px]">
              {branding?.login_logo_url ? (
                <img
                  src={branding.login_logo_url}
                  alt="Login Logo"
                  className="max-h-[80px] max-w-full object-contain"
                />
              ) : (
                <FortunLogo variant="login" />
              )}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <input
                ref={loginLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'login_logo_url')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => loginLogoRef.current?.click()}
                disabled={uploadingField === 'login_logo_url'}
              >
                {uploadingField === 'login_logo_url' ? (
                  <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="sm:mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Upload new logo</span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerField('login_logo_url')}
              >
                <Image className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Select from Files</span>
                <span className="sm:hidden">Select</span>
              </Button>
              {branding?.login_logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetLogo('login_logo_url')}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Main App Logo */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Main App Logo</CardTitle>
            </div>
            <CardDescription>Logo displayed in the sidebar. Recommended: 160×40px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed border-border min-h-[120px]">
              {branding?.main_logo_url ? (
                <img
                  src={branding.main_logo_url}
                  alt="Main Logo"
                  className="max-h-[60px] max-w-full object-contain"
                />
              ) : (
                <FortunLogo variant="full" />
              )}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <input
                ref={mainLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'main_logo_url')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => mainLogoRef.current?.click()}
                disabled={uploadingField === 'main_logo_url'}
              >
                {uploadingField === 'main_logo_url' ? (
                  <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="sm:mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Upload new logo</span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerField('main_logo_url')}
              >
                <Image className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Select from Files</span>
                <span className="sm:hidden">Select</span>
              </Button>
              {branding?.main_logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetLogo('main_logo_url')}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Collapsed Sidebar Logo */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PanelLeftClose className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Collapsed Sidebar Logo</CardTitle>
            </div>
            <CardDescription>Logo displayed when sidebar is collapsed. Recommended: 40×40px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed border-border min-h-[120px]">
              {branding?.mini_logo_url ? (
                <img
                  src={branding.mini_logo_url}
                  alt="Mini Logo"
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <FortunLogo variant="mini" />
              )}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <input
                ref={miniLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'mini_logo_url')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => miniLogoRef.current?.click()}
                disabled={uploadingField === 'mini_logo_url'}
              >
                {uploadingField === 'mini_logo_url' ? (
                  <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="sm:mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Upload new logo</span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerField('mini_logo_url')}
              >
                <Image className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Select from Files</span>
                <span className="sm:hidden">Select</span>
              </Button>
              {branding?.mini_logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetLogo('mini_logo_url')}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Favicon */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Favicon</CardTitle>
            </div>
            <CardDescription>Browser tab icon. Recommended: 32×32px or 64×64px</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed border-border min-h-[120px]">
              {branding?.favicon_url ? (
                <img
                  src={branding.favicon_url}
                  alt="Favicon"
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-16 w-16 bg-red-500/10 rounded-lg">
                  <Sparkles className="h-8 w-8 text-red-500" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <input
                ref={faviconRef}
                type="file"
                accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'favicon_url')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => faviconRef.current?.click()}
                disabled={uploadingField === 'favicon_url'}
              >
                {uploadingField === 'favicon_url' ? (
                  <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="sm:mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Upload favicon</span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickerField('favicon_url')}
              >
                <Image className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Select from Files</span>
                <span className="sm:hidden">Select</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFaviconGallery(true)}
              >
                <Palette className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
                <span className="sm:hidden">Gallery</span>
              </Button>
              {branding?.favicon_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetLogo('favicon_url')}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 5: App Title */}
        <Card className="border-border/50 shadow-sm md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">App Title</CardTitle>
            </div>
            <CardDescription>Browser tab and app title</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-title">Title</Label>
              <Input
                id="app-title"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                placeholder="Fortun Wishnet"
              />
            </div>
            <Button
              onClick={handleSaveTitle}
              disabled={isSavingTitle || appTitle === branding?.app_title}
            >
              {isSavingTitle ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Title
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Picker Dialog */}
      <Dialog open={!!pickerField} onOpenChange={() => setPickerField(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Image from Files Manager</DialogTitle>
            <DialogDescription>Choose an image from your uploaded files</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {imageFiles && imageFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {imageFiles.map((file) => {
                  const url = getFileUrl(file.storage_path);
                  return (
                    <button
                      key={file.id}
                      onClick={() =>
                        pickerField &&
                        handleSelectFromFiles(url, pickerField as 'login_logo_url' | 'main_logo_url' | 'mini_logo_url' | 'favicon_url')
                      }
                      className="aspect-square rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    >
                      <SecureImage
                        stored={file.storage_path}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Image className="h-12 w-12 mb-4 opacity-50" />
                <p>No images found in your files</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Favicon Gallery Dialog */}
      <Dialog open={showFaviconGallery} onOpenChange={setShowFaviconGallery}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a Favicon from Gallery</DialogTitle>
            <DialogDescription>Select an icon and customize its color</DialogDescription>
          </DialogHeader>
          
          {/* Color Picker Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <Label className="text-sm font-medium">Icon Color:</Label>
            <div className="flex gap-2 flex-wrap items-center">
              {colorPresets.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedFaviconColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    selectedFaviconColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <Input
                type="color"
                value={selectedFaviconColor}
                onChange={(e) => setSelectedFaviconColor(e.target.value)}
                className="w-10 h-8 p-0 border-border cursor-pointer"
              />
            </div>
          </div>
          
          {/* Favicon Icons Grid */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
              {faviconOptions.map((icon) => {
                const IconComponent = icon.component;
                return (
                  <button
                    key={icon.name}
                    onClick={() => handleSelectFaviconFromGallery(IconComponent, icon.name)}
                    disabled={uploadingField === 'favicon_url'}
                    className="aspect-square rounded-lg border border-border hover:ring-2 hover:ring-primary p-3 flex items-center justify-center transition-all hover:bg-muted/50"
                  >
                    <IconComponent className="h-6 w-6" style={{ color: selectedFaviconColor }} />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
