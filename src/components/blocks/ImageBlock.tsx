import { ContentBlock } from '@/lib/db/unified-schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { RenderMode } from './BlockRenderer';
import { Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

/**
 * IMAGE BLOCK COMPONENT
 * 
 * Handles image display with optimization and metadata.
 * Supports captions, alt text, and responsive sizing.
 */

interface ImageBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: RenderMode;
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

export interface ImageBlockData {
  // New structure (MediaAsset object)
  image?: {
    url: string;
    thumbnail_url?: string;
    filename: string;
    width?: number;
    height?: number;
    size_bytes?: number;
    mime_type?: string;
  };
  alt?: string;
  caption?: string;
  clickAction?: 'lightbox' | 'link' | 'none';
  linkUrl?: string;
  
  // Special image flags
  isHeaderImage?: boolean;
  isProfileImage?: boolean;
  imagePosition?: 'left' | 'center' | 'right';
  
  // Legacy structure (direct URL) - for backward compatibility
  url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
}

interface ImageData extends ImageBlockData {}

export default function ImageBlock({ 
  block, 
  mode = 'view',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdate: _onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
}: ImageBlockProps) {
  const data = block.data as unknown as ImageData;

  // Get image URL from either new or legacy structure
  const imageUrl = data.image?.url || data.url;
  const altText = data.alt || data.alt_text || data.image?.filename || 'Image';
  const caption = data.caption;
  const width = data.image?.width || data.width || 800;
  const height = data.image?.height || data.height || 600;

  // Validate that we have a valid image URL
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return (
      <div className={cn(
        'space-y-3 p-6 border border-dashed border-border rounded-lg bg-muted/20',
        mode === 'edit' && 'border-primary/50 bg-primary/5'
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">No image selected</span>
        </div>
        {mode === 'edit' && (
          <p className="text-xs text-muted-foreground">
            Please select an image to display this image block.
          </p>
        )}
      </div>
    );
  }

  const handleImageClick = () => {
    if (mode === 'view' && data.clickAction === 'link' && data.linkUrl) {
      window.open(data.linkUrl, '_blank', 'noopener,noreferrer');
    } else if (mode === 'view' && data.clickAction === 'lightbox') {
      // TODO: Implement lightbox functionality
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <figure className={cn(
      'space-y-3',
      mode === 'edit' && 'border rounded-lg p-4 border-primary/50 bg-primary/5'
    )}>
      {mode === 'edit' && (
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Image Block</span>
        </div>
      )}
      
      <div 
        className={cn(
          'relative overflow-hidden rounded-lg bg-muted',
          data.clickAction && data.clickAction !== 'none' && mode === 'view' && 'cursor-pointer hover:opacity-90 transition-opacity'
        )}
        onClick={handleImageClick}
      >
        <Image
          src={imageUrl}
          alt={altText}
          width={width}
          height={height}
          className="w-full h-auto object-cover"
          priority={mode === 'view'}
        />
      </div>
      
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center">
          {caption}
        </figcaption>
      )}
      
      {mode === 'edit' && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={() => window.open(imageUrl, '_blank')}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            View Full Size
          </button>
          
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = imageUrl;
              link.download = altText || 'image';
              link.click();
            }}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      )}
    </figure>
  );
}