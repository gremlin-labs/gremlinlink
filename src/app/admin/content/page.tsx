'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBlocks, useDeleteBlock, useBulkDeleteBlocks, useBulkUpdateBlocks } from '@/lib/hooks/use-blocks';
import { useContentStore } from '@/lib/stores/content-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,

  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  BarChart3,
  Grid,
  List,
  CheckSquare,
  Square,
  Home,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ContentBlock } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

/**
 * UNIFIED CONTENT MANAGER
 *
 * This replaces the fragmented 5-tab admin interface with a single,
 * unified view of all content. Users can manage redirects, articles,
 * images, cards, and galleries from one place.
 *
 * Key Features:
 * - Single interface for all content types
 * - Advanced filtering and search
 * - Bulk operations with optimistic updates
 * - Real-time analytics
 * - Modern state management with React Query + Zustand
 */

export default function ContentPage() {
  const { loading: authLoading } = useAuth();
  
  // Landing block state
  const [landingStatus, setLandingStatus] = useState<{
    hasLandingBlock: boolean;
    landingBlock?: ContentBlock;
    publicBlockCount: number;
    totalBlockCount: number;
  }>({
    hasLandingBlock: false,
    publicBlockCount: 0,
    totalBlockCount: 0,
  });
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    block: ContentBlock | null;
    isBulk: boolean;
    count: number;
  }>({
    isOpen: false,
    block: null,
    isBulk: false,
    count: 0,
  });
  
  // State management
  const {
    selectedRenderer,
    selectedStatus,
    searchQuery,
    selectedBlocks,
    isSelectMode,
    viewMode,
    setSelectedRenderer,
    setSelectedStatus,
    setSearchQuery,
    toggleBlockSelection,
    selectAllBlocks,
    clearSelection,
    setSelectMode,
    setViewMode,

  } = useContentStore();

  // Server state
  const {
    data: blocksData,
    isLoading,

  } = useBlocks({
    renderer: selectedRenderer !== 'all' ? selectedRenderer : undefined,
    published: selectedStatus !== 'all' ? (selectedStatus === 'published' ? 'true' : 'false') : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const deleteBlockMutation = useDeleteBlock();
  const bulkDeleteMutation = useBulkDeleteBlocks();
  const bulkUpdateMutation = useBulkUpdateBlocks();

  // Fetch landing block status
  useEffect(() => {
    fetchLandingStatus();
  }, []);

  const fetchLandingStatus = async () => {
    try {
      const response = await fetch('/api/admin/landing-block');
      if (response.ok) {
        const data = await response.json();
        setLandingStatus(data);
      }
    } catch {
      // Handle error silently
    }
  };

  const handleSetLandingBlock = async (blockId: string) => {
    try {
      const response = await fetch('/api/admin/landing-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      });

      if (response.ok) {
        toast.success('Landing block set successfully (automatically made public)');
        fetchLandingStatus();
        // Refresh the blocks data to show updated privacy status
        window.location.reload();
      } else {
        toast.error('Failed to set landing block');
      }
    } catch {
      toast.error('Error setting landing block');
    }
  };

  const handleRemoveLandingBlock = async () => {
    try {
      const response = await fetch('/api/admin/landing-block', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Landing block removed successfully');
        fetchLandingStatus();
      } else {
        toast.error('Failed to remove landing block');
      }
    } catch {
      toast.error('Error removing landing block');
    }
  };

  const handleTogglePrivacy = async (blockId: string) => {
    try {
      const response = await fetch(`/api/admin/blocks/${blockId}/privacy`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Block ${data.isPrivate ? 'hidden from' : 'visible in'} public index`);
        // Refresh the blocks data
        window.location.reload();
      } else {
        toast.error('Failed to toggle privacy');
      }
    } catch {
      toast.error('Error toggling privacy');
    }
  };
  


  const blocks = blocksData?.blocks || [];
  const stats = blocksData?.stats || {
    total: 0,
    published: 0,
    drafts: 0,
    by_renderer: {},
  };

  // Handle bulk operations
  const handleBulkDelete = () => {
    if (selectedBlocks.length === 0) return;
    
    setDeleteModal({
      isOpen: true,
      block: null,
      isBulk: true,
      count: selectedBlocks.length,
    });
  };

  const handleBulkPublish = (published: boolean) => {
    if (selectedBlocks.length === 0) return;
    
    bulkUpdateMutation.mutate(
      selectedBlocks.map(id => ({
        id,
        data: { is_published: published },
      })),
      {
        onSuccess: () => {
          clearSelection();
        },
      }
    );
  };

  // Individual operations
  const handleDelete = (block: ContentBlock) => {
    setDeleteModal({
      isOpen: true,
      block,
      isBulk: false,
      count: 1,
    });
  };

  const confirmDelete = () => {
    if (deleteModal.isBulk) {
      bulkDeleteMutation.mutate(selectedBlocks, {
        onSuccess: () => {
          clearSelection();
          setDeleteModal({ isOpen: false, block: null, isBulk: false, count: 0 });
        },
      });
    } else if (deleteModal.block) {
      deleteBlockMutation.mutate(deleteModal.block.id, {
        onSuccess: () => {
          setDeleteModal({ isOpen: false, block: null, isBulk: false, count: 0 });
        },
      });
    }
  };

  const handleToggleStatus = (block: ContentBlock) => {
    const newStatus = !block.is_published;
    
    bulkUpdateMutation.mutate([{
      id: block.id,
      data: { is_published: newStatus },
    }]);
  };

  // Copy URL to clipboard
  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    toast.success('URL copied to clipboard');
  };

  // Select all visible blocks
  const handleSelectAll = () => {
    if (selectedBlocks.length === blocks.length) {
      clearSelection();
    } else {
      selectAllBlocks(blocks.map(b => b.id));
    }
  };

  // Get block title for display
  const getBlockTitle = (block: ContentBlock): string => {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;
    
    return String(data.title || metadata.title || block.slug);
  };

  // Get block description for display
  const getBlockDescription = (block: ContentBlock): string => {
    const data = block.data as Record<string, unknown>;
    const metadata = block.metadata as Record<string, unknown>;
    
    if (block.renderer === 'redirect') {
      return `→ ${String(data.url)}`;
    }
    
    return String(data.description || data.excerpt || metadata.description || 'No description');
  };

  // Get renderer display name
  const getRendererName = (renderer: string): string => {
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

  // Get renderer color
  const getRendererColor = (renderer: string): string => {
    const colors: Record<string, string> = {
      redirect: 'bg-blue-100 text-blue-800',
      article: 'bg-green-100 text-green-800',
      image: 'bg-purple-100 text-purple-800',
      card: 'bg-orange-100 text-orange-800',
      gallery: 'bg-pink-100 text-pink-800',
      page: 'bg-indigo-100 text-indigo-800',
    };
    return colors[renderer] || 'bg-gray-100 text-gray-800';
  };

  if (authLoading || isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-4 lg:py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Content Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Manage all your content from one unified interface
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex-1 sm:flex-none"
            >
              <List className="w-4 h-4" />
              <span className="ml-2 sm:hidden">Table</span>
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="flex-1 sm:flex-none"
            >
              <Grid className="w-4 h-4" />
              <span className="ml-2 sm:hidden">Grid</span>
            </Button>
          </div>

          {/* Selection Mode Toggle */}
          <Button
            variant={isSelectMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectMode(!isSelectMode)}
            className="flex-1 sm:flex-none"
          >
            {isSelectMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="ml-2">{isSelectMode ? 'Exit Select' : 'Select'}</span>
          </Button>

          <Button 
            onClick={() => window.location.href = '/admin/content/create'} 
            className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isSelectMode && selectedBlocks.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">
                  {selectedBlocks.length} item{selectedBlocks.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="w-fit"
                >
                  {selectedBlocks.length === blocks.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(true)}
                  disabled={bulkUpdateMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Publish
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(false)}
                  disabled={bulkUpdateMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Unpublish
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Block Status */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Landing Page Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {landingStatus.hasLandingBlock ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-600">Landing block is set</p>
                <p className="text-sm text-muted-foreground">
                  {landingStatus.landingBlock ? getBlockTitle(landingStatus.landingBlock) : 'Unknown block'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveLandingBlock}
              >
                Remove Landing Block
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-medium text-orange-600 mb-2">No landing block set</p>
              <p className="text-sm text-muted-foreground mb-3">
                Visitors will see an index of {landingStatus.publicBlockCount} public blocks
              </p>
              <p className="text-xs text-muted-foreground">
                Set any block as the landing page using the dropdown menu in the content list below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Content</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{stats.published}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.drafts}</p>
              </div>
              <EyeOff className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Redirects</p>
                <p className="text-2xl font-bold text-blue-600">{stats.by_renderer.redirect || 0}</p>
              </div>
              <ExternalLink className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-[var(--color-card-elevated)]">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--color-input-contrast)]"
                />
              </div>
            </div>
            
            <Select value={selectedRenderer} onValueChange={setSelectedRenderer}>
              <SelectTrigger className="w-full sm:w-48 bg-[var(--color-input-contrast)]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="redirect">Redirects</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="card">Cards</SelectItem>
                <SelectItem value="gallery">Galleries</SelectItem>
                <SelectItem value="page">Pages</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-[var(--color-input-contrast)]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content ({blocks.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block: ContentBlock) => (
                <div key={block.id} className="p-4 border rounded-lg bg-[var(--color-card-elevated)] hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    {/* Selection Checkbox */}
                    {isSelectMode && (
                      <div className="mr-4">
                        <Checkbox
                          checked={selectedBlocks.includes(block.id)}
                          onCheckedChange={() => toggleBlockSelection(block.id)}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground truncate">
                          {getBlockTitle(block)}
                        </h3>
                        
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full font-medium',
                          getRendererColor(block.renderer)
                        )}>
                          {getRendererName(block.renderer)}
                        </span>
                        
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full font-medium',
                          block.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        )}>
                          {block.is_published ? 'Published' : 'Draft'}
                        </span>

                        {block.is_landing_block && (
                          <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                            Landing
                          </span>
                        )}

                        {block.is_private && (
                          <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {getBlockDescription(block)}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>/{block.slug}</span>
                        <span>Created {new Date(block.created_at).toLocaleDateString()}</span>
                        <span>Updated {new Date(block.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyUrl(block.slug)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/${block.slug}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              // Navigate to edit page
                              window.location.href = `/admin/content/${block.id}/edit`;
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              // Toggle publish status
                              handleToggleStatus(block);
                            }}
                          >
                            {block.is_published ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleSetLandingBlock(block.id)}
                            disabled={block.is_landing_block}
                          >
                            <Home className="w-4 h-4 mr-2" />
                            {block.is_landing_block ? 'Is Landing Block' : 'Set as Landing Block'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleTogglePrivacy(block.id)}
                          >
                            {block.is_private ? (
                              <>
                                <Unlock className="w-4 h-4 mr-2" />
                                Make Public
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Make Private
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(block)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No content found</p>
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Content
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.isOpen} onOpenChange={(open) => !open && setDeleteModal({ isOpen: false, block: null, isBulk: false, count: 0 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {deleteModal.isBulk ? (
                <>
                  Are you sure you want to delete <strong>{deleteModal.count}</strong> selected items? 
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>&quot;{deleteModal.block ? getBlockTitle(deleteModal.block) : ''}&quot;</strong>? 
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({ isOpen: false, block: null, isBulk: false, count: 0 })}
              disabled={deleteBlockMutation.isPending || bulkDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteBlockMutation.isPending || bulkDeleteMutation.isPending}
            >
              {(deleteBlockMutation.isPending || bulkDeleteMutation.isPending) ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}