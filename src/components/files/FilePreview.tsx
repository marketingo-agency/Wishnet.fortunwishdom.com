"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  isImage: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  onPreviewClick: () => void;
}

export function FilePreview({
  fileUrl,
  fileName,
  isImage,
  icon: Icon,
  iconColor,
  iconBg,
  onPreviewClick,
}: FilePreviewProps) {
  const [errored, setErrored] = useState(false);
  // FileInspector is not remounted per file, so reset the error when the URL
  // changes — otherwise one failed preview would icon-fallback every later file.
  useEffect(() => setErrored(false), [fileUrl]);
  // Show the image only once a (signed) URL is resolved and it loads; otherwise
  // fall back to the type icon (covers resolving state + missing/orphaned files).
  const showImage = isImage && !!fileUrl && !errored;
  return (
    <div
      className="relative group aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
      onClick={onPreviewClick}
    >
      {showImage ? (
        <Image src={fileUrl} alt={fileName} fill className="object-cover bg-card" unoptimized onError={() => setErrored(true)} />
      ) : (
        <div className={cn('w-full h-full flex items-center justify-center', iconBg)}>
          <Icon className={cn('h-16 w-16', iconColor)} strokeWidth={1.5} />
        </div>
      )}
      {/* Eye icon overlay - appears on hover */}
      <div className="absolute inset-0 bg-black/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-card/90 flex items-center justify-center shadow-md">
          <Eye className="h-5 w-5 text-foreground/80" />
        </div>
      </div>
    </div>
  );
}
