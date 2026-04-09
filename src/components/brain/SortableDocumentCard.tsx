import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import type { BrainDocument } from '@/types/brain';
import { cn } from '@/lib/utils';

interface SortableDocumentCardProps {
  document: BrainDocument;
  onView?: (doc: BrainDocument) => void;
  onEdit?: (doc: BrainDocument) => void;
  onDelete?: (doc: BrainDocument) => void;
}

export function SortableDocumentCard({ document, onView, onEdit, onDelete }: SortableDocumentCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle positioned at top-left */}
      <div 
        {...attributes} 
        {...listeners}
        className={cn(
          "absolute top-3 left-3 z-30 p-1 rounded cursor-grab active:cursor-grabbing",
          "bg-card/80 backdrop-blur-sm shadow-sm border border-border",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "hover:bg-muted/50"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70" />
      </div>
      <DocumentCard 
        document={document} 
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
