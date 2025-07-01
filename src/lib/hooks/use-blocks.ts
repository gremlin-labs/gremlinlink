import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContentBlock } from '@/lib/db/schema';
import { toast } from 'sonner';

/**
 * REACT QUERY HOOKS FOR BLOCKS
 * 
 * Server state management for content blocks with caching,
 * optimistic updates, and automatic invalidation.
 */

export interface BlocksResponse {
  blocks: ContentBlock[];
  stats: {
    total: number;
    published: number;
    drafts: number;
    by_renderer: Record<string, number>;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CreateBlockInput {
  slug: string;
  type?: 'root' | 'child';
  parent_id?: string;
  renderer: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  display_order?: number;
  is_published?: boolean;
  tags?: string[];
}

export interface UpdateBlockInput extends Partial<CreateBlockInput> {
  id: string;
}

export interface BlocksFilters {
  renderer?: string;
  type?: string;
  published?: string;
  search?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

// Query keys for consistent cache management
export const blockKeys = {
  all: ['blocks'] as const,
  lists: () => [...blockKeys.all, 'list'] as const,
  list: (filters: BlocksFilters) => [...blockKeys.lists(), filters] as const,
  details: () => [...blockKeys.all, 'detail'] as const,
  detail: (id: string) => [...blockKeys.details(), id] as const,
};

// Fetch blocks with filtering
export function useBlocks(filters: BlocksFilters = {}) {
  return useQuery({
    queryKey: blockKeys.list(filters),
    queryFn: async (): Promise<BlocksResponse> => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/blocks?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Fetch single block
export function useBlock(id: string) {
  return useQuery({
    queryKey: blockKeys.detail(id),
    queryFn: async (): Promise<{ block: ContentBlock & { tags: string[] } }> => {
      const response = await fetch(`/api/blocks/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch block');
      }
      
      return response.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Create new block
export function useCreateBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateBlockInput): Promise<{ block: ContentBlock }> => {
      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create block');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch blocks list
      queryClient.invalidateQueries({ queryKey: blockKeys.lists() });
      
      // Add the new block to cache
      queryClient.setQueryData(
        blockKeys.detail(data.block.id),
        { block: data.block }
      );
      
      toast.success('Content created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update existing block
export function useUpdateBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateBlockInput): Promise<{ block: ContentBlock }> => {
      const { id, ...updateData } = data;
      
      const response = await fetch(`/api/blocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update block');
      }
      
      return response.json();
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: blockKeys.detail(data.id) });
      
      // Snapshot previous value
      const previousBlock = queryClient.getQueryData(blockKeys.detail(data.id));
      
      // Optimistically update cache
      queryClient.setQueryData(blockKeys.detail(data.id), (old: { block: ContentBlock } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          block: { ...old.block, ...data, updated_at: new Date().toISOString() },
        };
      });
      
      return { previousBlock };
    },
    onError: (error: Error, data, context) => {
      // Rollback on error
      if (context?.previousBlock) {
        queryClient.setQueryData(blockKeys.detail(data.id), context.previousBlock);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: blockKeys.lists() });
      toast.success('Content updated successfully');
    },
  });
}

// Delete block
export function useDeleteBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      console.log(`useDeleteBlock: Starting deletion for block ${id}`);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(`/api/blocks/${id}`, {
          method: 'DELETE',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log(`useDeleteBlock: Response status ${response.status}`);
        
        if (!response.ok) {
          const error = await response.json();
          console.error('useDeleteBlock: Error response:', error);
          throw new Error(error.error || 'Failed to delete block');
        }
        
        const result = await response.json();
        console.log('useDeleteBlock: Success response:', result);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('useDeleteBlock: Request timed out');
          throw new Error('Delete operation timed out. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      console.log(`useDeleteBlock: onSuccess for block ${id}`);
      // Remove from cache
      queryClient.removeQueries({ queryKey: blockKeys.detail(id) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: blockKeys.lists() });
      
      toast.success('Content deleted successfully');
    },
    onError: (error: Error) => {
      console.error('useDeleteBlock: onError:', error);
      toast.error(error.message);
    },
  });
}

// Bulk update blocks
export function useBulkUpdateBlocks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { id: string; data: Partial<CreateBlockInput> }[]): Promise<{ success: boolean; updated: number }> => {
      const response = await fetch('/api/blocks/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update blocks');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all block queries
      queryClient.invalidateQueries({ queryKey: blockKeys.all });
      
      toast.success(`Successfully updated ${data.updated} blocks`);
    },
    onError: (error: Error) => {
      // Bulk update failed
      toast.error(error.message);
    },
  });
}

// Bulk delete blocks
export function useBulkDeleteBlocks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]): Promise<{ success: boolean; deleted: number }> => {
      const response = await fetch('/api/blocks/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete blocks');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all block queries
      queryClient.invalidateQueries({ queryKey: blockKeys.all });
      
      toast.success(`Successfully deleted ${data.deleted} blocks`);
    },
    onError: (error: Error) => {
      // Bulk delete failed
      toast.error(error.message);
    },
  });
}