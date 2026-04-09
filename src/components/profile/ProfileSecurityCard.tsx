import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, KeyRound, Shield, User, CheckCircle2 } from 'lucide-react';

interface ProfileSecurityCardProps {
  role: string;
  onPasswordChange: () => void;
}

export default function ProfileSecurityCard({ role, onPasswordChange }: ProfileSecurityCardProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Security</h2>
      </div>

      {/* Password */}
      <div className="rounded-xl bg-muted/20 p-4 transition-colors duration-200 hover:bg-muted/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex gap-0.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  ))}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Secure</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPasswordChange}
            className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7 px-3 rounded-lg shrink-0"
          >
            Change
          </Button>
        </div>
      </div>


      {/* Role */}
      <div className="rounded-xl bg-muted/20 p-4 transition-colors duration-200 hover:bg-muted/40">
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Role
            </label>
            <div className="flex items-center gap-2 mt-1">
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
              <span className="text-xs text-muted-foreground">
                {role === 'admin' ? 'Full platform access' : 'Configured permissions'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
