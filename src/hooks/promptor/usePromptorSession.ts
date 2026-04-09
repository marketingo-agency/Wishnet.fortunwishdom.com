import { useState } from 'react';
import type { PromptorOutput, OutputType } from './types';

const SESSION_KEY = 'promptor_session';

interface CreateSession {
  outputType: OutputType;
  blueprint: string;
  brief: string;
  output: PromptorOutput | null;
}

interface OptimizeSession {
  outputType: OutputType;
  blueprint: string;
  existingPrompt: string;
  context: string;
  output: PromptorOutput | null;
}

export interface PromptorSession {
  create: CreateSession;
  optimize: OptimizeSession;
}

const DEFAULT_SESSION: PromptorSession = {
  create: {
    outputType: 'text',
    blueprint: 'general',
    brief: '',
    output: null,
  },
  optimize: {
    outputType: 'text',
    blueprint: 'general',
    existingPrompt: '',
    context: '',
    output: null,
  },
};

function loadSession(): PromptorSession {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_SESSION;
    const parsed = JSON.parse(raw);
    return {
      create: { ...DEFAULT_SESSION.create, ...parsed.create },
      optimize: { ...DEFAULT_SESSION.optimize, ...parsed.optimize },
    };
  } catch {
    return DEFAULT_SESSION;
  }
}

function saveSession(s: PromptorSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // sessionStorage unavailable — fail silently
  }
}

export function usePromptorSession() {
  const [session, setSession] = useState<PromptorSession>(loadSession);

  const updateCreate = (patch: Partial<CreateSession>) => {
    setSession((prev) => {
      const next = { ...prev, create: { ...prev.create, ...patch } };
      saveSession(next);
      return next;
    });
  };

  const updateOptimize = (patch: Partial<OptimizeSession>) => {
    setSession((prev) => {
      const next = { ...prev, optimize: { ...prev.optimize, ...patch } };
      saveSession(next);
      return next;
    });
  };

  return { session, updateCreate, updateOptimize };
}
