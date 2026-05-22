"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePulseAccounts, type PulseAccount } from '@/hooks/usePulseSettings';
import { platformLabel, platformColor, initials, formatDate } from './pulsePlatforms';
import { PulseProfileDialog } from './PulseProfileDialog';

interface PulseConnectedProfilesProps {
  enabled: boolean;
}

export function PulseConnectedProfiles({ enabled }: PulseConnectedProfilesProps) {
  const { data: accounts, isLoading } = usePulseAccounts(enabled);
  const [selected, setSelected] = useState<PulseAccount | null>(null);

  const hasProfiles = Array.isArray(accounts) && accounts.length > 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm">Connected Profiles</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Social media profiles managed through upload-post.com — pictures, handles, and per-platform analytics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!enabled ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Connect your API key and test the connection to view profiles.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : hasProfiles ? (
          <div className="space-y-3">
            {accounts.map((profile, i) => {
              const connected = profile.accounts ?? [];
              const created = formatDate(profile.createdAt);
              return (
                <div key={profile.username ?? i} className="rounded-xl border bg-muted/20 p-3">
                  {/* Profile header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{profile.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {connected.length} {connected.length === 1 ? 'account' : 'accounts'}
                        {created ? ` · created ${created}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(profile)}
                      className="h-8 shrink-0 gap-1.5 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" /> View details
                    </Button>
                  </div>

                  {/* Per-platform accounts */}
                  {connected.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      {connected.map((acc) => {
                        const name = acc.displayName || acc.handle || acc.platform;
                        const Avatars = (
                          <Avatar className="h-9 w-9 shrink-0">
                            {acc.image && <AvatarImage src={acc.image} alt={name} />}
                            <AvatarFallback className="text-[10px]">{initials(name)}</AvatarFallback>
                          </Avatar>
                        );
                        return (
                          <div key={acc.platform} className="flex items-center gap-2.5 rounded-lg bg-background/60 px-2.5 py-1.5">
                            {acc.image ? (
                              <a
                                href={acc.image}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${platformLabel(acc.platform)} profile picture in a new tab`}
                                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                              >
                                {Avatars}
                              </a>
                            ) : (
                              Avatars
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{name}</p>
                              {acc.handle && <p className="truncate text-[10px] text-muted-foreground">@{acc.handle}</p>}
                            </div>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', platformColor(acc.platform))}>
                              {platformLabel(acc.platform)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">No social accounts linked to this profile yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No profiles found. Connect accounts in your upload-post.com dashboard.
          </p>
        )}
      </CardContent>

      <PulseProfileDialog
        profile={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </Card>
  );
}
