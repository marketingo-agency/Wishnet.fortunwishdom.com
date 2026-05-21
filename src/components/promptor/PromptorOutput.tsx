import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Brain,
  Heart,
  Sparkles,
  ClipboardList,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PromptorOutput as PromptorOutputType } from '@/hooks/usePromptor';

interface PromptorOutputProps {
  output: PromptorOutputType;
  showComplianceNotes?: boolean;
  showQA?: boolean;
  showNegatives?: boolean;
  showShortPrompt?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-xs text-muted-foreground/70 hover:text-foreground/80 hover:bg-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

const complianceConfig = {
  pass: {
    icon: CheckCircle2,
    label: 'Compliant',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  adjusted: {
    icon: AlertTriangle,
    label: 'Adjusted',
    className: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  refused: {
    icon: XCircle,
    label: 'Refused — Safe Alternative Provided',
    className: 'text-rose-700 bg-rose-50 border-rose-200',
  },
};

export function PromptorOutput({
  output,
  showComplianceNotes = true,
  showQA = false,
  showNegatives = true,
  showShortPrompt = true,
}: PromptorOutputProps) {
  const [variantsOpen, setVariantsOpen] = useState(false);
  const compliance = complianceConfig[output.compliance_status] || complianceConfig.pass;
  const ComplianceIcon = compliance.icon;

  return (
    <div className="space-y-4">
      {/* Compliance + retrieval meta header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 bg-muted/50 rounded-xl border border-border/50">
        <div className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium', compliance.className)}>
          <ComplianceIcon className="h-4 w-4" />
          <span>{compliance.label}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            <span>{output.retrieval_meta.heart_chunks} Heart rules<span className="hidden sm:inline"> applied</span></span>
          </div>
          <div className="flex items-center gap-1">
            <Brain className="h-3.5 w-3.5 text-indigo-400" />
            <span>{output.retrieval_meta.brain_chunks} Brain chunks<span className="hidden sm:inline"> used</span></span>
          </div>
        </div>
      </div>

      {/* Brief summary */}
      {output.brief_summary && (
        <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3">
          <Sparkles className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/80">{output.brief_summary}</p>
        </div>
      )}

      {/* Compliance notes */}
      {showComplianceNotes && output.compliance_notes && output.compliance_status !== 'pass' && (
        <div className={cn(
          'flex items-start gap-2.5 rounded-xl border px-4 py-3',
          output.compliance_status === 'refused' ? 'border-rose-100 bg-rose-50/60' : 'border-amber-100 bg-amber-50/60'
        )}>
          <Shield className="h-4 w-4 text-muted-foreground/70 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Heart Compliance Note</p>
            <p className="text-sm text-foreground/80">{output.compliance_notes}</p>
          </div>
        </div>
      )}

      {/* Short prompt */}
      {showShortPrompt && output.final_prompt_short && (
        <Card className="border-border shadow-none">
          <CardHeader className="py-3 px-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-violet-200" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Short Prompt</CardTitle>
              </div>
              <CopyButton text={output.final_prompt_short} />
            </div>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-sm text-foreground/80 leading-relaxed font-mono bg-muted/50 rounded-lg p-3 whitespace-pre-wrap overflow-x-auto border border-border/50">
              {output.final_prompt_short}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Full prompt */}
      {output.final_prompt_full && (
        <Card className="border-violet-100 bg-violet-50/30 shadow-none">
          <CardHeader className="py-3 px-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-violet-500" />
                <CardTitle className="text-sm font-semibold text-foreground">Full Prompt</CardTitle>
              </div>
              <CopyButton text={output.final_prompt_full} />
            </div>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-sm text-foreground/80 leading-relaxed font-mono bg-card rounded-lg p-3 whitespace-pre-wrap overflow-x-auto border border-violet-100">
              {output.final_prompt_full}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Variants */}
      {output.variants && output.variants.length > 0 && (
        <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between border-border hover:border-violet-300 hover:bg-violet-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Variants</span>
                <Badge variant="secondary" className="bg-violet-100 text-violet-600 text-xs rounded-full px-2">
                  {output.variants.length}
                </Badge>
              </div>
              {variantsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground/70" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/70" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {output.variants.map((variant, i) => (
              <Card key={i} className="border-border/50 shadow-none">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground/70 mb-1.5">Variant {i + 1}</p>
                      <p className="text-sm text-foreground/80 font-mono bg-muted/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed border border-border/50">
                        {variant}
                      </p>
                    </div>
                    <CopyButton text={variant} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Negatives */}
      {showNegatives && output.negatives && (
        <Card className="border-border/50 shadow-none">
          <CardHeader className="py-3 px-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-muted-foreground/30" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Negatives / Exclusions</CardTitle>
              </div>
              <CopyButton text={output.negatives} />
            </div>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-sm text-foreground/80 font-mono bg-muted/50 rounded-lg p-3 whitespace-pre-wrap border border-border/50">
              {output.negatives}
            </p>
          </CardContent>
        </Card>
      )}

      {/* QA Checklist */}
      {showQA && output.qa_checklist && output.qa_checklist.length > 0 && (
        <Card className="border-border/50 shadow-none">
          <CardHeader className="py-3 px-4 pb-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4 text-muted-foreground/70" />
              QA Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="space-y-2">
              {output.qa_checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
