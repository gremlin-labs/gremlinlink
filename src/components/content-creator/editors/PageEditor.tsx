'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, X, Eye, Info, Palette } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';
import { ImageSelector, MediaAsset } from '@/components/ui/image-selector';
import { Input } from '@/components/ui/input';

interface PageEditorProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

interface PageData {
  layout: 'default' | 'wide' | 'full';
  theme: 'light' | 'dark' | 'auto';
  customCSS?: string;
  showHeader?: boolean;
  backgroundColor?: string;
  headerImage?: MediaAsset;
  avatarImage?: MediaAsset;
}

interface ChildBlock {
  id: string;
  slug: string;
  renderer: string;
  data: Record<string, unknown>;
  display_order: number;
}

export const PageEditor: React.FC<PageEditorProps> = ({ block, onChange }) => {
  const [availableBlocks, setAvailableBlocks] = useState<ContentBlock[]>([]);
  const [childBlocks, setChildBlocks] = useState<ChildBlock[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const data = block.data as unknown as PageData;

  const updateData = (key: keyof PageData, value: string | boolean | MediaAsset | null) => {
    onChange({
      data: { ...block.data, [key]: value },
    });
  };

  const loadChildBlocks = useCallback(async () => {
    try {
      // Don't load blocks for temp/unsaved pages
      if (block.id === '00000000-0000-0000-0000-000000000000') {
        setChildBlocks([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/admin/blocks/${block.id}/children`);
      if (response.ok) {
        const data = await response.json();
        setChildBlocks(data.children || []);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [block.id]);

  const loadAvailableBlocks = useCallback(async () => {
    try {
      const response = await fetch('/api/blocks?published=true&limit=100');
      if (response.ok) {
        const data = await response.json();
        setAvailableBlocks(data.blocks || []);
      }
    } catch {
      // Error handled silently
    }
  }, []);

  // Load child blocks and available blocks
  useEffect(() => {
    loadChildBlocks();
    loadAvailableBlocks();
  }, [loadChildBlocks, loadAvailableBlocks]);

  const addBlock = async (blockId: string) => {
    try {
      // Handle temp blocks
      if (block.id === '00000000-0000-0000-0000-000000000000') {
        alert('Please save the page first before adding blocks.');
        return;
      }

      const response = await fetch(`/api/admin/blocks/${block.id}/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      });

      if (response.ok) {
        await loadChildBlocks();
        setShowBlockPicker(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add block');
      }
    } catch {
      alert('Failed to add block');
    }
  };

  const removeBlock = async (blockId: string) => {
    try {
      const response = await fetch(`/api/admin/blocks/${block.id}/children/${blockId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadChildBlocks();
      }
    } catch {
      // Error handled silently
    }
  };

  const reorderBlocks = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(childBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for better UX
    setChildBlocks(items);

    // Update server
    try {
      await fetch(`/api/admin/blocks/${block.id}/children/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderedIds: items.map(item => item.id),
        }),
      });
    } catch {
      // Revert on error
      await loadChildBlocks();
    }
  };

  const getBlockTitle = (block: ChildBlock) => {
    switch (block.renderer) {
      case 'redirect':
        return (block.data as { cardTitle?: string; url?: string }).cardTitle || 
               extractDomain((block.data as { url?: string }).url || '') || 'Redirect';
      case 'article':
        return (block.data as { title?: string }).title || 'Article';
      case 'image':
        return (block.data as { alt?: string; image?: { filename?: string } }).alt || 
               (block.data as { image?: { filename?: string } }).image?.filename || 'Image';
      case 'gallery':
        return `Gallery (${((block.data as { images?: unknown[] }).images?.length || 0)} images)`;
      case 'heading':
        return (block.data as { text?: string }).text || 'Heading';
      case 'text':
        const content = (block.data as { content?: string }).content || '';
        return content.substring(0, 50) + (content.length > 50 ? '...' : '') || 'Text Block';
      default:
        return block.renderer;
    }
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const BlockPreview: React.FC<{ block: ChildBlock }> = ({ block }) => {
    switch (block.renderer) {
      case 'redirect':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs">
              →
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground truncate">{(block.data as { url?: string }).url}</div>
            </div>
          </div>
        );
      case 'article':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground truncate">{(block.data as { excerpt?: string }).excerpt}</div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            {(block.data as { image?: { thumbnail_url?: string } }).image?.thumbnail_url ? (
              <Image 
                src={(block.data as { image: { thumbnail_url: string } }).image.thumbnail_url} 
                alt="" 
                width={32}
                height={32}
                className="w-8 h-8 object-cover rounded"
              />
            ) : (
              <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs">
                📷
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground truncate">{(block.data as { caption?: string }).caption}</div>
            </div>
          </div>
        );
      case 'heading':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white text-xs font-bold">
              H
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground">
                {(block.data as { level?: string }).level || 'h2'} • {(block.data as { alignment?: string }).alignment || 'left'}
              </div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-white text-xs">
              T
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground">
                {(block.data as { fontSize?: string }).fontSize || 'normal'} • {(block.data as { alignment?: string }).alignment || 'left'}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center text-white text-xs">
              ?
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground">/{block.slug}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Blocks */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            Content Blocks
            <Info className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading blocks...
            </div>
          ) : (
            <>
              <DragDropContext onDragEnd={reorderBlocks}>
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {childBlocks.map((childBlock, index) => (
                        <Draggable key={childBlock.id} draggableId={childBlock.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border border-border/50 rounded-lg bg-card hover:shadow-md transition-all duration-200 overflow-hidden group"
                            >
                              <div className="flex items-center p-3 bg-muted/20">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="mr-3 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity"
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                                  {childBlock.renderer}
                                </span>
                                <span className="flex-1 ml-3 font-medium truncate">
                                  {getBlockTitle(childBlock)}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`/${childBlock.slug}`, '_blank')}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBlock(childBlock.id)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="p-3">
                                <BlockPreview block={childBlock} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {block.id === '00000000-0000-0000-0000-000000000000' ? (
                <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                  <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <h3 className="font-medium mb-1">Save Page First</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You need to save this page before you can add content blocks to it.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click &quot;Save Draft&quot; or &quot;Publish&quot; below to save the page.
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowBlockPicker(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Content Block
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Page Settings */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            Page Settings
            <Info className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="layout" className="text-sm font-medium mb-2 block">Layout</Label>
            <Select
              value={data.layout || 'default'}
              onValueChange={(value) => updateData('layout', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Centered)</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="full">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="theme" className="text-sm font-medium mb-2 block">Theme</Label>
            <Select
              value={data.theme || 'light'}
              onValueChange={(value) => updateData('theme', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto (System)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="backgroundColor" className="text-sm font-medium mb-2 block">
              Background Color
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className="w-10 h-10 rounded border border-input cursor-pointer"
                  style={{ backgroundColor: data.backgroundColor || '#ffffff' }}
                  onClick={() => document.getElementById('colorPicker')?.click()}
                >
                  {!data.backgroundColor && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  id="backgroundColor"
                  type="text"
                  value={data.backgroundColor || ''}
                  onChange={(e) => updateData('backgroundColor', e.target.value)}
                  placeholder="#ffffff or rgb(255,255,255)"
                  className="flex-1"
                />
                <input
                  id="colorPicker"
                  type="color"
                  value={data.backgroundColor || '#ffffff'}
                  onChange={(e) => updateData('backgroundColor', e.target.value)}
                  className="sr-only"
                />
              </div>
              {data.backgroundColor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateData('backgroundColor', '')}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Set a custom background color for this page
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Page Header Image</Label>
            <ImageSelector
              value={data.headerImage || null}
              onChange={(image) => updateData('headerImage', image)}
              label=""
              helpText="Optional hero image displayed at the top of the page"
              recommendedSize={{ width: 1920, height: 480 }}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Page Avatar Image</Label>
            <ImageSelector
              value={data.avatarImage || null}
              onChange={(image) => updateData('avatarImage', image)}
              label=""
              helpText="Optional avatar or logo image for the page"
              recommendedSize={{ width: 200, height: 200 }}
              aspectRatio={1}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showHeader"
              checked={data.showHeader !== false}
              onCheckedChange={(checked) => updateData('showHeader', checked as boolean)}
            />
            <Label htmlFor="showHeader" className="text-sm font-medium">
              Show page header
            </Label>
          </div>
          <p className="text-xs text-muted-foreground -mt-4">
            Display the page title and description at the top of the page
          </p>

          <div>
            <Label htmlFor="customCSS" className="text-sm font-medium mb-2 block">Custom CSS</Label>
            <textarea
              id="customCSS"
              value={data.customCSS || ''}
              onChange={(e) => updateData('customCSS', e.target.value)}
              placeholder="/* Custom styles for this page */"
              rows={4}
              className="w-full p-3 border border-input rounded-md text-sm font-mono resize-none bg-[var(--color-input-contrast)]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Advanced: Add custom CSS that will be applied only to this page
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Block Picker Modal */}
      {showBlockPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add Content Block
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBlockPicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableBlocks.map(availableBlock => (
                  <Card
                    key={availableBlock.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addBlock(availableBlock.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                          {availableBlock.renderer}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {getBlockTitle(availableBlock as unknown as ChildBlock)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            /{availableBlock.slug}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {availableBlocks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No available blocks to add</p>
                  <p className="text-sm">Create some content blocks first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}; 