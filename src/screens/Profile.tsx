"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUploadAvatar } from '@/hooks/useUploadAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Upload, Camera, Mail, KeyRound, LogOut, AlertCircle } from 'lucide-react';
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

  const [pendingEmailChange, setPendingEmailChange] = useState(false);

  const uploadAvatar = useUploadAvatar();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), 'MMMM d, yyyy')
    : 'Unknown';

  // ─── Handlers ───────────────────────────────────────

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    setIsSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar.mutateAsync(file);
      setAvatarUrl(publicUrl);
    } catch {
      // Error toast handled by useUploadAvatar
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
    const trimmed = newEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      toast.error('Failed to update email', { description: error.message });
    } else {
      toast.success('Confirmation email sent', { description: 'Check your new email to confirm the change.' });
      setPendingEmailChange(true);
      setShowEmailDialog(false);
      setNewEmail('');
    }
    setIsUpdatingEmail(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
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
            role={role ?? ''}
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
              pendingEmailChange={pendingEmailChange}
              onEditName={() => setIsEditingName(true)}
              onCancelEditName={() => { setIsEditingName(false); setFullName(profile?.full_name || ''); }}
              onChangeNameValue={setFullName}
              onSaveName={handleSaveName}
              onEmailChange={() => setShowEmailDialog(true)}
            />
          </div>

          <div className="profile-glass-card rounded-2xl p-6 profile-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <ProfileSecurityCard
              role={role ?? ''}
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

      {/* ── Avatar Upload Dialog ── */}
      <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>Upload a new image for your profile</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isLoadingAvatar}
              />
              <div className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
                {isLoadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{isLoadingAvatar ? 'Uploading...' : 'Choose Image'}</span>
              </div>
            </label>
          </div>
          <p className="text-xs text-muted-foreground text-center">Recommended: square image, at least 200×200px</p>
        </DialogContent>
      </Dialog>

      {/* ── Email Change Dialog ── */}
      <Dialog open={showEmailDialog} onOpenChange={(open) => { setShowEmailDialog(open); if (!open) setNewEmail(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>A confirmation link will be sent to your new email address.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pendingEmailChange && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  A confirmation email was sent. Check your inbox to complete the change.
                </p>
              </div>
            )}
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
      <Dialog open={showPasswordDialog} onOpenChange={(open) => { setShowPasswordDialog(open); if (!open) { setNewPassword(''); setConfirmPassword(''); } }}>
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
