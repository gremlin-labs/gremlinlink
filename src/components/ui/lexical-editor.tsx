'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EditorState } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';

// Lexical nodes
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, $isListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode, $createCodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

// Markdown transformers
import { TRANSFORMERS } from '@lexical/markdown';

// UI components
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote,
  Code,
  Code2,
  Link,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Plus,
  ChevronDown,
  Undo,
  Redo
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// Lexical selection and formatting
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
} from 'lexical';

import {
  $setBlocksType,
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from '@lexical/selection';

import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';

interface LexicalEditorProps {
  value?: string | null | undefined;
  onChange?: (value: string, editorState: EditorState) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// Theme configuration
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  image: 'editor-image',
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    overflowed: 'editor-text-overflowed',
    hashtag: 'editor-text-hashtag',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
};

// Error handler
function onError(error: Error) {
  console.error('Lexical Editor Error:', error);
}

// Advanced Toolbar Component
function AdvancedToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [fontSize, setFontSize] = useState('14px');
  const [canUndo] = useState(false);
  const [canRedo] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update formatting states
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsCode(selection.hasFormat('code'));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $getNearestNodeOfType(anchorNode, HeadingNode) ||
            $getNearestNodeOfType(anchorNode, QuoteNode) ||
            anchorNode.getTopLevelElementOrThrow();

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type);
          }
        }
      }

      // Update font size
      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', '14px'),
      );
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
    );
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: string) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'));
        }
      });
    }
  };

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    }
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    }
  };

  const insertLink = () => {
    if (!isBold) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const onFontSizeSelect = (newFontSize: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          'font-size': newFontSize,
        });
      }
    });
  };

  return (
    <div className="toolbar border-b p-2 flex items-center gap-1 bg-muted/30 flex-wrap">
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        className="h-8 w-8 p-0"
        aria-label="Undo"
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        className="h-8 w-8 p-0"
        aria-label="Redo"
      >
        <Redo className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Block Type Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Type className="w-4 h-4 mr-1" />
            {blockTypeToBlockName[blockType as keyof typeof blockTypeToBlockName] || 'Normal'}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={formatParagraph}>
            Normal Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h1')}>
            <Heading1 className="w-4 h-4 mr-2" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h2')}>
            <Heading2 className="w-4 h-4 mr-2" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h3')}>
            <Heading3 className="w-4 h-4 mr-2" />
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatQuote}>
            <Quote className="w-4 h-4 mr-2" />
            Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatCode}>
            <Code2 className="w-4 h-4 mr-2" />
            Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            {fontSize}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map((size) => (
            <DropdownMenuItem key={size} onClick={() => onFontSizeSelect(size)}>
              {size}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('bold')}
        className={`h-8 w-8 p-0 ${isBold ? 'bg-muted' : ''}`}
        aria-label="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('italic')}
        className={`h-8 w-8 p-0 ${isItalic ? 'bg-muted' : ''}`}
        aria-label="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('underline')}
        className={`h-8 w-8 p-0 ${isUnderline ? 'bg-muted' : ''}`}
        aria-label="Underline"
      >
        <Underline className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => formatText('code')}
        className={`h-8 w-8 p-0 ${isCode ? 'bg-muted' : ''}`}
        aria-label="Inline Code"
      >
        <Code className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        className="h-8 w-8 p-0"
        aria-label="Bullet List"
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        className="h-8 w-8 p-0"
        aria-label="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={insertLink}
        className="h-8 w-8 p-0"
        aria-label="Insert Link"
      >
        <Link className="w-4 h-4" />
      </Button>

      {/* Insert Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Plus className="w-4 h-4 mr-1" />
            Insert
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={insertLink}>
            <Link className="w-4 h-4 mr-2" />
            Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatCode}>
            <Code2 className="w-4 h-4 mr-2" />
            Code Block
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatQuote}>
            <Quote className="w-4 h-4 mr-2" />
            Quote
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
            <List className="w-4 h-4 mr-2" />
            Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
            <ListOrdered className="w-4 h-4 mr-2" />
            Numbered List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const blockTypeToBlockName = {
  bullet: 'Bullet List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

// Plugin to handle initial value
function InitialValuePlugin({ value }: { value?: string | null | undefined }) {
  const [editor] = useLexicalComposerContext();
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    // Ensure value is a string and not empty
    const stringValue = typeof value === 'string' ? value : '';
    
    if (!isInitialized && stringValue && stringValue.trim() !== '') {
      try {
        // Try to parse as JSON (Lexical editor state)
        const parsedState = JSON.parse(stringValue);
        const editorState = editor.parseEditorState(parsedState);
        editor.setEditorState(editorState);
        setIsInitialized(true);
      } catch {
        // If parsing fails, just ignore and let the editor start empty
        console.log('Could not parse initial editor state, starting with empty editor');
        setIsInitialized(true);
      }
    } else if (!isInitialized) {
      // Mark as initialized even if no value to prevent infinite loops
      setIsInitialized(true);
    }
  }, [editor, value, isInitialized]);

  return null;
}

export function LexicalRichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start writing your article...',
  className = '',
  autoFocus = false,
}: LexicalEditorProps) {
  // Convert value to string to ensure consistency
  const stringValue = typeof value === 'string' ? value : '';
  
  const initialConfig = {
    namespace: 'ArticleEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
    // Don't set editorState here - we'll handle it in a plugin
  };

  const handleChange = (editorState: EditorState) => {
    if (onChange) {
      // Get the JSON representation of the editor state
      const serializedState = JSON.stringify(editorState.toJSON());
      onChange(serializedState, editorState);
    }
  };

  return (
    <div className={`lexical-editor ${className}`}>
      <style jsx global>{`
        ${editorStyles}
      `}</style>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container border rounded-md bg-background">
          <AdvancedToolbar />
          <div className="editor-inner relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input min-h-[200px] p-4 outline-none resize-none text-sm leading-relaxed"
                  aria-placeholder={placeholder}
                  placeholder={
                    <div className="editor-placeholder absolute top-4 left-4 text-muted-foreground pointer-events-none select-none">
                      {placeholder}
                    </div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin onChange={handleChange} />
            <HistoryPlugin />
            <AutoFocusPlugin defaultSelection={autoFocus ? 'rootStart' : undefined} />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <ListPlugin />
            <LinkPlugin />
            <TabIndentationPlugin />
            <InitialValuePlugin value={stringValue} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}

// CSS styles for the editor
export const editorStyles = `
.lexical-editor {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--background));
}

.editor-container {
  position: relative;
  background: hsl(var(--background));
  border-radius: 6px;
}

.editor-inner {
  position: relative;
}

.editor-input {
  min-height: 200px;
  resize: none;
  font-size: 14px;
  caret-color: hsl(var(--foreground));
  position: relative;
  tab-size: 1;
  outline: 0;
  padding: 16px;
  caret-color: hsl(var(--primary));
}

.editor-placeholder {
  color: hsl(var(--muted-foreground));
  overflow: hidden;
  position: absolute;
  text-overflow: ellipsis;
  top: 16px;
  left: 16px;
  font-size: 14px;
  user-select: none;
  display: inline-block;
  pointer-events: none;
}

.editor-paragraph {
  margin: 0;
  margin-bottom: 8px;
  position: relative;
}

.editor-paragraph:last-child {
  margin-bottom: 0;
}

.editor-quote {
  margin: 0;
  margin-left: 20px;
  margin-bottom: 10px;
  font-size: 15px;
  color: hsl(var(--muted-foreground));
  border-left: 4px solid hsl(var(--border));
  padding-left: 16px;
}

.editor-heading-h1 {
  font-size: 24px;
  color: hsl(var(--foreground));
  font-weight: 600;
  margin: 0;
  margin-bottom: 12px;
  padding: 0;
}

.editor-heading-h2 {
  font-size: 20px;
  color: hsl(var(--foreground));
  font-weight: 600;
  margin: 0;
  margin-bottom: 10px;
  padding: 0;
}

.editor-heading-h3 {
  font-size: 18px;
  color: hsl(var(--foreground));
  font-weight: 600;
  margin: 0;
  margin-bottom: 8px;
  padding: 0;
}

.editor-text-bold {
  font-weight: bold;
}

.editor-text-italic {
  font-style: italic;
}

.editor-text-underline {
  text-decoration: underline;
}

.editor-text-strikethrough {
  text-decoration: line-through;
}

.editor-text-underlineStrikethrough {
  text-decoration: underline line-through;
}

.editor-text-code {
  background-color: hsl(var(--muted));
  padding: 1px 0.25rem;
  font-family: Menlo, Consolas, Monaco, monospace;
  font-size: 94%;
  border-radius: 3px;
}

.editor-link {
  color: hsl(var(--primary));
  text-decoration: none;
}

.editor-link:hover {
  text-decoration: underline;
}

.editor-list-ol {
  padding: 0;
  margin: 0;
  margin-left: 16px;
}

.editor-list-ul {
  padding: 0;
  margin: 0;
  margin-left: 16px;
}

.editor-listitem {
  margin: 8px 32px 8px 32px;
}

.editor-nested-listitem {
  list-style-type: none;
}

.editor-nested-listitem:before {
  content: '';
  position: absolute;
  left: -18px;
  top: 50%;
  height: 2px;
  width: 8px;
  background-color: hsl(var(--muted-foreground));
}

.editor-code {
  background-color: hsl(var(--muted));
  font-family: Menlo, Consolas, Monaco, monospace;
  display: block;
  padding: 8px 8px 8px 52px;
  line-height: 1.53;
  font-size: 13px;
  margin: 0;
  margin-top: 8px;
  margin-bottom: 8px;
  tab-size: 2;
  overflow-x: auto;
  position: relative;
  border-radius: 6px;
}

.editor-tokenComment {
  color: slategray;
}

.editor-tokenPunctuation {
  color: #999;
}

.editor-tokenProperty {
  color: #905;
}

.editor-tokenSelector {
  color: #690;
}

.editor-tokenOperator {
  color: #9a6e3a;
}

.editor-tokenAttr {
  color: #07a;
}

.editor-tokenVariable {
  color: #e90;
}

.editor-tokenFunction {
  color: #dd4a68;
}

.toolbar {
  display: flex;
  margin-bottom: 1px;
  background: hsl(var(--muted) / 0.3);
  padding: 4px;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  vertical-align: middle;
}

.toolbar button.toolbar-item {
  border: 0;
  display: flex;
  background: none;
  border-radius: 10px;
  padding: 8px;
  cursor: pointer;
  vertical-align: middle;
}

.toolbar button.toolbar-item:disabled {
  cursor: not-allowed;
}

.toolbar button.toolbar-item.spaced {
  margin-right: 2px;
}

.toolbar button.toolbar-item i.format {
  background-size: contain;
  display: inline-block;
  height: 18px;
  width: 18px;
  margin-top: 2px;
  vertical-align: -0.25em;
  display: flex;
  opacity: 0.6;
}

.toolbar button.toolbar-item:disabled i.format {
  opacity: 0.2;
}

.toolbar button.toolbar-item.active {
  background-color: hsl(var(--muted));
}

.toolbar button.toolbar-item.active i.format {
  opacity: 1;
}

.toolbar .toolbar-item:hover:not([disabled]) {
  background-color: hsl(var(--muted));
}

.toolbar .divider {
  width: 1px;
  background-color: hsl(var(--border));
  margin: 0 4px;
}
`; 