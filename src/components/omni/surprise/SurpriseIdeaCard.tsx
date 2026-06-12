"use client";

/**
 * One mined creation idea: title, pitch, the ready-to-use creative brief,
 * its knowledge grounding, and the CTA into the Omni Images wizard.
 */

import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { SurpriseIdea } from '@/hooks/omni';

interface SurpriseIdeaCardProps {
  idea: SurpriseIdea;
  index: number;
  isStarting: boolean;
  onUse: () => void;
}

export function SurpriseIdeaCard({ idea, index, isStarting, onUse }: SurpriseIdeaCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.06 }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-shadow duration-200 hover:shadow-md"
    >
      <div>
        <h3 className="text-sm font-semibold">{idea.title}</h3>
        {idea.summary && <p className="mt-1 text-xs text-muted-foreground">{idea.summary}</p>}
      </div>

      <p className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-2.5 text-xs leading-relaxed">
        {idea.objective}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3">
        {idea.grounding ? (
          <p className="flex items-start gap-1 text-[10px] text-muted-foreground">
            <BookOpen className="mt-px h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{idea.grounding}</span>
          </p>
        ) : <span />}
        <Button
          size="sm"
          onClick={onUse}
          disabled={isStarting}
          className="h-8 shrink-0 cursor-pointer gap-1.5 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white transition-all duration-300 hover:opacity-90"
        >
          {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          Create this
        </Button>
      </div>
    </motion.article>
  );
}
