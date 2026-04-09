import { FileText } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableDocumentCard } from './SortableDocumentCard';
import type { BrainDocument } from '@/types/brain';

interface DocumentGridProps {
  documents: BrainDocument[];
  isLoading?: boolean;
  onViewDocument?: (doc: BrainDocument) => void;
  onEditDocument?: (doc: BrainDocument) => void;
  onDeleteDocument?: (doc: BrainDocument) => void;
  onReorder?: (reorderedDocs: BrainDocument[]) => void;
  searchQuery?: string;
  activeCategory?: string;
  categoryName?: string;
}

export function DocumentGrid({ 
  documents, 
  isLoading, 
  onViewDocument, 
  onEditDocument, 
  onDeleteDocument,
  onReorder,
  searchQuery,
  activeCategory,
  categoryName,
}: DocumentGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 8 } 
    }),
    useSensor(KeyboardSensor, { 
      coordinateGetter: sortableKeyboardCoordinates 
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = documents.findIndex(d => d.id === active.id);
      const newIndex = documents.findIndex(d => d.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedDocs = arrayMove(documents, oldIndex, newIndex);
        onReorder?.(reorderedDocs);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-muted rounded-lg animate-pulse h-40" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    const isSearching = !!searchQuery;
    const isFiltered = activeCategory && activeCategory !== 'all';
    const title = isSearching
      ? 'No matching documents'
      : isFiltered
        ? `No ${categoryName || activeCategory} documents`
        : 'No documents yet';
    const description = isSearching
      ? 'Try adjusting your search query or clearing filters.'
      : isFiltered
        ? `No documents in this category yet. Upload one to get started.`
        : 'Upload documents to build your knowledge base. Supported formats include PDF, DOC, XLSX, images, and more.';

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground/70" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md">{description}</p>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={documents.map(d => d.id)} 
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {documents.map((doc) => (
            <SortableDocumentCard
              key={doc.id}
              document={doc}
              onView={onViewDocument}
              onEdit={onEditDocument}
              onDelete={onDeleteDocument}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
