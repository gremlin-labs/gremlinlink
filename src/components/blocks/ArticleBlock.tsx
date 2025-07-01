import { ContentBlock } from '@/lib/db/unified-schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { RenderMode } from './BlockRenderer';
import { FileText, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LexicalContentRenderer } from '@/components/ui/lexical-content-renderer';

/**
 * ARTICLE BLOCK COMPONENT
 * 
 * Handles rich text content with reading time and SEO optimization.
 * Supports block-based content structure for flexible layouts.
 * 
 * Features:
 * - Rich text rendering with Lexical
 * - Reading time display
 * - SEO metadata
 * - Responsive design
 */

interface ArticleBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: RenderMode;
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

interface ArticleData {
  title: string;
  content: string; // Lexical JSON string
  reading_time?: number;
  excerpt?: string;
}

export default function ArticleBlock({ 
  block, 
  mode = 'view',
  onUpdate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDelete: _onDelete,
}: ArticleBlockProps) {
  const data = block.data as unknown as ArticleData;

  return (
    <article className={cn(
      'prose prose-gray max-w-none',
      mode === 'edit' && 'border rounded-lg p-6 border-primary/50 bg-primary/5'
    )}>
      {/* Article Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {data.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <time dateTime={block.created_at.toISOString()}>
              {new Date(block.created_at).toLocaleDateString()}
            </time>
          </div>
          
          {data.reading_time && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{data.reading_time} min read</span>
            </div>
          )}
          
          {mode === 'edit' && (
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>Article Block</span>
            </div>
          )}
        </div>
        
        {data.excerpt && (
          <p className="text-lg text-muted-foreground mt-4 italic">
            {data.excerpt}
          </p>
        )}
      </header>
      
      {/* Article Content */}
      <div className="prose prose-gray max-w-none dark:prose-invert">
        <LexicalContentRenderer 
          content={data.content || ''}
          className="prose-lg"
        />
      </div>
      
      {/* Edit Mode Actions */}
      {mode === 'edit' && (
        <footer className="mt-6 pt-4 border-t border-border">
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate?.({})}
              className="text-sm text-primary hover:text-primary/80"
            >
              Edit Content
            </button>
            
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${block.slug}`)}
              className="text-sm text-primary hover:text-primary/80"
            >
              Copy Link
            </button>
          </div>
        </footer>
      )}
    </article>
  );
}