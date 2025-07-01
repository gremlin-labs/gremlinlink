'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Images, Plus } from 'lucide-react';
import { MediaGalleryModal } from './media-gallery-modal';

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

interface MultiImageSelectorProps {
  onSelect: (assets: MediaAsset[]) => void;
  label?: string;
  helpText?: string;
  className?: string;
}

export const MultiImageSelector: React.FC<MultiImageSelectorProps> = ({
  onSelect,
  label = 'Select Images',
  helpText,
  className = '',
}) => {
  const [showGallery, setShowGallery] = useState(false);

  const handleSelect = (assets: MediaAsset | MediaAsset[]) => {
    // Ensure we always get an array
    const assetArray = Array.isArray(assets) ? assets : [assets];
    onSelect(assetArray);
    setShowGallery(false);
  };

  return (
    <div className={`multi-image-selector ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      
      <Card className="bg-card-elevated">
        <button 
          className="w-full p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex flex-col items-center gap-3"
          onClick={() => setShowGallery(true)}
          type="button"
        >
          <Images className="w-8 h-8 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Add Images to Gallery</p>
            <p className="text-sm text-muted-foreground">
              Choose from library or upload new images
            </p>
          </div>
          <div className="mt-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
            <Plus className="w-4 h-4 mr-2" />
            Select Images
          </div>
        </button>
      </Card>
      
      {helpText && (
        <p className="text-xs text-muted-foreground mt-2">{helpText}</p>
      )}
      
      {showGallery && (
        <MediaGalleryModal
          onSelect={handleSelect}
          onClose={() => setShowGallery(false)}
          mode="multiple"
        />
      )}
    </div>
  );
}; 