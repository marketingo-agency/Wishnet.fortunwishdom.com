"use client";

import { PulseSettings } from '@/components/settings/PulseSettings';
import { PulseIntegrations } from './PulseIntegrations';
import { PulseReplyModel } from './PulseReplyModel';
import { PulseAutomation } from './PulseAutomation';

/**
 * Pulse workspace Settings tab.
 * Composes the upload-post core (connection, profiles, platform pages, posting
 * schedule) with the broader integrations and AI-reply configuration.
 */
export function PulseSettingsTab() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PulseSettings />
      <PulseIntegrations />
      <PulseReplyModel />
      <PulseAutomation />
    </div>
  );
}
