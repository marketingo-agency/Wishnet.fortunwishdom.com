"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Radio, CheckCircle2, XCircle, Globe, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiKeyEditor } from './ApiKeyEditor';
import { PulseQueueSettings } from './PulseQueueSettings';
import { PulseConnectedProfiles } from './PulseConnectedProfiles';
import { useProviderKeyStatus, hasProviderKey } from '@/hooks/useProviderKeyStatus';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePulseTestConnection,
  usePulsePlatforms,
  type PulseConnectionStatus,
} from '@/hooks/usePulseSettings';

export function PulseSettings() {
  const { isAdmin } = useAuth();
  const { data: keyStatus } = useProviderKeyStatus();
  const pulseKeySource = keyStatus?.pulse ?? 'none';
  const isKeyConfigured = hasProviderKey(pulseKeySource);

  const [connectionStatus, setConnectionStatus] = useState<PulseConnectionStatus | null>(null);
  const testConnection = usePulseTestConnection();

  const isConnected = connectionStatus?.connected === true;

  const { data: platforms, isLoading: loadingPlatforms } = usePulsePlatforms(isConnected);

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      setConnectionStatus(result);
    } catch {
      setConnectionStatus({ connected: false, error: 'Connection test failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* API Connection Card */}
      <Card className="border-2 border-rose-500/20 shadow-md shadow-rose-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
                <Radio className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">upload-post.com</CardTitle>
                <CardDescription>Social media scheduling & posting API</CardDescription>
              </div>
            </div>
            <Badge
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 border-0',
                isConnected
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : isKeyConfigured
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {isConnected ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
              ) : isKeyConfigured ? (
                <><Wifi className="h-3 w-3 mr-1" /> Key Set</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key Editor */}
          <ApiKeyEditor
            provider="pulse"
            keySource={pulseKeySource}
            isAdmin={isAdmin ?? false}
          />

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!isKeyConfigured || testConnection.isPending}
              className="gap-2"
            >
              {testConnection.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              Test Connection
            </Button>
            {connectionStatus && (
              <span className={cn(
                'text-xs',
                connectionStatus.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
              )}>
                {connectionStatus.connected
                  ? `Connected — ${connectionStatus.plan ?? 'Unknown'} plan (${connectionStatus.email ?? ''})`
                  : connectionStatus.error ?? 'Connection failed'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connected Profiles (pictures, handles, per-platform analytics) */}
      <PulseConnectedProfiles enabled={isConnected} />

      {/* Connected Platforms */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-sm">Platform Pages</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Facebook Pages, LinkedIn Organizations, and Pinterest Boards connected to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Connect to view platform pages.
            </p>
          ) : loadingPlatforms ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : platforms ? (
            <div className="space-y-3">
              {/* Facebook Pages */}
              {platforms.facebook && platforms.facebook.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Facebook Pages</p>
                  {platforms.facebook.map((page, i) => (
                    <div key={page.id ?? i} className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 mb-1">
                      <span className="text-xs">{page.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* LinkedIn Orgs */}
              {platforms.linkedin && platforms.linkedin.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">LinkedIn Organizations</p>
                  {platforms.linkedin.map((org, i) => (
                    <div key={org.id ?? i} className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 mb-1">
                      <span className="text-xs">{org.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pinterest Boards */}
              {platforms.pinterest && platforms.pinterest.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Pinterest Boards</p>
                  {platforms.pinterest.map((board, i) => (
                    <div key={board.id ?? i} className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 mb-1">
                      <span className="text-xs">{board.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!platforms.facebook || platforms.facebook.length === 0) &&
               (!platforms.linkedin || platforms.linkedin.length === 0) &&
               (!platforms.pinterest || platforms.pinterest.length === 0) && (
                <p className="text-xs text-muted-foreground py-2 text-center">No platform pages found.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No platform data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Posting Schedule (queue settings) */}
      <PulseQueueSettings enabled={isConnected} />

      {/* API Info */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-sm">API Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground mb-1">Auth Method</p>
              <p className="font-medium">Apikey Header</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground mb-1">Base URL</p>
              <p className="font-medium font-mono text-[11px]">api.upload-post.com</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground mb-1">Supported Platforms</p>
              <p className="font-medium">11 platforms</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-muted-foreground mb-1">Key Storage</p>
              <p className="font-medium">Server-side only</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
