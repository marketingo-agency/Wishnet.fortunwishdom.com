"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Sentry Test Page</h1>
        <p className="text-sm text-muted-foreground">
          Click the button below to trigger a test error. If Sentry is configured
          correctly, the error will appear in your Sentry dashboard.
        </p>
        <button
          type="button"
          className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
          onClick={() => {
            Sentry.captureException(new Error("Sentry test error from Fortun Wishnet"));
          }}
        >
          Trigger Test Error
        </button>
      </div>
    </div>
  );
}
