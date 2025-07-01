import { ContentBlock } from '@/lib/db/unified-schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { RenderMode } from './BlockRenderer';
import { Images, Grid, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ImageGalleryModal } from '@/components/ui/image-gallery-modal';
import { useState } from 'react';

/**
 * GALLERY BLOCK COMPONENT
 * 
 * Handles multiple images in various layouts (grid, masonry, carousel).
 * Optimized for performance with lazy loading and responsive design.
 */

interface GalleryBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: RenderMode;
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

interface GalleryData {
  images: Array<{
    url: string;
    alt_text?: string;
    caption?: string;
  }>;
  layout?: 'grid' | 'masonry' | 'carousel';
  clickBehavior?: 'lightbox' | 'none';
}

export default function GalleryBlock({ 
  block, 
  mode = 'view',
  onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
}: GalleryBlockProps) {
  // Safely cast data with default values
  const data: GalleryData = {
    images: [],
    layout: 'grid',
    clickBehavior: 'lightbox',
    ...(block.data as Partial<GalleryData>),
  };
  const layout = data.layout || 'grid';
  const clickBehavior = data.clickBehavior || 'lightbox';
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (index: number) => {
    if (clickBehavior === 'lightbox' && mode === 'view') {
      setSelectedImageIndex(index);
      setModalOpen(true);
    }
  };

  const renderGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {data.images.filter(image => image.url && image.url.trim() !== '').map((image, index) => (
        <div 
          key={index} 
          className={cn(
            'aspect-square overflow-hidden rounded-lg bg-muted',
            clickBehavior === 'lightbox' && mode === 'view' && 'cursor-pointer'
          )}
          onClick={() => handleImageClick(index)}
        >
          <Image
            src={image.url}
            alt={image.alt_text || `Gallery image ${index + 1}`}
            width={300}
            height={300}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        </div>
      ))}
    </div>
  );

  const renderMasonry = () => (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {data.images.filter(image => image.url && image.url.trim() !== '').map((image, index) => (
        <div key={index} className="break-inside-avoid mb-4">
          <div 
            className={cn(
              'overflow-hidden rounded-lg bg-muted',
              clickBehavior === 'lightbox' && mode === 'view' && 'cursor-pointer'
            )}
            onClick={() => handleImageClick(index)}
          >
            <Image
              src={image.url}
              alt={image.alt_text || `Gallery image ${index + 1}`}
              width={400}
              height={600}
              className="w-full h-auto object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
          {image.caption && (
            <p className="text-sm text-muted-foreground mt-2">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderCarousel = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
      {data.images.filter(image => image.url && image.url.trim() !== '').map((image, index) => (
        <div key={index} className="flex-shrink-0 w-80 snap-start">
          <div 
            className={cn(
              'aspect-video overflow-hidden rounded-lg bg-muted',
              clickBehavior === 'lightbox' && mode === 'view' && 'cursor-pointer'
            )}
            onClick={() => handleImageClick(index)}
          >
            <Image
              src={image.url}
              alt={image.alt_text || `Gallery image ${index + 1}`}
              width={320}
              height={180}
              className="w-full h-full object-cover"
            />
          </div>
          {image.caption && (
            <p className="text-sm text-muted-foreground mt-2">{image.caption}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderGallery = () => {
    switch (layout) {
      case 'masonry':
        return renderMasonry();
      case 'carousel':
        return renderCarousel();
      default:
        return renderGrid();
    }
  };

  return (
    <div className={cn(
      'space-y-4',
      mode === 'edit' && 'border rounded-lg p-4 border-primary/50 bg-primary/5'
    )}>
      {mode === 'edit' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Gallery Block</span>
            <span className="text-xs text-muted-foreground">
              ({data.images.length} images)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {layout === 'grid' && <Grid className="w-3 h-3" />}
              {layout === 'masonry' && <LayoutGrid className="w-3 h-3" />}
              {layout === 'carousel' && <Images className="w-3 h-3" />}
              <span className="capitalize">{layout}</span>
            </div>
          </div>
        </div>
      )}
      
      {data.images.length > 0 ? (
        renderGallery()
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <Images className="w-8 h-8 mx-auto mb-2" />
          <p>No images in gallery</p>
        </div>
      )}
      
      {mode === 'edit' && (
        <div className="flex gap-2 pt-4 border-t border-border">
          <button
            onClick={() => onUpdate?.({})}
            className="text-sm text-primary hover:text-primary/80"
          >
            Edit Gallery
          </button>
          
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${block.slug}`)}
            className="text-sm text-primary hover:text-primary/80"
          >
            Copy Gallery URL
          </button>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={data.images}
        initialIndex={selectedImageIndex}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}