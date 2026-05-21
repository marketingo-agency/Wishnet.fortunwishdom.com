import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Save, Loader2, X, Clock } from 'lucide-react';

interface ProfileInfoCardProps {
  fullName: string | null | undefined;
  email: string | null | undefined;
  isEditingName: boolean;
  editNameValue: string;
  isSavingName: boolean;
  pendingEmailChange?: boolean;
  onEditName: () => void;
  onCancelEditName: () => void;
  onChangeNameValue: (value: string) => void;
  onSaveName: () => void;
  onEmailChange: () => void;
}

export default function ProfileInfoCard({
  fullName,
  email,
  isEditingName,
  editNameValue,
  isSavingName,
  pendingEmailChange,
  onEditName,
  onCancelEditName,
  onChangeNameValue,
  onSaveName,
  onEmailChange,
}: ProfileInfoCardProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Account</h2>
      </div>

      {/* Full Name */}
      <div className="rounded-xl bg-muted/20 p-4 transition-colors duration-200 hover:bg-muted/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <label htmlFor="profile-full-name" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Full Name
              </label>
              {isEditingName ? (
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="profile-full-name"
                    value={editNameValue}
                    onChange={(e) => onChangeNameValue(e.target.value)}
                    placeholder="Your full name"
                    className="flex-1 h-8 bg-background/80 border-primary/20 focus-visible:ring-primary/30 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
                  />
                  <Button
                    size="sm"
                    onClick={onSaveName}
                    disabled={isSavingName || editNameValue === fullName}
                    className="h-8 shrink-0"
                  >
                    {isSavingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelEditName} className="h-8 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground truncate">{fullName || '—'}</p>
              )}
            </div>
          </div>
          {!isEditingName && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditName}
              className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7 px-3 rounded-lg shrink-0"
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="rounded-xl bg-muted/20 p-4 transition-colors duration-200 hover:bg-muted/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </span>
              <p className="text-sm font-medium text-foreground truncate">{email || '—'}</p>
              {pendingEmailChange && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Change pending — check your inbox</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEmailChange}
            className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7 px-3 rounded-lg shrink-0"
          >
            Change
          </Button>
        </div>
      </div>
    </div>
  );
}
