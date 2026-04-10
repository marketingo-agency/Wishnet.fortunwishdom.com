"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowRight, 
  Calendar,
  Rocket,
  Brain,
  Heart,
  Bot,
  FileText,
  LayoutGrid,
  Sparkles,
  Settings,
  Newspaper,
} from 'lucide-react';
import { AI_AGENTS } from '@/data/agents';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUserPermissions } from '@/hooks/useUserPermissions';
import { useBrainDocuments } from '@/hooks/useBrainDocuments';
import { useActiveRulesCount } from '@/hooks/useHeartRules';
import { useFilesCount } from '@/hooks/files/useFilesCount';
import { NAV_SECTIONS, TOOL_NAV_ITEMS, type NavSection } from '@/data/navigation';
import { mockPlannedReleases } from '@/components/release-notes/mockPlannedData';
import { mockReleaseUpdates } from '@/components/release-notes/mockData';

import { format } from 'date-fns';
import type { ToolKey } from '@/config/permissions';

/* ──────────────────────────────────────────────
   Gradient map for section brand colors
   ────────────────────────────────────────────── */
const SECTION_STYLES: Record<string, { gradient: string; glowBg: string; badgeBg: string; badgeText: string }> = {
  mastermind:   { gradient: 'from-purple-500 to-violet-600',   glowBg: 'bg-purple-500/15',   badgeBg: 'bg-purple-100 dark:bg-purple-900/40',   badgeText: 'text-purple-700 dark:text-purple-300' },
  ai_agents:    { gradient: 'from-cyan-500 to-blue-600',       glowBg: 'bg-cyan-500/15',     badgeBg: 'bg-cyan-100 dark:bg-cyan-900/40',       badgeText: 'text-cyan-700 dark:text-cyan-300' },
  marketing:    { gradient: 'from-rose-500 to-pink-600',       glowBg: 'bg-rose-500/15',     badgeBg: 'bg-rose-100 dark:bg-rose-900/40',       badgeText: 'text-rose-700 dark:text-rose-300' },
  wishdom:      { gradient: 'from-fuchsia-500 to-purple-600',  glowBg: 'bg-fuchsia-500/15',  badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', badgeText: 'text-fuchsia-700 dark:text-fuchsia-300' },
  
  // Tool nav items
  taskforce:    { gradient: 'from-orange-500 to-amber-600',    glowBg: 'bg-orange-500/15',   badgeBg: 'bg-orange-100 dark:bg-orange-900/40',   badgeText: 'text-orange-700 dark:text-orange-300' },
  files_manager:{ gradient: 'from-amber-500 to-yellow-600',    glowBg: 'bg-amber-500/15',    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',     badgeText: 'text-amber-700 dark:text-amber-300' },
};

const DEFAULT_STYLE = { gradient: 'from-slate-500 to-slate-600', glowBg: 'bg-slate-500/15', badgeBg: 'bg-slate-100 dark:bg-slate-900/40', badgeText: 'text-slate-700 dark:text-slate-300' };

/* ──────────────────────────────────────────────
   Stat card types & config
   ────────────────────────────────────────────── */
interface StatConfig {
  label: string;
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  link: string;
  permissionKey?: 'mastermind' | 'files_manager' | 'ai_agents';
}

const STAT_CONFIGS: StatConfig[] = [
  { label: 'Brain Documents', icon: Brain, gradient: 'from-purple-500 to-violet-600', glowColor: 'group-hover:shadow-purple-500/25', link: '/mastermind', permissionKey: 'mastermind' },
  { label: 'Heart Rules', icon: Heart, gradient: 'from-rose-500 to-pink-600', glowColor: 'group-hover:shadow-rose-500/25', link: '/mastermind/heart', permissionKey: 'mastermind' },
  { label: 'Files', icon: FileText, gradient: 'from-amber-500 to-yellow-600', glowColor: 'group-hover:shadow-amber-500/25', link: '/files', permissionKey: 'files_manager' },
  { label: 'Active AI Agents', icon: Bot, gradient: 'from-cyan-500 to-blue-600', glowColor: 'group-hover:shadow-cyan-500/25', link: '/ai-agents', permissionKey: 'ai_agents' },
];

/* ──────────────────────────────────────────────
   Stat Card
   ────────────────────────────────────────────── */
function StatCard({ config, value, isLoading }: { config: StatConfig; value: number; isLoading: boolean }) {
  const router = useRouter();
  const Icon = config.icon;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => router.push(config.link)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(config.link); } }}
      aria-label={`${config.label}: ${isLoading ? 'loading' : value}. Click to view.`}
      className={`group relative cursor-pointer overflow-hidden border-border/40 bg-card hover:shadow-xl ${config.glowColor} transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
    >
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-12 mb-1" />
              <Skeleton className="h-3.5 w-20" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold tracking-tight text-foreground leading-none mb-0.5">{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{config.label}</p>
            </>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   Section Card
   ────────────────────────────────────────────── */
interface SectionCardProps {
  id: string;
  title: string;
  icon: React.ElementType;
  defaultUrl: string;
  items: { title: string; url: string; icon: React.ElementType; iconColor: string }[];
  isComingSoon: boolean;
  toolKey: ToolKey;
}

function SectionCard({ id, title, icon: SectionIcon, defaultUrl, items, isComingSoon, toolKey }: SectionCardProps) {
  const style = SECTION_STYLES[toolKey] || SECTION_STYLES[id] || DEFAULT_STYLE;
  // Filter out the "hub" entry (first item that matches the section root)
  const subItems = items.filter((_, i) => i > 0).slice(0, 5);

  return (
    <Card className="group relative overflow-hidden border-border/40 bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Glow background */}
      <div className={`absolute inset-0 ${style.glowBg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg shrink-0`}>
            <SectionIcon className="h-6 w-6 text-white" />
          </div>
          {isComingSoon && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/60 text-muted-foreground border-border/60 shrink-0">
              Coming Soon
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg mt-3">{title}</CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 pt-0 space-y-4">
        {/* Sub-items */}
        {subItems.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subItems.map((item) => (
              <Badge
                key={item.url}
                variant="outline"
                className={`text-xs border-border/50 ${style.badgeBg} ${style.badgeText} transition-colors`}
              >
                <item.icon className="h-3 w-3 mr-1" />
                {item.title}
              </Badge>
            ))}
          </div>
        )}

        {/* Action */}
        {isComingSoon ? (
          <p className="text-xs text-muted-foreground italic">Available soon</p>
        ) : (
          <Button asChild variant="ghost" className="p-0 h-auto text-primary hover:text-primary/80 group/btn">
            <Link href={defaultUrl} className="flex items-center gap-1">
              Open
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   Dashboard
   ────────────────────────────────────────────── */
export default function Dashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');
  const featuredUpdate = mockReleaseUpdates.find(update => update.isFeatured);
  const { hasAccess, isLoading: permissionsLoading } = useCurrentUserPermissions();

  // Data queries for stat cards
  const { data: brainDocs, isLoading: brainLoading } = useBrainDocuments();
  const { data: heartCount, isLoading: heartLoading } = useActiveRulesCount();
  const { data: filesCount, isLoading: filesLoading } = useFilesCount();

  const statValues: number[] = [brainDocs?.length ?? 0, heartCount ?? 0, filesCount ?? 0, 4];
  const statLoading = [brainLoading, heartLoading, filesLoading, false];

  const visibleStats = STAT_CONFIGS.map((cfg, i) => ({ cfg, value: statValues[i], loading: statLoading[i] }))
    .filter(({ cfg }) => !cfg.permissionKey || hasAccess(cfg.permissionKey));

  // Build platform sections from NAV_SECTIONS + TOOL_NAV_ITEMS
  const allSections: SectionCardProps[] = [
    ...NAV_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      defaultUrl: s.defaultUrl,
      items: s.items,
      isComingSoon: isFullyComingSoon(s),
      toolKey: s.toolKey,
    })),
    ...TOOL_NAV_ITEMS.map((t) => ({
      id: t.toolKey,
      title: t.item.title,
      icon: t.item.icon,
      defaultUrl: t.item.url,
      items: [],
      isComingSoon: isToolComingSoon(t.toolKey),
      toolKey: t.toolKey,
    })),
  ];

  const visibleSections = allSections.filter((s) => hasAccess(s.toolKey));

  // Roadmap data
  const inProgressRelease = mockPlannedReleases.find(r => r.status === 'in-progress');
  

  return (
    <div className="flex-1 h-full p-4 md:p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Welcome Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 wp-animate-in">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {profile?.full_name || 'User'}
            </h1>
            <p className="text-sm text-muted-foreground">Your Fortun Wishnet command center</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            {currentDate}
          </p>
        </div>

        {/* ── Quick Stats Row ── */}
        {visibleStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 wp-animate-in" style={{ animationDelay: '0.05s' }}>
            {visibleStats.map(({ cfg, value, loading }) => (
              <StatCard key={cfg.label} config={cfg} value={value} isLoading={loading} />
            ))}
          </div>
        )}

        {/* ── AI Agents Spotlight ── */}
        {permissionsLoading ? (
          <div className="space-y-4 wp-animate-in" style={{ animationDelay: '0.1s' }}>
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : hasAccess('ai_agents') ? (
          <div className="space-y-4 wp-animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">AI Agents</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {AI_AGENTS.map((agent) => {
                const Icon = agent.icon;
                const isComingSoon = agent.status === 'coming_soon';

                return (
                  <Card
                    key={agent.id}
                    className={`group relative overflow-hidden border-border/40 transition-all duration-300 ${
                      isComingSoon
                        ? 'bg-muted/30 opacity-60'
                        : 'bg-card hover:shadow-xl hover:-translate-y-1 cursor-pointer'
                    }`}
                    onClick={() => !isComingSoon && router.push(agent.path)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 ${!isComingSoon ? 'group-hover:opacity-100' : ''} transition-opacity duration-300`} />
                    <CardContent className="relative z-10 flex flex-col items-center text-center gap-2 p-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center shadow-lg ${isComingSoon ? 'grayscale' : ''}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{agent.role}</p>
                      </div>
                      {isComingSoon && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border/60">
                          Soon
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── What's New (compact) ── */}
        {featuredUpdate && (
          <Card className="group relative overflow-hidden border-border/40 bg-card hover:shadow-lg transition-all duration-300 wp-animate-in" style={{ animationDelay: '0.15s' }}>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-medium text-primary">What's New</p>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{featuredUpdate.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{featuredUpdate.description}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href="/release-notes" className="flex items-center gap-1.5">
                  View Updates
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Platform Sections Grid ── */}
        {permissionsLoading ? (
          <div className="space-y-4 wp-animate-in" style={{ animationDelay: '0.2s' }}>
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ) : visibleSections.length > 0 ? (
          <div className="space-y-4 wp-animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Platform</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSections.map((section) => (
                <SectionCard key={section.id} {...section} />
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Roadmap Compact + Footer Shortcuts ── */}
        <div className="grid gap-4 md:grid-cols-2 wp-animate-in" style={{ animationDelay: '0.25s' }}>
          {/* Roadmap card */}
          {inProgressRelease && (
            <Card className="group relative overflow-hidden border-border/40 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => router.push('/release-notes')}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Roadmap</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    {inProgressRelease.targetDate}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{inProgressRelease.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{inProgressRelease.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {inProgressRelease.features.slice(0, 3).map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                  {inProgressRelease.features.length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">+{inProgressRelease.features.length - 3}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick links */}
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Quick Links</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Settings', icon: Settings, path: '/settings' },
                  { label: 'Release Notes', icon: Newspaper, path: '/release-notes' },
                  { label: 'Roadmap', icon: Rocket, path: '/release-notes' },
                  { label: 'AI Agents', icon: Bot, path: '/ai-agents' },
                ].map((link) => (
                  <Button
                    key={link.label}
                    asChild
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-9 text-xs"
                  >
                    <Link href={link.path}>
                      <link.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {link.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Helpers — determine "coming soon" status
   ────────────────────────────────────────────── */
import {
  MASTERMIND_ROUTES,
  MARKETING_ROUTES,
  WISHDOM_ROUTES,
  OTHER_ROUTES,
  AI_AGENT_ROUTES,
} from '@/routes/routeConfig';

const ROUTE_MAP: Record<string, typeof MASTERMIND_ROUTES> = {
  mastermind: MASTERMIND_ROUTES,
  ai_agents: AI_AGENT_ROUTES,
  marketing: MARKETING_ROUTES,
  wishdom: WISHDOM_ROUTES,
};

function isFullyComingSoon(section: NavSection): boolean {
  const routes = ROUTE_MAP[section.id];
  if (!routes) return false;
  return routes.every(r => r.isComingSoon === true);
}

function isToolComingSoon(toolKey: ToolKey): boolean {
  const route = OTHER_ROUTES.find(r => r.toolKey === toolKey);
  return route?.isComingSoon === true;
}
