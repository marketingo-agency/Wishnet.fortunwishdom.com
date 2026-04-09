import React from 'react';
import { cn } from '@/lib/utils';
import { Ban, Eye, Edit, Shield } from 'lucide-react';
import type { PermissionLevel } from '@/types/user';

interface PermissionLevelSelectorProps {
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
  disabled?: boolean;
}

const levels: { value: PermissionLevel; label: string; icon: React.ElementType; description: string }[] = [
  { 
    value: 'none', 
    label: 'None', 
    icon: Ban,
    description: 'No access'
  },
  { 
    value: 'view', 
    label: 'View', 
    icon: Eye,
    description: 'Read only'
  },
  { 
    value: 'limited', 
    label: 'Limited', 
    icon: Edit,
    description: 'Own content'
  },
  { 
    value: 'full', 
    label: 'Full', 
    icon: Shield,
    description: 'Full access'
  },
];

const levelStyles: Record<PermissionLevel, { active: string; inactive: string }> = {
  none: {
    active: 'bg-muted-foreground text-white border-muted-foreground',
    inactive: 'text-muted-foreground hover:bg-muted dark:hover:bg-card',
  },
  view: {
    active: 'bg-blue-500 text-white border-blue-500',
    inactive: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950',
  },
  limited: {
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950',
  },
  full: {
    active: 'bg-emerald-500 text-white border-emerald-500',
    inactive: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950',
  },
};

export function PermissionLevelSelector({ value, onChange, disabled }: PermissionLevelSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
      {levels.map((level) => {
        const Icon = level.icon;
        const isActive = value === level.value;
        const styles = levelStyles[level.value];
        
        return (
          <button
            key={level.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level.value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border border-transparent',
              isActive ? styles.active : styles.inactive,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={level.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{level.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PermissionBadge({ level }: { level: PermissionLevel }) {
  const config = levels.find(l => l.value === level);
  if (!config) return null;
  
  const Icon = config.icon;
  
  const badgeStyles: Record<PermissionLevel, string> = {
    none: 'bg-muted text-muted-foreground dark:bg-card dark:text-muted-foreground/70',
    view: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    limited: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    full: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      badgeStyles[level]
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
