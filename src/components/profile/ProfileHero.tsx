import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, User, Camera, X, Pencil, Calendar } from 'lucide-react';

interface ProfileHeroProps {
  fullName: string | null | undefined;
  email: string | null | undefined;
  role: string;
  avatarUrl: string;
  isLoadingAvatar: boolean;
  joinDate: string;
  onAvatarClick: () => void;
  onRemoveAvatar: () => void;
  onEditProfile: () => void;
}

export default function ProfileHero({
  fullName,
  email,
  role,
  avatarUrl,
  isLoadingAvatar,
  joinDate,
  onAvatarClick,
  onRemoveAvatar,
  onEditProfile,
}: ProfileHeroProps) {
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="profile-glass-card rounded-2xl p-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative group shrink-0">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
          <Avatar className="relative h-24 w-24 ring-2 ring-border/60 shadow-xl transition-transform duration-500 group-hover:scale-[1.03]">
            <AvatarImage src={avatarUrl || undefined} alt={fullName || 'User'} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl font-bold">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={onAvatarClick}
            className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer z-10"
          >
            <Camera className="h-5 w-5 text-white drop-shadow-lg" />
          </button>
          {avatarUrl && (
            <button
              onClick={onRemoveAvatar}
              className="absolute -top-1 -right-1 z-20 flex items-center justify-center w-6 h-6 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer hover:bg-destructive/90 shadow-lg hover:scale-110"
              disabled={isLoadingAvatar}
              title="Remove profile picture"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground tracking-tight truncate">
                {fullName || 'Unnamed User'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  className={`text-[11px] font-semibold px-2.5 py-0.5 border-0 ${
                    role === 'admin'
                      ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 dark:from-amber-900/60 dark:to-amber-800/40 dark:text-amber-300'
                      : 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary dark:from-primary/30 dark:to-primary/15'
                  }`}
                >
                  {role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                  {role === 'admin' ? 'Administrator' : 'Agent'}
                </Badge>
                <span className="text-muted-foreground text-sm truncate">{email}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">Member since {joinDate}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditProfile}
              className="text-xs text-muted-foreground hover:text-primary shrink-0"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
