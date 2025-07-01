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

  // Simplified view
  return (
    <div className={cn(
      'border rounded-lg p-4 bg-card',
      mode === 'edit' && 'border-primary/50 bg-primary/5'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <LinkIcon className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-foreground">
              {String(data.cardTitle) || getDomain(data.url)}
            </h3>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Target URL:</span>
              <div className="font-mono text-sm bg-muted px-2 py-1 rounded mt-1 break-all">
                {data.url}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}