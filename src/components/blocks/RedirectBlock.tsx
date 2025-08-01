import { ContentBlock } from '@/lib/db/schema';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * REDIRECT BLOCK COMPONENT
 * 
 * Simplified version for debugging webpack issues
 */

interface RedirectBlockProps {
  block: ContentBlock;
  mode?: 'view' | 'edit' | 'preview';
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

interface RedirectData {
  url: string;
  statusCode?: number;
  cardTitle?: string;
  cardDescription?: string;
  icon?: string;
  buttonLabel?: string;
}

export default function RedirectBlock({ 
  block, 
  mode = 'view',
}: RedirectBlockProps) {
  const data = block.data as unknown as RedirectData;

  // Extract domain for display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Make the entire block clickable in view mode
  const handleClick = () => {
    if (mode === 'view' && data.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className={cn(
        'border rounded-lg p-4 bg-card transition-colors',
        mode === 'view' && 'cursor-pointer hover:bg-accent/10 hover:border-primary/50',
        mode === 'edit' && 'border-primary/50 bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {data.icon ? (
            <span className="text-2xl">{data.icon}</span>
          ) : (
            <LinkIcon className="w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">
              {String(data.cardTitle) || getDomain(data.url)}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {data.buttonLabel && (
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                {data.buttonLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}