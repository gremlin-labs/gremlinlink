'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image, X } from 'lucide-react';
import { MediaGalleryModal } from './media-gallery-modal';
import NextImage from 'next/image';

export interface MediaAsset {
  id: string;
  filename: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  storage_path: string;
  thumbnail_path?: string;
  blurhash?: string;
  uploaded_by?: string;
  created_at: Date;
  // Computed URLs
  url: string;
  thumbnail_url: string;
  alt?: string;
}

interface ImageSelectorProps {
  value: MediaAsset | null;
  onChange: (asset: MediaAsset | null) => void;
  label?: string;
  helpText?: string;
  aspectRatio?: number;
  recommendedSize?: { width: number; height: number };
  className?: string;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  value,
  onChange,
  label = 'Image',
  helpText,
  aspectRatio,
  recommendedSize,
  className = '',
}) => {
  const [showGallery, setShowGallery] = useState(false);

  const handleSelect = (asset: MediaAsset | MediaAsset[]) => {
    // For single image selector, we only expect a single asset
    if (Array.isArray(asset)) {
      onChange(asset[0] || null);
    } else {
      onChange(asset);
    }
    setShowGallery(false);
  };

  const handleRemove = () => {
    onChange(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`image-selector ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
          {recommendedSize && (
            <span className="text-muted-foreground ml-2">
              (Recommended: {recommendedSize.width}×{recommendedSize.height})
            </span>
          )}
        </label>
      )}
      
      {value ? (
        <Card className="selected-image relative overflow-hidden bg-card-elevated">
          <div className="relative">
            <div className="relative w-full h-48 overflow-hidden">
              <NextImage 
                src={value.thumbnail_url || value.url} 
                alt={value.alt || value.filename || 'Selected image'}
                fill
                className="object-cover"
                style={aspectRatio ? { aspectRatio } : undefined}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowGallery(true)}
                className="bg-black/50 hover:bg-black/70 text-white border-0"
              >
                Change
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="bg-black/50 hover:bg-red-600 text-white border-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="p-3 bg-card-elevated">
            <p className="text-sm font-medium truncate">{value.filename}</p>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatFileSize(value.size_bytes)}</span>
              {value.width && value.height && (
                <span>{value.width}×{value.height}</span>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="image-selector-empty bg-card-elevated">
          <button 
            className="select-image-btn w-full p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center gap-3"
            onClick={() => setShowGallery(true)}
            type="button"
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            <div className="text-center">
              <p className="font-medium">Select Image</p>
              <p className="text-sm text-muted-foreground">
                Choose from library or upload new
              </p>
            </div>
          </button>
        </Card>
      )}
      
      {helpText && (
        <p className="text-xs text-muted-foreground mt-2">{helpText}</p>
      )}
      
      {showGallery && (
        <MediaGalleryModal
          onSelect={handleSelect}
          onClose={() => setShowGallery(false)}
          _aspectRatio={aspectRatio}
          recommendedSize={recommendedSize}
        />
      )}
    </div>
  );
}; 