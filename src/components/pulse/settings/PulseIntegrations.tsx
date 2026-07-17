"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plug } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePulseConnectionsStatus } from '@/hooks/usePulseConnections';
import { PulseConnectionRow, type ConnectionField } from './PulseConnectionRow';
import type { PulseConnectionProvider } from '@/types/pulse';

interface ProviderConfig {
  provider: PulseConnectionProvider;
  name: string;
  accent: string;
  note: string;
  fields: ConnectionField[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'meta',
    name: 'Meta (Facebook + Instagram)',
    accent: 'bg-blue-600',
    note: 'Powers cross-platform comments & DMs. Pages connect via OAuth in the Engagement phase.',
    fields: [
      { key: 'metaAppId', label: 'App ID', secret: false, placeholder: '1234567890' },
      { key: 'metaAppSecret', label: 'App Secret', secret: true, placeholder: 'app secret' },
    ],
  },
  {
    provider: 'canva',
    name: 'Canva',
    accent: 'bg-cyan-500',
    note: 'Auto-resize designs per platform. Connects via OAuth from the Composer.',
    fields: [{ key: 'apiKey', label: 'Client Secret', secret: true, placeholder: 'client secret' }],
  },
];

export function PulseIntegrations() {
  const { isAdmin } = useAuth();
  const { data: status } = usePulseConnectionsStatus(isAdmin === true);

  if (!isAdmin) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm">Integrations</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Connect the services Pulse orchestrates. Keys are stored server-side and never sent to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {PROVIDERS.map((p) => (
          <PulseConnectionRow
            key={p.provider}
            provider={p.provider}
            name={p.name}
            accent={p.accent}
            note={p.note}
            fields={p.fields}
            status={status?.[p.provider]}
          />
        ))}
      </CardContent>
    </Card>
  );
}
