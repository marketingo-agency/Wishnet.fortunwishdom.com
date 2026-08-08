"use client";

/**
 * Top bar for the One-Screen Preview: mobile menu trigger + context title on
 * the left; theme toggle, settings shortcut, and the real user's avatar menu
 * on the right. Menu links navigate to the REAL pages (Sam's ruling); Sign
 * out is deliberately disabled so a demo click cannot end the session.
 *
 * The dropdown renders in a portal (outside the data-preview-theme scope), so
 * its surface receives conditional classes from the live theme state.
 */
import Link from 'next/link';
import {
  Brain,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Settings,
  Sun,
  User,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PT } from './previewTokens';

interface PreviewTopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  title: string;
  onOpenMobileRail: () => void;
}

const MENU_LINKS = [
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Users', href: '/settings?tab=users', icon: UsersRound },
  { label: 'Files Manager', href: '/files', icon: FolderOpen },
  { label: 'MasterMind', href: '/mastermind', icon: Brain },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Release Notes', href: '/release-notes', icon: Newspaper },
];

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

const TopAction = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none',
      PT.ghostBtn,
      PT.focusRing,
    )}
  >
    {children}
  </button>
);

export const PreviewTopBar = ({ theme, onToggleTheme, title, onOpenMobileRail }: PreviewTopBarProps) => {
  const { profile } = useAuth();

  const menuSurface =
    theme === 'dark'
      ? 'w-64 border-white/10 bg-zinc-900 text-zinc-100'
      : 'w-64 border-zinc-200 bg-white text-zinc-900';
  const menuItem =
    theme === 'dark'
      ? 'cursor-pointer gap-2.5 focus:bg-white/10 focus:text-zinc-100'
      : 'cursor-pointer gap-2.5 focus:bg-zinc-100 focus:text-zinc-900';

  return (
    <header className={cn('flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4', PT.topbar)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="md:hidden">
          <TopAction label="Open menu" onClick={onOpenMobileRail}>
            <Menu className="h-4 w-4" />
          </TopAction>
        </span>
        <h1 className="truncate text-sm font-semibold tracking-wide">{title}</h1>
        <span
          className={cn(
            'hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-block',
            'border-cyan-400/40 text-cyan-300 [[data-preview-theme=light]_&]:border-cyan-600/40 [[data-preview-theme=light]_&]:text-cyan-700',
          )}
        >
          Preview
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <TopAction label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </TopAction>
        <Link
          href="/settings"
          aria-label="Open Settings"
          title="Open Settings"
          className={cn(
            'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none',
            PT.ghostBtn,
            PT.focusRing,
          )}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open account menu"
              className={cn('ml-1 cursor-pointer rounded-full transition-transform duration-200 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100', PT.focusRing)}
            >
              <Avatar className="h-9 w-9 border border-white/20 [[data-preview-theme=light]_&]:border-zinc-300">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-600 text-xs font-semibold text-white">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={menuSurface}>
            <DropdownMenuLabel>
              <p className="text-sm font-semibold leading-tight">{profile?.full_name || 'User'}</p>
              <p className={cn('mt-0.5 truncate text-xs font-normal', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {profile?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className={theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200'} />
            {MENU_LINKS.map(({ label, href, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild className={menuItem}>
                <Link href={href}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className={theme === 'dark' ? 'bg-white/10' : 'bg-zinc-200'} />
            <DropdownMenuItem
              disabled
              title="Disabled in the preview"
              className="gap-2.5 opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out (disabled in preview)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
