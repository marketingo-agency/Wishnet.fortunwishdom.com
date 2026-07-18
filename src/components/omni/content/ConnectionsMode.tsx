"use client";

/**
 * Content hub - Connections: the Metricool integration that powers the
 * Publishing Desk's auto-publish lane. The client's social accounts are
 * connected INSIDE Metricool (it owns the platform OAuth + does the actual
 * posting); here we store the API token server-side, pick the brand, and show
 * per-network connection health. The token is write-only: it never comes back.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Plug, RefreshCw, Unplug, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useDisconnectMetricool, useMetricoolBrands, useMetricoolStatus, useSaveMetricoolBrand, useSaveMetricoolToken,
} from '@/hooks/omni/useContentDesk';
import { DESK_NETWORKS } from './contentConstants';

interface ConnectionsModeProps {
  onBack: () => void;
}

export function ConnectionsMode({ onBack }: ConnectionsModeProps) {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const status = useMetricoolStatus();
  const saveToken = useSaveMetricoolToken();
  const saveBrand = useSaveMetricoolBrand();
  const disconnect = useDisconnectMetricool();

  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [mcUserId, setMcUserId] = useState('');
  const [pickingBrand, setPickingBrand] = useState(false);

  const configured = status.data?.configured === true;
  const brands = useMetricoolBrands(configured && (pickingBrand || status.data?.brand_selected !== true));

  const handleConnect = () => {
    saveToken.mutate(
      { token: token.trim(), metricool_user_id: mcUserId.trim() },
      {
        onSuccess: (res) => {
          setToken('');
          // save-token already fetched the brands to validate the token -
          // seed the cache so the picker doesn't ask Metricool twice.
          queryClient.setQueryData(['metricool-brands'], { brands: res.brands });
          setPickingBrand(true);
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-6 sm:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto w-full max-w-2xl"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4 -ml-2 cursor-pointer gap-1.5 text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Content hub
        </Button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          <span className="bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent [[data-omni-theme=dark]_&]:from-fuchsia-400 [[data-omni-theme=dark]_&]:to-pink-500">Connections</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Metricool once and approved posts publish themselves. Your social accounts stay connected inside
          Metricool - it does the actual posting.
        </p>

        <div className="mt-6 space-y-4">
          {status.isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : !configured ? (
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50">
                  <Plug className="h-[18px] w-[18px] text-fuchsia-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Connect Metricool</p>
                  <p className="text-xs text-muted-foreground">Needs the Advanced (or Custom) plan. Token + user id live in Metricool under Account Settings, API.</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-token">API access token</Label>
                <div className="relative">
                  <Input
                    id="mc-token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste the Metricool API token"
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    aria-label={showToken ? 'Hide the token' : 'Show the token'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-user">Metricool user id</Label>
                <Input
                  id="mc-user"
                  value={mcUserId}
                  onChange={(e) => setMcUserId(e.target.value.replace(/\D/g, ''))}
                  placeholder="The numeric userId from your Metricool account"
                  inputMode="numeric"
                  className="w-full sm:w-[260px]"
                />
              </div>
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={!token.trim() || !mcUserId.trim() || saveToken.isPending}
                className="h-8 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-pink-600 text-xs text-white transition-all duration-300 hover:opacity-90"
              >
                {saveToken.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                {saveToken.isPending ? 'Verifying with Metricool…' : 'Connect'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                The token is stored server-side only - it is never sent back to the browser.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold">Metricool connected</p>
                    <p className="text-xs text-muted-foreground">
                      {status.data?.brand_selected
                        ? <>Brand: <span className="font-medium text-foreground">{status.data.brand_label}</span>{status.data.brand_timezone ? ` · ${status.data.brand_timezone}` : ''}</>
                        : 'Pick the brand to publish through.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPickingBrand(true)} className="h-8 cursor-pointer gap-1.5 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" /> {status.data?.brand_selected ? 'Change brand' : 'Pick brand'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 cursor-pointer gap-1.5 text-xs text-destructive hover:text-destructive">
                        <Unplug className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Metricool?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Auto-publish stops working until a token is connected again. Posts already scheduled inside
                          Metricool stay scheduled there.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnect.mutate()}
                          className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {(pickingBrand || !status.data?.brand_selected) && (
                <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Choose the brand</p>
                  {brands.isLoading ? (
                    <Skeleton className="h-16 rounded-lg" />
                  ) : brands.isError ? (
                    <p className="text-xs text-destructive">{brands.error instanceof Error ? brands.error.message : 'Could not load the brands'}</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(brands.data?.brands ?? []).map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => saveBrand.mutate(String(b.id), { onSuccess: () => setPickingBrand(false) })}
                          disabled={saveBrand.isPending}
                          className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/20 p-2.5 text-left transition-colors duration-200 hover:border-fuchsia-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {b.picture ? (
                            <img src={b.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10 text-xs font-bold text-fuchsia-500">
                              {b.label.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{b.label}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              {Object.keys(b.networks).length} network{Object.keys(b.networks).length === 1 ? '' : 's'} connected
                            </span>
                          </span>
                        </button>
                      ))}
                      {(brands.data?.brands ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground">No brands found on this Metricool account.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {status.data?.brand_selected && (
                <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Network health</p>
                  <p className="text-xs text-muted-foreground">
                    Connected networks auto-publish; the rest fall back to the manual Publish Queue. Connect or fix
                    networks inside the Metricool dashboard.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {DESK_NETWORKS.filter((n) => n.id !== 'other').map((n) => {
                      const Icon = n.icon;
                      const handle = status.data?.networks?.[n.id];
                      return (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2',
                            handle ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border bg-muted/20',
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', n.accent)} />
                            {n.label}
                            {handle && <span className="truncate text-[10px] font-normal text-muted-foreground">· {handle}</span>}
                          </span>
                          {handle ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label={`${n.label} connected`} />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-label={`${n.label} not connected`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
