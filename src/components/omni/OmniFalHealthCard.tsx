"use client";

/**
 * OmniFalHealthCard: fal.ai engine status inside the Images hub.
 * Shows catalog availability (live vs fallback source, model count, key state)
 * and gives admins a one-click end-to-end test generation through the
 * fal queue API. This card doubles as the Phase 1 acceptance surface.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, CheckCircle2, ImageIcon, Loader2, RefreshCw, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFalCatalog, useFalCredits, useFalTestGenerate, type FalTestResult } from '@/hooks/omni';
import { formatUsd } from '@/config/falPricing';

export function OmniFalHealthCard() {
  const { isAdmin } = useAuth();
  const catalog = useFalCatalog({ capability: 'text-to-image', limit: 100 });
  // Live fal credit balance is admin-only org data — only fetch it for admins.
  const credits = useFalCredits(isAdmin);
  const testGenerate = useFalTestGenerate();
  const [testResult, setTestResult] = useState<FalTestResult | null>(null);
  const creditBalance = credits.data?.available && credits.data.balance != null ? credits.data.balance : null;
  const creditReason = credits.data?.reason;
  // fal serves the credit balance ONLY from /account/billing, which requires an
  // Admin-scope key (the inference key that works for generation is API-scope and
  // gets 403'd). Surface that as an actionable state, not a dead "N/A".
  const scopeBlocked = creditReason === 'http_401' || creditReason === 'http_403';
  const creditHint =
    creditReason === 'no_key' ? 'No fal API key is configured.'
    : scopeBlocked
      ? 'The fal key is API-scope; reading credits needs an Admin-scope key. Create one at fal.ai/dashboard/keys (scope: Admin) and save it in Settings → LLM Providers → fal.'
    : creditReason === 'unparsed' ? 'fal returned an unexpected billing format.'
    : creditReason === 'fetch_error' || creditReason === 'request_failed' ? 'Could not reach fal billing right now.'
    : 'Live fal credit balance is unavailable right now.';

  const handleTest = async () => {
    setTestResult(null);
    try {
      const result = await testGenerate.mutateAsync();
      setTestResult(result);
    } catch {
      // Sonner toast fired by the hook; keep the card in its idle state.
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      aria-label="fal.ai engine status"
      className="mx-auto mt-6 w-full max-w-3xl rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">fal.ai Engine</h2>
            {catalog.isLoading ? (
              <Skeleton className="mt-1 h-3.5 w-48" />
            ) : catalog.isError ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Catalog unavailable: {catalog.error instanceof Error ? catalog.error.message : 'unknown error'}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {catalog.data?.models.length ?? 0}
                {catalog.data?.hasMore ? '+' : ''} text-to-image models
                {!catalog.data?.falConfigured && ' · no API key set'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!catalog.isLoading && !catalog.isError && (
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                // Omni theming is page-local (data-omni-theme), so the contrast
                // variant keys off that attribute, not the global dark class.
                catalog.data?.source === 'live'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400',
              )}
            >
              {catalog.data?.source === 'live' ? 'Live catalog' : 'Fallback catalog'}
            </span>
          )}
          {isAdmin && !credits.isLoading && (
            creditBalance != null ? (
              <span
                aria-label={`Available fal credits: ${formatUsd(creditBalance)}`}
                className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 [[data-omni-theme=dark]_&]:text-emerald-400"
              >
                <Wallet className="h-3.5 w-3.5" />
                {formatUsd(creditBalance)} credits
              </span>
            ) : scopeBlocked ? (
              <span
                aria-label={creditHint}
                title={creditHint}
                className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 [[data-omni-theme=dark]_&]:text-amber-400"
              >
                <Wallet className="h-3.5 w-3.5" />
                Credits need Admin key
              </span>
            ) : (
              <span
                aria-label={creditHint}
                title={creditHint}
                className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                <Wallet className="h-3.5 w-3.5" />
                {credits.data?.configured ? 'Credits N/A' : 'No fal key'}
              </span>
            )
          )}
          {catalog.isError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => catalog.refetch()}
              className="cursor-pointer gap-1.5 transition-colors duration-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleTest}
              disabled={testGenerate.isPending}
              className="cursor-pointer gap-1.5 bg-gradient-to-r from-cyan-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
            >
              {testGenerate.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Run test generation
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {testGenerate.isPending && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
          <p className="text-xs text-muted-foreground">
            Submitting to the fal queue and polling for the result...
          </p>
        </div>
      )}

      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
        >
          {testResult.images[0] ? (
            // Plain img: fal CDN host is not in next/image config and this is a transient health check.
            <img
              src={testResult.images[0].url}
              alt="fal.ai test generation result"
              className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              End-to-end generation verified
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {testResult.model} · {(testResult.elapsed_ms / 1000).toFixed(1)}s through the fal queue API
            </p>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
