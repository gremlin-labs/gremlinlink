'use client';

import { ContentBlock } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface TextData {
  content: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  color?: string;
  backgroundColor?: string;
  padding?: boolean;
}

interface TextBlockProps {
  block: ContentBlock;
  mode?: 'view' | 'edit' | 'preview';
}

export default function TextBlock({ block, mode = 'view' }: TextBlockProps) {
  const data = block.data as unknown as TextData;
  
  const fontSizeClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg',
    xl: 'text-xl',
  };
  
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };
  
  const textClass = cn(
    fontSizeClasses[data.fontSize || 'normal'],
    alignmentClasses[data.alignment || 'left'],
    'whitespace-pre-wrap leading-relaxed',
    data.padding && 'p-6 rounded-lg'
  );
  
  if (mode === 'edit') {
    return (
      <div className="border border-dashed border-muted-foreground/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            Text Block
          </span>
          <div className="flex gap-2 text-xs text-muted-foreground">
            {data.fontSize && data.fontSize !== 'normal' && (
              <span>{data.fontSize}</span>
            )}
            {data.alignment && data.alignment !== 'left' && (
              <span>{data.alignment}</span>
            )}
          </div>
        </div>
        <div 
          className={textClass}
          style={{ 
            color: data.color,
            backgroundColor: data.backgroundColor 
          }}
        >
          {data.content || 'Empty text block'}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={textClass}
      style={{ 
        color: data.color,
        backgroundColor: data.backgroundColor 
      }}
    >
      {data.content}
    </div>
  );
}