'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBlock, useCreateBlock, useUpdateBlock, useDeleteBlock } from '@/lib/hooks/use-blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, Eye, Trash2, Globe, EyeOff, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ContentBlock } from '@/lib/db/schema';
import { PageEditor } from '@/components/content-creator/editors/PageEditor';
import { RedirectEditor } from '@/components/content-creator/editors/RedirectEditor';
import { ArticleEditor } from '@/components/content-creator/editors/ArticleEditor';
import { ImageEditor } from '@/components/content-creator/editors/ImageEditor';

/**
 * UNIVERSAL BLOCK EDITOR
 * 
 * This single editor handles all block types through dynamic forms.
 * Each renderer type has its own form fields and validation.
 */

export default function BlockEditPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading } = useAuth();
  
  const blockId = params.id as string;
  const isNew = blockId === 'new';
  
  // Server state
  const { data: blockData, isLoading } = useBlock(blockId);
  const createMutation = useCreateBlock();
  const updateMutation = useUpdateBlock();
  const deleteMutation = useDeleteBlock();
  
  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    renderer: 'redirect',
    is_published: true,
    data: {} as Record<string, unknown>,
    metadata: {} as Record<string, unknown>,
  });
  
  const [, setIsDirty] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Load existing block data
  useEffect(() => {
    if (blockData?.block && !isNew) {
      const block = blockData.block;
      setFormData({
        slug: block.slug,
        renderer: block.renderer,
        is_published: block.is_published,
        data: block.data || {},
        metadata: block.metadata || {},
      });
    }
  }, [blockData, isNew]);
  
  // Handle form changes
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  };
  
  const updateData = (key: string, value: unknown) => {
    updateFormData({
      data: { ...formData.data, [key]: value },
    });
  };
  
  // const _updateMetadata = (key: string, value: unknown) => {
  //   updateFormData({
  //     metadata: { ...formData.metadata, [key]: value },
  //   });
  // };
  
  // Handle save
  const handleSave = async () => {
    try {
      if (isNew) {
        const result = await createMutation.mutateAsync(formData);
        toast.success('Content created successfully');
        router.push(`/admin/content/${result.block.id}/edit`);
      } else {
        await updateMutation.mutateAsync({
          id: blockId,
          ...formData,
        });
        toast.success('Content updated successfully');
        setIsDirty(false);
      }
    } catch {
      // Handle save error silently
    }
  };

  // Handle publish toggle
  const handleTogglePublish = async () => {
    const newStatus = !formData.is_published;
    updateFormData({ is_published: newStatus });
    
    if (!isNew) {
      try {
        await updateMutation.mutateAsync({
          id: blockId,
          is_published: newStatus,
        });
        toast.success(newStatus ? 'Content published' : 'Content unpublished');
        setIsDirty(false);
      } catch {
        // Revert on error
        updateFormData({ is_published: !newStatus });
        // Handle publish toggle error silently
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!isNew) {
      try {
        await deleteMutation.mutateAsync(blockId);
        toast.success('Content deleted successfully');
        router.push('/admin/content');
      } catch {
        // Handle delete error silently
      }
    }
    setShowDeleteDialog(false);
  };
  
  // Handle preview
  const handlePreview = () => {
    if (formData.slug) {
      window.open(`/${formData.slug}`, '_blank');
    }
  };

  // Get content type display name
  const getContentTypeName = (renderer: string) => {
    const names: Record<string, string> = {
      redirect: 'Redirect',
      article: 'Article',
      image: 'Image',
      card: 'Card',
      gallery: 'Gallery',
      page: 'Page',
    };
    return names[renderer] || renderer;
  };
  
  // Render renderer-specific fields
  const renderRendererFields = () => {
    switch (formData.renderer) {
      case 'redirect':
        // Use the full RedirectEditor component for consistency with creation
        const mockBlock: ContentBlock = {
          id: blockId === 'new' ? '00000000-0000-0000-0000-000000000000' : blockId,
          slug: formData.slug,
          type: 'root',
          parent_id: undefined,
          renderer: 'redirect',
          data: formData.data || {},
          metadata: formData.metadata || {},
          display_order: 0,
          is_published: formData.is_published,
          is_landing_block: false,
          is_private: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        const handleBlockChange = (updates: Partial<ContentBlock>) => {
          console.log('Edit page: Block change received:', updates);
          updateFormData({
            data: updates.data || formData.data,
            metadata: updates.metadata || formData.metadata,
          });
        };

        return (
          <div className="space-y-6">
            <RedirectEditor block={mockBlock} onChange={handleBlockChange} />
          </div>
        );
        
      case 'article':
        // Use the full ArticleEditor component for consistency with creation
        const articleFormData = {
          title: String(formData.data.title || ''),
          excerpt: String(formData.data.excerpt || ''),
          content: String(formData.data.content || ''),
          author: String(formData.data.author || ''),
          readingTime: Number(formData.data.reading_time || 0),
          tags: String(formData.data.tags || ''),
        };

        const handleArticleChange = (data: {
          title?: string;
          excerpt?: string;
          content?: string;
          author?: string;
          readingTime?: number;
          tags?: string;
          [key: string]: unknown;
        }) => {
          updateFormData({
            data: {
              ...formData.data,
              title: data.title,
              excerpt: data.excerpt,
              content: data.content,
              author: data.author,
              reading_time: data.readingTime,
              tags: data.tags,
            }
          });
        };

        return (
          <div className="space-y-6">
            <ArticleEditor
              slug={formData.slug}
              formData={articleFormData}
              onChange={handleArticleChange}
            />
          </div>
        );
        
      case 'image':
        // Use the full ImageEditor component for consistency with creation
        const imageBlock: ContentBlock = {
          id: blockId === 'new' ? '00000000-0000-0000-0000-000000000000' : blockId,
          slug: formData.slug,
          type: 'root',
          parent_id: undefined,
          renderer: 'image',
          data: formData.data || {},
          metadata: formData.metadata || {},
          display_order: 0,
          is_published: formData.is_published,
          is_landing_block: false,
          is_private: false,
          created_at: new Date(),
          updated_at: new Date(),
        };

        const handleImageBlockChange = (updates: Partial<ContentBlock>) => {
          console.log('Edit page: Image block change received:', updates);
          updateFormData({
            data: updates.data || formData.data,
            metadata: updates.metadata || formData.metadata,
          });
        };

        return (
          <div className="space-y-6">
            <ImageEditor block={imageBlock} onChange={handleImageBlockChange} />
          </div>
        );
        
      case 'card':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="cardTitle" className="text-sm font-medium mb-2 block">Title</Label>
              <Input
                id="cardTitle"
                placeholder="Card title"
                value={String(formData.data.title || '')}
                onChange={(e) => updateData('title', e.target.value)}
                required
                className="h-11 bg-[var(--color-input-contrast)]"
              />
            </div>
            <div>
              <Label htmlFor="cardDescription" className="text-sm font-medium mb-2 block">Description</Label>
              <Textarea
                id="cardDescription"
                placeholder="Card description"
                value={String(formData.data.description || '')}
                onChange={(e) => updateData('description', e.target.value)}
                rows={3}
                className="resize-none bg-[var(--color-input-contrast)]"
              />
            </div>
            <div>
              <Label htmlFor="cardImage" className="text-sm font-medium mb-2 block">Image URL</Label>
              <Input
                id="cardImage"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={String(formData.data.image || '')}
                onChange={(e) => updateData('image', e.target.value)}
                className="h-11 bg-[var(--color-input-contrast)]"
              />
            </div>
            <div>
              <Label htmlFor="cardLink" className="text-sm font-medium mb-2 block">Link URL</Label>
              <Input
                id="cardLink"
                type="url"
                placeholder="https://example.com"
                value={String(formData.data.link || '')}
                onChange={(e) => updateData('link', e.target.value)}
                className="h-11 bg-[var(--color-input-contrast)]"
              />
            </div>
          </div>
        );
        
      case 'gallery':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="galleryTitle" className="text-sm font-medium mb-2 block">Gallery Title</Label>
              <Input
                id="galleryTitle"
                placeholder="Gallery title"
                value={String(formData.data.title || '')}
                onChange={(e) => updateData('title', e.target.value)}
                className="h-11 bg-[var(--color-input-contrast)]"
              />
            </div>
            <div>
              <Label htmlFor="galleryImages" className="text-sm font-medium mb-2 block">Images</Label>
              <Textarea
                id="galleryImages"
                placeholder="Enter image URLs, one per line"
                value={Array.isArray(formData.data.images) ? formData.data.images.join('\n') : ''}
                onChange={(e) => updateData('images', e.target.value.split('\n').filter(Boolean))}
                rows={6}
                className="font-mono text-sm resize-none bg-[var(--color-input-contrast)]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter one image URL per line
              </p>
            </div>
          </div>
        );
        
      case 'page':
        return (
          <PageEditor 
            block={{
              ...formData,
              id: blockId === 'new' ? '00000000-0000-0000-0000-000000000000' : blockId,
              type: 'root' as const,
              parent_id: undefined,
              display_order: 0,
              created_at: new Date(),
              updated_at: new Date(),
            } as ContentBlock}
            onChange={(updates: Partial<ContentBlock>) => {
              if (updates.data) {
                updateFormData({ data: { ...formData.data, ...updates.data } });
              }
              if (updates.metadata) {
                updateFormData({ metadata: { ...formData.metadata, ...updates.metadata } });
              }
            }}
          />
        );
        
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a content type to configure its settings</p>
          </div>
        );
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized container */}
      <div className="container max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header - Mobile-first responsive design */}
        <div className="mb-6 sm:mb-8">
          {/* Top row - Back button and title */}
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2 mt-1 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {isNew ? 'Create Content' : 'Edit Content'}
              </h1>
              {!isNew && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base break-all">
                  Set up your {getContentTypeName(formData.renderer).toLowerCase()} at{' '}
                  <span className="font-mono text-xs sm:text-sm">gremlin.link/{formData.slug}</span>
                </p>
              )}
            </div>
          </div>
          
          {/* Action Bar - Responsive button layout */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center sm:justify-between">
            {/* Status Indicator - Move to top on mobile */}
            {!isNew && (
              <div className="flex items-center gap-2 text-sm order-2 sm:order-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${formData.is_published ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-muted-foreground">
                  {formData.is_published ? 'Published' : 'Draft'} • 
                  {formData.is_published ? ' Visible to the public' : ' Only visible to you'}
                </span>
              </div>
            )}
            
            {/* Action buttons - Stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
              {/* Primary actions row */}
              <div className="flex gap-2">
                {!isNew && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreview}
                    disabled={!formData.slug}
                    className="h-9 flex-1 sm:flex-none"
                  >
                    <Eye className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Preview</span>
                  </Button>
                )}
                
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  size="sm"
                  className="h-9 flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4 sm:mr-2" />
                  <span>{isNew ? 'Create' : 'Save'}</span>
                </Button>
              </div>
              
              {/* Secondary actions row */}
              {!isNew && (
                <div className="flex gap-2">
                  <Button
                    variant={formData.is_published ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleTogglePublish}
                    disabled={updateMutation.isPending}
                    className="h-9 flex-1 sm:flex-none"
                  >
                    {formData.is_published ? (
                      <>
                        <EyeOff className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Unpublish</span>
                        <span className="sm:hidden">Hide</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 sm:mr-2" />
                        <span>Publish</span>
                      </>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreview()}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Content
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content - Mobile-optimized spacing */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Basic Settings - Mobile-first card design */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Basic Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div>
                <Label htmlFor="slug" className="text-sm font-medium mb-2 block">URL Slug</Label>
                {/* Mobile-optimized URL input */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-muted-foreground text-sm flex-shrink-0 order-2 sm:order-1">gremlin.link/</span>
                  <Input
                    id="slug"
                    placeholder="my-content"
                    value={formData.slug}
                    onChange={(e) => updateFormData({ slug: e.target.value })}
                    required
                    className="h-11 bg-[var(--color-input-contrast)] order-1 sm:order-2 flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This will be the URL path for your content
                </p>
              </div>
              
              <div>
                <Label htmlFor="renderer" className="text-sm font-medium mb-2 block">Content Type</Label>
                <Select
                  value={formData.renderer}
                  onValueChange={(value) => updateFormData({ renderer: value, data: {} })}
                >
                  <SelectTrigger className="h-11 bg-[var(--color-input-contrast)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redirect">Redirect</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="gallery">Gallery</SelectItem>
                    <SelectItem value="page">Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Content Configuration - Mobile-optimized */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {renderRendererFields()}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="mx-4 sm:mx-0">
            <DialogHeader>
              <DialogTitle>Delete Content</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this content? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="w-full sm:w-auto"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 