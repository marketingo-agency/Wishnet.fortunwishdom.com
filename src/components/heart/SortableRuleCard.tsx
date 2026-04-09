import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { HeartRule } from '@/types/brain';
import type { ReactNode } from 'react';

interface SortableRuleCardProps {
  rule: HeartRule;
  children: ReactNode;
  disabled?: boolean;
}

export function SortableRuleCard({ rule, children, disabled }: SortableRuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative group/sortable"
    >
      {/* Dedicated drag handle */}
      {!disabled && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute top-3 left-3 z-10 w-6 h-6 rounded flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/sortable:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-card/80 hover:bg-card shadow-sm border border-border"
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70" />
        </button>
      )}
      {children}
    </div>
  );
}
