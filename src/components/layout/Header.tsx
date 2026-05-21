"use client";

import React from 'react';
import { LogOut, Settings, User, Home, Moon, Sun } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { SidebarTrigger } from '@/components/ui/sidebar';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
  '/files': 'Files Manager',
  '/release-notes': 'Release Notes',
  '/profile': 'My Profile',
  // AI Agents
  '/ai-agents': 'AI Agents',
  '/ai-agents/nexus': 'Nexus',
  '/ai-agents/promptor': 'Promptor',
  '/ai-agents/osha': 'Osha',
  '/ai-agents/whisper': 'Whisper',
  '/ai-agents/pulse': 'Pulse',
  '/ai-agents/pixel': 'Pixel',
  '/ai-agents/muse': 'Muse',
  '/ai-agents/atlas': 'ATLAS',
  // MasterMind
  '/mastermind': 'MasterMind',
  '/mastermind/brain': 'Brain Knowledge',
  '/mastermind/heart': 'Heart Rules',
  '/mastermind/wishpedia': 'Wishpedia',
  '/mastermind/vector-store': 'Vector Store',
  // Marketing Hub
  '/marketing': 'Marketing Hub',
  '/marketing/plan': 'Marketing Plan',
  '/marketing/operations': 'Operations',
  // Wishdom
  '/wishdom': 'Wishdom',
  '/wishdom/plushes': 'Plushes',
  '/wishdom/figurines': 'Figurines',
  '/wishdom/cards': 'Cards',
  '/wishdom/stocks': 'Stocks',
  // Taskforce
  '/taskforce': 'Taskforce',
};

function formatSlugToName(slug: string): string {
  // Convert double-dashes to em-dash placeholder, then single dashes to spaces
  return slug
    .replace(/--/g, ' — ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [];
  
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Detect dynamic Wishpedia entry slug (pattern: /mastermind/wishpedia/:slug)
    const isWishpediaEntry = i === 2 && segments[0] === 'mastermind' && segments[1] === 'wishpedia';
    const label = isWishpediaEntry
      ? formatSlugToName(segment)
      : routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  }
  
  return breadcrumbs;
}

export function Header() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname() ?? '/';
  const breadcrumbs = getBreadcrumbs(pathname);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-14 sm:h-16 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50 shadow-sm">
      {/* Left section with mobile trigger and breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="md:hidden h-9 w-9 shrink-0" aria-label="Toggle sidebar menu" />
        
        {/* Mobile: Show current page title only */}
        <span className="sm:hidden text-sm font-medium text-foreground truncate">
          {breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'}
        </span>
        
        {/* Desktop: Full breadcrumbs */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Home className="h-4 w-4" />
                  <span className="hidden md:inline">Home</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.slice(-2).map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === breadcrumbs.slice(-2).length - 1 ? (
                    <BreadcrumbPage className="max-w-[150px] md:max-w-none truncate">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.path} className="max-w-[100px] md:max-w-none truncate">{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="User menu" className="relative h-10 w-10 rounded-xl hover:bg-muted transition-all duration-200">
              <Avatar className="h-9 w-9 ring-2 ring-border ring-offset-2 ring-offset-card">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl shadow-lg border-border/50" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-3">
              <p className="text-sm font-semibold leading-none">{profile?.full_name || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer rounded-lg mx-1 my-0.5">
              <User className="mr-2 h-4 w-4 text-cyan-500" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings?tab=account')} className="cursor-pointer rounded-lg mx-1 my-0.5">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="cursor-pointer rounded-lg mx-1 my-0.5">
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4 text-amber-500" /> : <Moon className="mr-2 h-4 w-4 text-indigo-500" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg mx-1 my-0.5 text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
