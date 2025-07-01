import { ContentBlock } from '@/lib/db/unified-schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { RenderMode } from './BlockRenderer';
import { CreditCard, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconRenderer } from '@/components/IconRenderer';
import Image from 'next/image';

/**
 * CARD BLOCK COMPONENT
 * 
 * Handles link preview cards with rich metadata.
 * Perfect for showcasing links with titles, descriptions, and images.
 */

interface CardBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: RenderMode;
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

interface CardData {
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  icon?: string;
}

export default function CardBlock({ 
  block, 
  mode = 'view',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdate: _onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
}: CardBlockProps) {
  const data = block.data as unknown as CardData;

  const handleCardClick = () => {
    if (data.url && mode === 'view') {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden bg-card transition-all duration-200',
      mode === 'view' && data.url && 'hover:shadow-md cursor-pointer',
      mode === 'edit' && 'border-primary/50 bg-primary/5'
    )}>
      {mode === 'edit' && (
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Card Block</span>
        </div>
      )}
      
      <div onClick={handleCardClick} className="p-4">
        <div className="flex gap-4">
          {/* Icon or Image */}
          <div className="flex-shrink-0">
            {data.image_url && data.image_url.trim() !== '' ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={data.image_url}
                  alt={data.title}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : data.icon ? (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <IconRenderer iconName={data.icon} className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-foreground line-clamp-2">
                {data.title}
              </h3>
              
              {data.url && mode === 'view' && (
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
            </div>
            
            {data.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {data.description}
              </p>
            )}
            
            {data.url && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {new URL(data.url).hostname}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {mode === 'edit' && (
        <div className="flex gap-2 p-3 border-t border-border">
          {data.url && (
            <button
              onClick={() => window.open(data.url, '_blank')}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Visit Link
            </button>
          )}
          
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${block.slug}`)}
            className="text-sm text-primary hover:text-primary/80"
          >
            Copy Card URL
          </button>
        </div>
      )}
    </div>
  );
}