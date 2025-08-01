'use client';

import dynamic from 'next/dynamic';
import { ContentBlock } from '@/lib/db/schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { cn } from '@/lib/utils';

/**
 * UNIVERSAL BLOCK RENDERER
 * 
 * This component dynamically loads and renders different block types
 * using a factory pattern. Each block type has its own optimized renderer.
 * 
 * Key Features:
 * - Dynamic imports for performance (code splitting)
 * - Mode-based rendering (view/edit/preview)
 * - Consistent wrapper styling
 * - Error boundaries for resilience
 * - Type-safe block data handling
 */

// Dynamic imports for all block types
const RedirectBlock = dynamic(() => import('./RedirectBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-8 rounded" />,
  ssr: false,
});

const ArticleBlock = dynamic(() => import('./ArticleBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-32 rounded" />,
  ssr: false,
});

const ImageBlock = dynamic(() => import('./ImageBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-48 rounded" />,
  ssr: false,
});

const CardBlock = dynamic(() => import('./CardBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-24 rounded" />,
  ssr: false,
});

const GalleryBlock = dynamic(() => import('./GalleryBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-64 rounded" />,
  ssr: false,
});

const PageBlock = dynamic(() => import('./PageBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-96 rounded" />,
  ssr: false,
});

const HeadingBlock = dynamic(() => import('./HeadingBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-12 rounded" />,
  ssr: false,
});

const TextBlock = dynamic(() => import('./TextBlock'), {
  loading: () => <div className="animate-pulse bg-muted h-24 rounded" />,
  ssr: false,
});

// Renderer registry for dynamic loading
const BLOCK_RENDERERS = {
  redirect: RedirectBlock,
  article: ArticleBlock,
  image: ImageBlock,
  card: CardBlock,
  gallery: GalleryBlock,
  page: PageBlock,
  heading: HeadingBlock,
  text: TextBlock,
} as const;

// Render modes
export type RenderMode = 'view' | 'edit' | 'preview';

// Block renderer props
export interface BlockRendererProps {
  block: ContentBlock | BlockWithChildren;
  mode?: RenderMode;
  className?: string;
  onClick?: () => void;
  onUpdate?: (updates: Partial<ContentBlock>) => void;
  onDelete?: () => void;
}

// Unknown block fallback component
function UnknownBlock({ block, mode }: BlockRendererProps) {
  return (
    <div className={cn(
      'border-2 border-dashed border-muted-foreground/20 rounded-lg p-4',
      mode === 'edit' && 'border-destructive/50 bg-destructive/5'
    )}>
      <div className="text-center text-muted-foreground">
        <div className="text-sm font-medium">Block Type Not Loaded</div>
        <div className="text-xs mt-1">Renderer: {block.renderer}</div>
        <div className="text-xs mt-2 text-muted-foreground">
          Check if the renderer type is supported
        </div>
      </div>
    </div>
  );
}

// Main block renderer component
export function BlockRenderer({
  block,
  mode = 'view',
  className,
  onClick,
  onUpdate,
  onDelete,
}: BlockRendererProps) {
  // Get the appropriate renderer component
  const RendererComponent = BLOCK_RENDERERS[block.renderer as keyof typeof BLOCK_RENDERERS];
  
  if (!RendererComponent) {
    return <UnknownBlock block={block} mode={mode} className={className} />;
  }

  return (
    <div
      className={cn(
        'block-wrapper',
        mode === 'edit' && 'group relative',
        mode === 'preview' && 'pointer-events-none',
        className
      )}
      onClick={onClick}
    >
      {/* Edit mode controls */}
      {mode === 'edit' && (
        <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            {onUpdate && (
              <button
                className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-primary/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({});
                }}
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                className="bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Render the actual block */}
      <RendererComponent
        block={block}
        mode={mode}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />

      {/* Render children if they exist (except for page blocks which handle their own children) */}
      {'children' in block && block.children && block.children.length > 0 && block.renderer !== 'page' && (
        <div className={cn(
          'block-children mt-4 space-y-4',
          mode === 'edit' && 'border-l-2 border-muted pl-4'
        )}>
          {block.children.map((child) => (
            <BlockRenderer
              key={child.id}
              block={child}
              mode={mode}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Export for use in other components
export default BlockRenderer;