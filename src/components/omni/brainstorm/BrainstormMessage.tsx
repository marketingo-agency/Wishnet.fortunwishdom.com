"use client";

/**
 * One chat bubble. Assistant messages render plain conversational text
 * (the system prompt forbids markdown headers); user bubbles carry the
 * names of any images that were attached (bytes are never persisted).
 */

import { motion } from 'framer-motion';
import { ImageIcon, Orbit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OmniChatMessage } from '@/hooks/omni';

interface BrainstormMessageProps {
  message: OmniChatMessage;
}

export function BrainstormMessage({ message }: BrainstormMessageProps) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Orbit className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-amber-500 to-orange-600 text-white'
            : 'rounded-bl-md border border-border bg-card',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.attachment_names && message.attachment_names.length > 0 && (
          <div className={cn('mt-2 flex flex-wrap gap-1.5', isUser ? 'justify-end' : '')}>
            {message.attachment_names.map((name, i) => (
              <span
                key={`${name}-${i}`}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
                  isUser ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                <ImageIcon className="h-2.5 w-2.5" />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
