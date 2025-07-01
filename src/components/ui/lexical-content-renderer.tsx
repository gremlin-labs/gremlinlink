'use client';

import React from 'react';

interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  style?: string;
  tag?: string;
  listType?: string;
  value?: number;
  url?: string;
  target?: string;
  rel?: string;
  [key: string]: unknown;
}

interface LexicalEditorState {
  root: LexicalNode;
}

interface LexicalContentRendererProps {
  content: string;
  className?: string;
  maxLength?: number;
}

// Format flags for text nodes
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_CODE = 16;

function parseTextFormat(format: number): string[] {
  const formats: string[] = [];
  if (format & FORMAT_BOLD) formats.push('font-bold');
  if (format & FORMAT_ITALIC) formats.push('italic');
  if (format & FORMAT_UNDERLINE) formats.push('underline');
  if (format & FORMAT_STRIKETHROUGH) formats.push('line-through');
  if (format & FORMAT_CODE) formats.push('bg-muted px-1 py-0.5 rounded text-sm font-mono');
  return formats;
}

function renderTextNode(node: LexicalNode, key: number): React.ReactNode {
  if (!node.text) return null;
  
  const formats = node.format ? parseTextFormat(node.format) : [];
  const className = formats.join(' ');
  
  if (className) {
    return (
      <span key={key} className={className}>
        {node.text}
      </span>
    );
  }
  
  return node.text;
}

function renderNode(node: LexicalNode, key: number): React.ReactNode {
  if (!node) return null;

  switch (node.type) {
    case 'text':
      return renderTextNode(node, key);
      
    case 'paragraph':
      return (
        <p key={key} className="mb-4 last:mb-0">
          {node.children?.map((child, index) => renderNode(child, index))}
        </p>
      );
      
    case 'heading':
      const tag = node.tag || 'h1';
      const headingClasses = {
        h1: 'text-3xl font-bold mb-6 mt-8 first:mt-0',
        h2: 'text-2xl font-bold mb-4 mt-6 first:mt-0',
        h3: 'text-xl font-bold mb-3 mt-5 first:mt-0',
        h4: 'text-lg font-bold mb-2 mt-4 first:mt-0',
        h5: 'text-base font-bold mb-2 mt-3 first:mt-0',
        h6: 'text-sm font-bold mb-2 mt-2 first:mt-0',
      };
      
      const className = headingClasses[tag as keyof typeof headingClasses] || headingClasses.h1;
      const children = node.children?.map((child, index) => renderNode(child, index));
      
      switch (tag) {
        case 'h1':
          return <h1 key={key} className={className}>{children}</h1>;
        case 'h2':
          return <h2 key={key} className={className}>{children}</h2>;
        case 'h3':
          return <h3 key={key} className={className}>{children}</h3>;
        case 'h4':
          return <h4 key={key} className={className}>{children}</h4>;
        case 'h5':
          return <h5 key={key} className={className}>{children}</h5>;
        case 'h6':
          return <h6 key={key} className={className}>{children}</h6>;
        default:
          return <h1 key={key} className={className}>{children}</h1>;
      }
      
    case 'quote':
      return (
        <blockquote key={key} className="border-l-4 border-muted-foreground pl-4 my-4 italic text-muted-foreground">
          {node.children?.map((child, index) => renderNode(child, index))}
        </blockquote>
      );
      
    case 'code':
      return (
        <pre key={key} className="bg-muted p-4 rounded-lg my-4 overflow-x-auto">
          <code className="text-sm font-mono">
            {node.children?.map((child, index) => renderNode(child, index))}
          </code>
        </pre>
      );
      
    case 'list':
      const ListTag = node.listType === 'number' ? 'ol' : 'ul';
      const listClasses = node.listType === 'number' 
        ? 'list-decimal list-inside my-4 space-y-1' 
        : 'list-disc list-inside my-4 space-y-1';
      return (
        <ListTag key={key} className={listClasses}>
          {node.children?.map((child, index) => renderNode(child, index))}
        </ListTag>
      );
      
    case 'listitem':
      return (
        <li key={key} className="ml-4">
          {node.children?.map((child, index) => renderNode(child, index))}
        </li>
      );
      
    case 'link':
      return (
        <a 
          key={key} 
          href={node.url} 
          className="text-primary underline hover:no-underline"
          target={node.target || '_blank'}
          rel={node.rel || 'noopener noreferrer'}
        >
          {node.children?.map((child, index) => renderNode(child, index))}
        </a>
      );
      
    case 'linebreak':
      return <br key={key} />;
      
    default:
      // For unknown node types, try to render children
      if (node.children) {
        return (
          <span key={key}>
            {node.children.map((child, index) => renderNode(child, index))}
          </span>
        );
      }
      return null;
  }
}

function extractTextContent(node: LexicalNode): string {
  if (node.type === 'text' && node.text) {
    return node.text;
  }
  
  if (node.children) {
    return node.children.map(extractTextContent).join('');
  }
  
  return '';
}

export function LexicalContentRenderer({ 
  content, 
  className = '', 
  maxLength 
}: LexicalContentRendererProps) {
  if (!content || content.trim() === '') {
    return (
      <p className="text-muted-foreground italic">
        Article content will appear here...
      </p>
    );
  }

  try {
    const editorState: LexicalEditorState = JSON.parse(content);
    
    if (!editorState.root || !editorState.root.children) {
      return (
        <p className="text-muted-foreground italic">
          No content available
        </p>
      );
    }

    // If maxLength is specified, check if we need to truncate
    if (maxLength) {
      const fullText = extractTextContent(editorState.root);
      if (fullText.length > maxLength) {
        const truncatedText = fullText.substring(0, maxLength);
        return (
          <div className={`prose prose-invert max-w-none ${className}`}>
            <p>{truncatedText}...</p>
          </div>
        );
      }
    }

    return (
      <div className={`prose prose-invert max-w-none ${className}`}>
        {editorState.root.children.map((child, index) => renderNode(child, index))}
      </div>
    );
  } catch (error) {
    console.error('Error parsing Lexical content:', error);
    
    // Fallback: treat as plain text
    const displayText = maxLength && content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
      
    return (
      <div className={`prose prose-invert max-w-none ${className}`}>
        <p className="whitespace-pre-wrap">{displayText}</p>
      </div>
    );
  }
} 