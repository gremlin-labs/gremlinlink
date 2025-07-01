'use client';

import { ContentBlock } from '@/lib/db/schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { cn } from '@/lib/utils';
import { BlockRenderer } from './BlockRenderer';

interface PageData {
  layout?: 'default' | 'wide' | 'full';
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  showHeader?: boolean;
}

interface PageBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: 'view' | 'edit' | 'preview';
}

export default function PageBlock({ block, mode = 'view' }: PageBlockProps) {
  const data = block.data as PageData;
  const metadata = block.metadata as Record<string, unknown>;
  const blockWithChildren = block as BlockWithChildren;

  // Apply layout classes with proper padding
  const layoutClasses = {
    default: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    wide: 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
    full: 'w-full px-4 sm:px-6 lg:px-8',
  };

  const layoutClass = layoutClasses[data.layout || 'default'];

  // Apply theme classes
  const themeClasses = {
    light: 'bg-background text-foreground',
    dark: 'bg-slate-900 text-slate-100',
    auto: '', // Use system theme
  };

  const themeClass = themeClasses[data.theme || 'light'];

  // For page blocks, we want to apply the layout and theme to the entire page
  if (mode === 'view') {
    return (
      <>
        {/* Custom CSS */}
        {data.customCSS && (
          <style dangerouslySetInnerHTML={{ __html: data.customCSS }} />
        )}
        
        {/* Page wrapper with theme and layout */}
        <div className={cn('page-block min-h-screen', themeClass)}>
          <div className={cn('page-content py-8', layoutClass)}>
            {(data.showHeader !== false) && (metadata.title || metadata.description) ? (
              <div className="page-header mb-12">
                {metadata.title ? (
                  <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                    {String(metadata.title)}
                  </h1>
                ) : null}
                {metadata.description ? (
                  <p className="text-xl text-muted-foreground max-w-3xl">
                    {String(metadata.description)}
                  </p>
                ) : null}
              </div>
            ) : null}
            
            {/* Page Content */}
            <div className="page-blocks space-y-8">
              {blockWithChildren.children?.map((child) => (
                <BlockRenderer 
                  key={child.id} 
                  block={child} 
                  mode="view" 
                />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Edit mode shows page info
  return (
    <div className="border border-dashed border-muted-foreground/20 rounded-lg p-4">
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
        <div className="text-sm font-medium mb-1">Page Settings</div>
        <div className="text-xs text-muted-foreground">
          Layout: {data.layout || 'default'} • Theme: {data.theme || 'light'}
          {data.customCSS && ' • Custom CSS applied'}
          {data.showHeader !== false && ' • Header enabled'}
        </div>
        {(metadata.title || metadata.description) ? (
          <div className="mt-2 pt-2 border-t border-muted-foreground/10">
            <div className="text-xs text-muted-foreground">
              {metadata.title ? <div><strong>Title:</strong> {String(metadata.title)}</div> : null}
              {metadata.description ? <div><strong>Description:</strong> {String(metadata.description)}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
      
      {blockWithChildren.children && blockWithChildren.children.length > 0 ? (
        <div className="text-sm text-muted-foreground">
          Contains {blockWithChildren.children.length} content block{blockWithChildren.children.length !== 1 ? 's' : ''}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-sm font-medium mb-1">Empty Page</div>
          <div className="text-xs">
            Add content blocks using the page editor
          </div>
        </div>
      )}
    </div>
  );
} 