/**
 * ApiKeyEditor — admin-only in-UI editor for provider API keys.
 *
 * Reusable across OpenAI, Gemini, and fal.ai (Task 10) cards.
 * Renders nothing if `isAdmin` is false.
 *
 * Contract:
 *   - The key value is ONLY held in component-local React state while editing.
 *     It's cleared synchronously as the save mutation fires (not after resolve),
 *     so the value never lingers in any form, cache, or storage.
 *   - The input is type="password" with autoComplete="new-password" to defeat
 *     browser autofill.
 *   - Save routes through useUpdateProviderKey → settings-keys edge fn.
 *   - Reset only renders when keySource === 'db' and calls useResetProviderKey.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Key, Loader2, Pencil, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUpdateProviderKey, useResetProviderKey, type ProviderKeyProvider } from '@/hooks/useProviderKeyActions';
import type { KeySource } from '@/hooks/useProviderKeyStatus';

interface ApiKeyEditorProps {
  provider: ProviderKeyProvider;
  keySource: KeySource;
  isAdmin: boolean;
}

const PROVIDER_LABEL: Record<ProviderKeyProvider, string> = {
  openai: 'OpenAI API Key',
  gemini: 'Google Gemini API Key',
  fal: 'fal.ai API Key',
  pulse: 'upload-post.com API Key',
};

const PROVIDER_PLACEHOLDER: Record<ProviderKeyProvider, string> = {
  openai: 'sk-...',
  gemini: 'AI...',
  fal: 'fal-key...',
  pulse: 'Your API key',
};

function statusBadgeProps(keySource: KeySource): { label: string; className: string } {
  switch (keySource) {
    case 'db':
      return {
        label: 'Key configured in app settings',
        className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      };
    case 'env':
      return {
        label: 'Using environment secret',
        className: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      };
    case 'none':
    default:
      return {
        label: 'Not configured',
        className: 'bg-muted text-muted-foreground border-border',
      };
  }
}

export function ApiKeyEditor({ provider, keySource, isAdmin }: ApiKeyEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [showValue, setShowValue] = useState(false);

  const updateMutation = useUpdateProviderKey();
  const resetMutation = useResetProviderKey();

  if (!isAdmin) return null;

  const isBusy = updateMutation.isPending || resetMutation.isPending;
  const label = PROVIDER_LABEL[provider];
  const status = statusBadgeProps(keySource);

  const handleCancel = () => {
    setKeyInput('');
    setShowValue(false);
    setIsEditing(false);
  };

  const handleSave = (e?: FormEvent) => {
    e?.preventDefault();
    const value = keyInput.trim();
    if (!value) {
      toast.error('Enter a key value before saving.');
      return;
    }
    // Fire and clear the local state immediately so the key never lingers in React state
    // after the network call is in flight. The mutation captures `value` in its closure.
    updateMutation.mutate(
      { provider, key: value },
      {
        onSuccess: () => {
          toast.success(`${label} saved.`);
          setIsEditing(false);
          setShowValue(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to save key');
        },
      },
    );
    setKeyInput('');
    setShowValue(false);
  };

  const handleReset = () => {
    resetMutation.mutate(
      { provider },
      {
        onSuccess: () => {
          toast.success(`${label} reset to environment secret.`);
          setIsEditing(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to reset key');
        },
      },
    );
  };

  const inputId = `api-key-${provider}`;

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Key className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-2">
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">
            New key value
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={inputId}
              type={showValue ? 'text' : 'password'}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={PROVIDER_PLACEHOLDER[provider]}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              disabled={isBusy}
              aria-label={`New ${label}`}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowValue((v) => !v)}
              disabled={isBusy}
              title={showValue ? 'Hide' : 'Reveal'}
              aria-label={showValue ? 'Hide key' : 'Reveal key'}
              className="h-9 w-9 shrink-0"
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isBusy}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isBusy || !keyInput.trim()}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-end gap-2">
          {keySource === 'db' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isBusy}
              title="Revert to the Supabase environment secret"
            >
              {resetMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Reset to env secret
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isBusy}
          >
            <Pencil className="h-4 w-4 mr-1" />
            {keySource === 'none' ? 'Set key' : 'Edit key'}
          </Button>
        </div>
      )}
    </div>
  );
}
