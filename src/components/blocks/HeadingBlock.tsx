'use client';

import { ContentBlock } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface HeadingData {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
}

interface HeadingBlockProps {
  block: ContentBlock;
  mode?: 'view' | 'edit' | 'preview';
}

export default function HeadingBlock({ block, mode = 'view' }: HeadingBlockProps) {
  const data = block.data as unknown as HeadingData;
  
  const HeadingTag = data.level || 'h2';
  
  const headingClasses = {
    h1: 'text-4xl md:text-5xl font-bold tracking-tight',
    h2: 'text-3xl md:text-4xl font-bold tracking-tight',
    h3: 'text-2xl md:text-3xl font-semibold',
    h4: 'text-xl md:text-2xl font-semibold',
    h5: 'text-lg md:text-xl font-medium',
    h6: 'text-base md:text-lg font-medium',
  };
  
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  if (mode === 'edit') {
    return (
      <div className="border border-dashed border-muted-foreground/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            Heading ({data.level || 'h2'})
          </span>
          {data.alignment && data.alignment !== 'left' && (
            <span className="text-xs text-muted-foreground">
              {data.alignment}
            </span>
          )}
        </div>
        <HeadingTag 
          className={cn(
            headingClasses[data.level || 'h2'],
            alignmentClasses[data.alignment || 'left'],
            'mb-0'
          )}
          style={{ color: data.color }}
        >
          {data.text || 'Empty heading'}
        </HeadingTag>
      </div>
    );
  }
  
  return (
    <HeadingTag 
      className={cn(
        headingClasses[data.level || 'h2'],
        alignmentClasses[data.alignment || 'left'],
        'mb-4'
      )}
      style={{ color: data.color }}
    >
      {data.text}
    </HeadingTag>
  );
}