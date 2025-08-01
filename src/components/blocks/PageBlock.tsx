'use client';

import Image from 'next/image';
import { ContentBlock } from '@/lib/db/schema';
import { BlockWithChildren } from '@/lib/services/block-service';
import { cn } from '@/lib/utils';
import { BlockRenderer } from './BlockRenderer';

interface PageData {
  layout?: 'default' | 'wide' | 'full';
  theme?: 'light' | 'dark' | 'auto';
  customCSS?: string;
  showHeader?: boolean;
  backgroundColor?: string;
}

interface ImageBlockData {
  url?: string;
  image?: { url: string };
  alt?: string;
  isHeaderImage?: boolean;
  isProfileImage?: boolean;
  imagePosition?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
}

interface PageBlockProps {
  block: ContentBlock | BlockWithChildren;
  mode?: 'view' | 'edit' | 'preview';
}

export default function PageBlock({ block, mode = 'view' }: PageBlockProps) {
  const data = block.data as PageData;
  const metadata = block.metadata as Record<string, unknown>;
  const blockWithChildren = block as BlockWithChildren;

  // Extract header and profile images from child blocks
  const headerImageBlock = blockWithChildren.children?.find(
    child => child.renderer === 'image' && (child.data as ImageBlockData).isHeaderImage
  );
  const profileImageBlock = blockWithChildren.children?.find(
    child => child.renderer === 'image' && (child.data as ImageBlockData).isProfileImage
  );

  const headerImageData = headerImageBlock?.data as ImageBlockData | undefined;
  const profileImageData = profileImageBlock?.data as ImageBlockData | undefined;

  // Filter out header and profile images from regular content
  const contentBlocks = blockWithChildren.children?.filter(
    child => child !== headerImageBlock && child !== profileImageBlock
  ) || [];

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

  const getPositionClass = (position?: string) => {
    switch (position) {
      case 'left': return 'mr-auto';
      case 'right': return 'ml-auto';
      default: return 'mx-auto';
    }
  };

  // For page blocks, we want to apply the layout and theme to the entire page
  if (mode === 'view') {
    return (
      <>
        {/* Custom CSS */}
        {data.customCSS && (
          <style dangerouslySetInnerHTML={{ __html: data.customCSS }} />
        )}
        
        {/* Page wrapper with theme and layout */}
        <div 
          className={cn('page-block min-h-screen', themeClass)}
          style={{ backgroundColor: data.backgroundColor || undefined }}
        >
          {/* Header Image */}
          {headerImageData && (headerImageData.url || headerImageData.image?.url) && (
            <div className="page-header-image relative w-full h-[300px] md:h-[400px] lg:h-[480px] overflow-hidden">
              <Image
                src={headerImageData.url || headerImageData.image?.url || ''}
                alt={headerImageData.alt || 'Page header'}
                fill
                className={cn(
                  "object-cover",
                  headerImageData.imagePosition === 'left' && "object-left",
                  headerImageData.imagePosition === 'right' && "object-right",
                  headerImageData.imagePosition === 'center' && "object-center"
                )}
                priority
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>
          )}
          
          <div className={cn('page-content py-8', layoutClass)}>
            {(data.showHeader !== false) && (metadata.title || metadata.description || profileImageData) ? (
              <div className="page-header mb-12">
                {/* Profile Image */}
                {profileImageData && (profileImageData.url || profileImageData.image?.url) && (
                  <div className={cn(
                    "page-avatar mb-6 w-fit",
                    getPositionClass(profileImageData.imagePosition)
                  )}>
                    <Image
                      src={profileImageData.url || profileImageData.image?.url || ''}
                      alt={profileImageData.alt || 'Profile image'}
                      width={120}
                      height={120}
                      className="rounded-full border-4 border-background shadow-lg"
                    />
                  </div>
                )}
                
                <div className={cn(
                  profileImageData?.imagePosition === 'left' && "text-left",
                  profileImageData?.imagePosition === 'right' && "text-right",
                  (!profileImageData?.imagePosition || profileImageData?.imagePosition === 'center') && "text-center"
                )}>
                  {metadata.title ? (
                    <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                      {String(metadata.title)}
                    </h1>
                  ) : null}
                  {metadata.description ? (
                    <p className={cn(
                      "text-xl text-muted-foreground max-w-3xl",
                      profileImageData?.imagePosition === 'left' && "mr-auto",
                      profileImageData?.imagePosition === 'right' && "ml-auto",
                      (!profileImageData?.imagePosition || profileImageData?.imagePosition === 'center') && "mx-auto"
                    )}>
                      {String(metadata.description)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            
            {/* Page Content - excluding header and profile images */}
            <div className="page-blocks space-y-8">
              {contentBlocks.map((child) => (
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
      
      {/* Show special image indicators */}
      {(headerImageBlock || profileImageBlock) && (
        <div className="mb-2 p-2 bg-primary/10 rounded text-xs">
          {headerImageBlock && <div>✓ Header image configured</div>}
          {profileImageBlock && <div>✓ Profile image configured</div>}
        </div>
      )}
      
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