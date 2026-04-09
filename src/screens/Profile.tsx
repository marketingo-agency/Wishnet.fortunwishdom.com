import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFiles, getFileUrl, useUploadFile } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, Check, ImageIcon, Camera, Mail, KeyRound, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ProfileHero, ProfileInfoCard, ProfileSecurityCard } from '@/components/profile';

export default function Profile() {
  const { profile, role, user, refreshProfile, signOut } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { data: imageFiles, isLoading: isLoadingImages } = useFiles('all', 'images');
  const uploadFile = useUploadFile();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), 'MMMM d, yyyy')
    : 'Unknown';

  const lastSignIn = user?.last_sign_in_at
    ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy · h:mm a')
    : 'Never';

  // ─── Handlers ───────────────────────────────────────

  const handleSaveName = async () => {
    if (!user) return;
    setIsSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (error) {
      toast.error('Failed to update name', { description: error.message });
    } else {
      toast.success('Name updated');
      await refreshProfile();
      setIsEditingName(false);
    }
    setIsSavingName(false);
  };

  const handleSelectAvatar = async (url: string) => {
    if (!user) return;
    setIsLoadingAvatar(true);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id);
    if (error) {
      toast.error('Failed to update avatar');
    } else {
      setAvatarUrl(url);
      toast.success('Avatar updated');
      await refreshProfile();
    }
    setIsLoadingAvatar(false);
    setShowAvatarPicker(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsLoadingAvatar(true);
    try {
      const uploadedFile = await uploadFile.mutateAsync({ file });
      const publicUrl = getFileUrl(uploadedFile.storage_path);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (error) throw error;
      setAvatarUrl(publicUrl);
      toast.success('Avatar updated');
      await refreshProfile();
    } catch (error) {
      toast.error('Failed to upload avatar', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setIsLoadingAvatar(false);
    setShowAvatarPicker(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsLoadingAvatar(true);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);
    if (error) {
      toast.error('Failed to remove avatar');
    } else {
      setAvatarUrl('');
      toast.success('Profile picture removed');
      await refreshProfile();
    }
    setIsLoadingAvatar(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) { toast.error('Please enter a valid email'); return; }
    setIsUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      toast.error('Failed to update email', { description: error.message });
    } else {
      toast.success('Confirmation email sent', { description: 'Check your new email to confirm the change.' });
      setShowEmailDialog(false);
      setNewEmail('');
    }
    setIsUpdatingEmail(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error('Failed to update password', { description: error.message });
    } else {
      toast.success('Password updated successfully');
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="min-h-full profile-page-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">
        {/* Hero */}
        <div className="profile-fade-in-up" style={{ animationDelay: '0s' }}>
          <ProfileHero
            fullName={profile?.full_name}
            email={profile?.email}
            role={role}
            avatarUrl={avatarUrl}
            isLoadingAvatar={isLoadingAvatar}
            joinDate={joinDate}
            onAvatarClick={() => setShowAvatarPicker(true)}
            onRemoveAvatar={handleRemoveAvatar}
            onEditProfile={() => setIsEditingName(true)}
          />
        </div>

        {/* Two-column grid: Account + Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="profile-glass-card rounded-2xl p-6 profile-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <ProfileInfoCard
              fullName={profile?.full_name}
              email={profile?.email}
              isEditingName={isEditingName}
              editNameValue={fullName}
              isSavingName={isSavingName}
              onEditName={() => setIsEditingName(true)}
              onCancelEditName={() => { setIsEditingName(false); setFullName(profile?.full_name || ''); }}
              onChangeNameValue={setFullName}
              onSaveName={handleSaveName}
              onEmailChange={() => setShowEmailDialog(true)}
            />
          </div>

          <div className="profile-glass-card rounded-2xl p-6 profile-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <ProfileSecurityCard
              role={role}
              onPasswordChange={() => setShowPasswordDialog(true)}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="profile-glass-card rounded-2xl p-5 profile-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAvatarPicker(true)}
              className="gap-2 text-xs"
            >
              <Camera className="h-3.5 w-3.5" />
              Change Avatar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailDialog(true)}
              className="gap-2 text-xs"
            >
              <Mail className="h-3.5 w-3.5" />
              Change Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
              className="gap-2 text-xs"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 ml-auto"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* ── Avatar Picker Dialog ── */}
      <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>Select an image from your files or upload a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isLoadingAvatar}
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  {isLoadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <span>Upload New Image</span>
                </div>
              </label>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-2">Or select from your files:</p>
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : imageFiles && imageFiles.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imageFiles.map((file) => {
                      const url = getFileUrl(file.storage_path);
                      const isSelected = avatarUrl === url;
                      return (
                        <button
                          key={file.id}
                          onClick={() => handleSelectAvatar(url)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-80 cursor-pointer ${
                            isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'
                          }`}
                          disabled={isLoadingAvatar}
                        >
                          <img src={url} alt={file.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p className="text-sm">No images in your files</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Email Change Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>A confirmation link will be sent to your new email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input id="currentEmail" type="email" value={profile?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleEmailChange} disabled={isUpdatingEmail || !newEmail.trim()}>
              {isUpdatingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Confirmation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Password Change Dialog ── */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handlePasswordChange} disabled={isUpdatingPassword || !newPassword || !confirmPassword}>
              {isUpdatingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
