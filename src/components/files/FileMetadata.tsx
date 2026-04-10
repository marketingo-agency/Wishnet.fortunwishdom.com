import { useState } from 'react';
import { X, Edit2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { type FileRecord } from '@/hooks/useFiles';
import { formatFileSize, getFileTypeLabel } from '@/lib/fileTypes';

interface FileTag {
  id: string;
  name: string;
  color: string;
}

const tagColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

interface FileMetadataProps {
  file: FileRecord;
  tags: FileTag[];
  isBrainDocument: boolean;
  name: string;
  description: string;
  isEditingName: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSaveName: () => void;
  onSaveDescription: () => void;
  onStartEditingName: () => void;
  onAddTag: (name: string, color: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function FileMetadata({
  file,
  tags,
  isBrainDocument,
  name,
  description,
  isEditingName,
  onNameChange,
  onDescriptionChange,
  onSaveName,
  onSaveDescription,
  onStartEditingName,
  onAddTag,
  onRemoveTag,
}: FileMetadataProps) {
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)].value;
      onAddTag(newTagName.trim(), randomColor);
      setNewTagName('');
      setShowTagInput(false);
    }
  };

  return (
    <>
      {/* Filename */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Filename
        </label>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <Input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onSaveName}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
              className="text-sm"
              autoFocus
            />
          ) : (
            <>
              <span className="text-sm font-medium text-foreground truncate flex-1">
                {file.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/70"
                onClick={onStartEditingName}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onBlur={onSaveDescription}
          placeholder="Add a description..."
          className="text-sm resize-none"
          rows={3}
        />
      </div>

      {/* Tags - hidden for brain documents (FK constraint) */}
      {!isBrainDocument && (
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.name}
                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {showTagInput ? (
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onBlur={() => {
                  if (newTagName.trim()) handleAddTag();
                  else setShowTagInput(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
                placeholder="Tag name..."
                className="h-6 w-24 text-xs"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium"
              >
                <Plus className="h-3 w-3" /> ADD
              </button>
            )}
          </div>
        </div>
      )}

      {/* File Details */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Details
        </label>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between min-w-0">
            <span className="text-muted-foreground shrink-0">Type</span>
            <span className="text-foreground font-medium text-right truncate ml-2">{getFileTypeLabel(file.mime_type, file.name)}</span>
          </div>
          <div className="flex justify-between min-w-0">
            <span className="text-muted-foreground shrink-0">Size</span>
            <span className="text-foreground font-medium text-right ml-2">{formatFileSize(file.size)}</span>
          </div>
          <div className="flex justify-between min-w-0">
            <span className="text-muted-foreground shrink-0">Uploaded</span>
            <span className="text-foreground font-medium text-right ml-2">
              {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
