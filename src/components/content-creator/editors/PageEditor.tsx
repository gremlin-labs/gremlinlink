'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, X, Eye, Info, Palette, Type, FileText, Image as ImageIcon, Link2, Edit2 } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { HeadingEditor } from './HeadingEditor';
import { TextEditor } from './TextEditor';
import { ImageEditor } from '@/components/content-creator/editors/ImageEditor';
import { RedirectEditor } from '@/components/content-creator/editors/RedirectEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

interface ChildBlock {
  id: string;
  slug: string;
  renderer: string;
  data: Record<string, unknown>;
  display_order: number;
  is_published?: boolean;
  type?: string;
  parent_id?: string;
}

type BlockType = 'heading' | 'text' | 'image' | 'redirect' | 'existing';

export const PageEditor: React.FC<PageEditorProps> = ({ block, onChange }) => {
  const [childBlocks, setChildBlocks] = useState<ChildBlock[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType | null>(null);
  const [editingBlock, setEditingBlock] = useState<ChildBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableBlocks, setAvailableBlocks] = useState<ContentBlock[]>([]);
  const [showExistingPicker, setShowExistingPicker] = useState(false);

  const data = block.data as unknown as PageData;

  const updateData = (key: keyof PageData, value: string | boolean) => {
    onChange({
      data: { ...block.data, [key]: value },
    });
  };

  const loadChildBlocks = useCallback(async () => {
    try {
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

  useEffect(() => {
    loadChildBlocks();
    loadAvailableBlocks();
  }, [loadChildBlocks, loadAvailableBlocks]);

  const createNewBlock = async (blockType: BlockType) => {
    if (block.id === '00000000-0000-0000-0000-000000000000') {
      alert('Please save the page first before adding blocks.');
      return;
    }

    const tempId = `temp-${uuidv4()}`;
    const newBlock: ChildBlock = {
      id: tempId,
      slug: `${block.slug}-${blockType}-${Date.now()}`,
      renderer: blockType,
      data: getDefaultDataForType(blockType),
      display_order: childBlocks.length,
      type: 'child',
      parent_id: block.id,
    };

    setEditingBlock(newBlock);
    setSelectedBlockType(blockType);
  };

  const getDefaultDataForType = (blockType: BlockType): Record<string, unknown> => {
    switch (blockType) {
      case 'heading':
        return { text: '', level: 'h2', alignment: 'left' };
      case 'text':
        return { content: '', alignment: 'left', fontSize: 'normal' };
      case 'image':
        return { alt: '', clickAction: 'lightbox' };
      case 'redirect':
        return { url: '', cardTitle: '' };
      default:
        return {};
    }
  };

  const saveNewBlock = async (blockData: ChildBlock) => {
    try {
      const response = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: blockData.slug,
          renderer: blockData.renderer,
          data: blockData.data,
          type: 'child',
          parent_id: block.id,
          is_published: true,
        }),
      });

      if (response.ok) {
        const { block: newBlock } = await response.json();
        
        // Add to parent
        const addResponse = await fetch(`/api/admin/blocks/${block.id}/children`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockId: newBlock.id }),
        });

        if (addResponse.ok) {
          await loadChildBlocks();
          setEditingBlock(null);
          setSelectedBlockType(null);
        }
      }
    } catch (error) {
      console.error('Failed to create block:', error);
      alert('Failed to create block');
    }
  };

  const updateChildBlock = async (childId: string, updates: Partial<ChildBlock>) => {
    try {
      const response = await fetch(`/api/admin/blocks/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadChildBlocks();
      }
    } catch {
      // Error handled silently
    }
  };

  const addExistingBlock = async (blockId: string) => {
    try {
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
        setShowExistingPicker(false);
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

    setChildBlocks(items);

    try {
      await fetch(`/api/admin/blocks/${block.id}/children/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderedIds: items.map(item => item.id),
        }),
      });
    } catch {
      await loadChildBlocks();
    }
  };

  const getBlockTitle = (block: ChildBlock) => {
    switch (block.renderer) {
      case 'redirect':
        return (block.data as { cardTitle?: string; url?: string }).cardTitle || 
               extractDomain((block.data as { url?: string }).url || '') || 'Link';
      case 'image':
        const imageData = block.data as { alt?: string; image?: { filename?: string }; isHeaderImage?: boolean; isProfileImage?: boolean };
        let title = imageData.alt || imageData.image?.filename || 'Image';
        if (imageData.isHeaderImage) title += ' (Header)';
        if (imageData.isProfileImage) title += ' (Profile)';
        return title;
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
    const imageData = block.data as { 
      image?: { thumbnail_url?: string }; 
      isHeaderImage?: boolean; 
      isProfileImage?: boolean; 
      caption?: string;
    };

    switch (block.renderer) {
      case 'redirect':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-xs">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground truncate">{(block.data as { url?: string }).url}</div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
            {imageData.image?.thumbnail_url ? (
              <Image 
                src={imageData.image.thumbnail_url} 
                alt="" 
                width={32}
                height={32}
                className="w-8 h-8 object-cover rounded"
              />
            ) : (
              <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-xs">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{getBlockTitle(block)}</div>
              <div className="text-sm text-muted-foreground">
                {imageData.isHeaderImage && <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs mr-2">Header</span>}
                {imageData.isProfileImage && <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">Profile</span>}
                {imageData.caption && <span className="truncate">{imageData.caption}</span>}
              </div>
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
                                    onClick={() => window.open(`/admin/content/${childBlock.id}/edit`, '_blank')}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
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
                    Click &quot;Save&quot; below to save the page.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <Button 
                    onClick={() => setShowBlockPicker(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Content Block
                  </Button>
                </div>
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
        <CardContent className="space-y-6 pt-6">
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

      {/* Block Type Picker Modal */}
      {showBlockPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
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
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                  onClick={() => {
                    setShowBlockPicker(false);
                    createNewBlock('heading');
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center text-white mx-auto mb-3">
                      <Type className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-1">Heading</h3>
                    <p className="text-sm text-muted-foreground">Add a title or section header</p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                  onClick={() => {
                    setShowBlockPicker(false);
                    createNewBlock('text');
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-white mx-auto mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-1">Text</h3>
                    <p className="text-sm text-muted-foreground">Add a paragraph or bio text</p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                  onClick={() => {
                    setShowBlockPicker(false);
                    createNewBlock('image');
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white mx-auto mb-3">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-1">Image</h3>
                    <p className="text-sm text-muted-foreground">Add an image anywhere on the page</p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                  onClick={() => {
                    setShowBlockPicker(false);
                    createNewBlock('redirect');
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white mx-auto mb-3">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-1">Link</h3>
                    <p className="text-sm text-muted-foreground">Add a link to external content</p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary col-span-full"
                  onClick={() => {
                    setShowBlockPicker(false);
                    setShowExistingPicker(true);
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center text-white mx-auto mb-3">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-1">Add Existing Block</h3>
                    <p className="text-sm text-muted-foreground">Choose from your existing content blocks</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Existing Block Picker Modal */}
      {showExistingPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add Existing Block
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExistingPicker(false)}
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
                    onClick={() => addExistingBlock(availableBlock.id)}
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

      {/* Block Editor Dialog */}
      {editingBlock && selectedBlockType && (
        <Dialog open={true} onOpenChange={() => {
          setEditingBlock(null);
          setSelectedBlockType(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Create {selectedBlockType === 'redirect' ? 'Link' : selectedBlockType.charAt(0).toUpperCase() + selectedBlockType.slice(1)} Block
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedBlockType === 'heading' && (
                <HeadingEditor
                  block={editingBlock as ContentBlock}
                  onChange={(updates) => {
                    setEditingBlock({
                      ...editingBlock,
                      ...updates,
                    });
                  }}
                />
              )}
              {selectedBlockType === 'text' && (
                <TextEditor
                  block={editingBlock as ContentBlock}
                  onChange={(updates) => {
                    setEditingBlock({
                      ...editingBlock,
                      ...updates,
                    });
                  }}
                />
              )}
              {selectedBlockType === 'image' && (
                <ImageEditor
                  block={editingBlock as ContentBlock}
                  onChange={(updates) => {
                    setEditingBlock({
                      ...editingBlock,
                      ...updates,
                    });
                  }}
                />
              )}
              {selectedBlockType === 'redirect' && (
                <RedirectEditor
                  block={editingBlock as ContentBlock}
                  onChange={(updates) => {
                    setEditingBlock({
                      ...editingBlock,
                      ...updates,
                    });
                  }}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingBlock(null);
                  setSelectedBlockType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveNewBlock(editingBlock)}
                disabled={!editingBlock.data || Object.keys(editingBlock.data).length === 0}
              >
                Create Block
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};