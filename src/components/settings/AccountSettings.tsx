import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFiles, getFileUrl, useUploadFile } from '@/hooks/useFiles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Loader2, Save, User, Mail, Lock, Camera, Upload, Check, ImageIcon, X, Shield } from 'lucide-react';
import { toast } from 'sonner';

export function AccountSettings() {
  const { profile, role, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Dialog states
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Fetch user's image files for avatar picker
  const { data: imageFiles, isLoading: isLoadingImages } = useFiles('all', 'images');
  const uploadFile = useUploadFile();

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
      toast.success('Name updated successfully');
      await refreshProfile();
    }
    setIsSavingName(false);
  };

  const handleSelectAvatar = async (url: string) => {
    if (!user) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update avatar', { description: error.message });
    } else {
      setAvatarUrl(url);
      toast.success('Avatar updated successfully');
      await refreshProfile();
    }
    setIsLoading(false);
    setShowAvatarPicker(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);

    try {
      // Use the existing upload hook which registers in files table
      const uploadedFile = await uploadFile.mutateAsync({ file });
      
      // Get the public URL from the uploaded file
      const publicUrl = getFileUrl(uploadedFile.storage_path);
      
      // Update profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toast.error('Failed to update avatar', { description: updateError.message });
      } else {
        setAvatarUrl(publicUrl);
        toast.success('Avatar updated successfully');
        await refreshProfile();
      }
    } catch (error) {
      toast.error('Failed to upload avatar', { 
        description: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    setIsLoading(false);
    setShowAvatarPicker(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to remove avatar', { description: error.message });
    } else {
      setAvatarUrl('');
      toast.success('Profile picture removed');
      await refreshProfile();
    }
    setIsLoading(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsUpdatingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      toast.error('Failed to update email', { description: error.message });
    } else {
      toast.success('Confirmation email sent', { 
        description: 'Please check your new email address to confirm the change.' 
      });
      setShowEmailDialog(false);
      setNewEmail('');
    }
    setIsUpdatingEmail(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

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

  return (
    <div className="space-y-6">
      {/* 2x2 Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Profile Overview */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Your profile information</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Avatar with change and remove buttons */}
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-muted shadow-lg">
                <AvatarImage src={avatarUrl || undefined} alt={fullName || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-semibold">
                  {getInitials(fullName || profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {/* UI-13: small corner button so the initials avatar stays visible
                  (was a full-cover overlay that hid the avatar on mobile, looking broken) */}
              <button
                onClick={() => setShowAvatarPicker(true)}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full shadow-md ring-2 ring-card hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                disabled={isLoading}
              >
                <Camera className="h-4 w-4" />
              </button>
              {/* Red X button to remove avatar */}
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive/90 shadow-md"
                  disabled={isLoading}
                  title="Remove profile picture"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{profile?.full_name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <Badge 
                variant="secondary" 
                className={`mt-2 ${
                  role === 'admin'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}
              >
                {role === 'admin' ? (
                  <Shield className="h-3 w-3 mr-1" />
                ) : (
                  <User className="h-3 w-3 mr-1" />
                )}
                {role || 'agent'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Personal Information */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </div>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="flex gap-2">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveName} 
                  disabled={isSavingName || fullName === profile?.full_name}
                  className="shrink-0"
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Save</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Email Address */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Email Address</CardTitle>
            </div>
            <CardDescription>Manage your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
            <Button onClick={() => setShowEmailDialog(true)} variant="outline" className="w-full">
              Change Email Address
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Password */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Password</CardTitle>
            </div>
            <CardDescription>Manage your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current password</p>
              <p className="font-medium">••••••••••</p>
            </div>
            <Button onClick={() => setShowPasswordDialog(true)} variant="outline" className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Avatar Picker Dialog */}
      <Dialog open={showAvatarPicker} onOpenChange={setShowAvatarPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>
              Select an image from your files or upload a new one
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload button */}
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload New Image</span>
                </div>
              </label>
            </div>

            <div className="border-t border-border my-4" />

            {/* Image grid */}
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
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:opacity-80 ${
                            isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent'
                          }`}
                          disabled={isLoading}
                        >
                          <Image
                            src={url}
                            alt={file.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
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

      {/* Email Change Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              A confirmation link will be sent to your new email address.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input
                id="currentEmail"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
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
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailChange} disabled={isUpdatingEmail || !newEmail.trim()}>
              {isUpdatingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Confirmation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your new password below. Must be at least 6 characters.
            </DialogDescription>
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
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange} 
              disabled={isUpdatingPassword || !newPassword || newPassword !== confirmPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
