import { create } from 'zustand';
import { ContentBlock } from '@/lib/db/schema';

/**
 * CONTENT STORE
 * 
 * Zustand store for managing UI state in the unified content manager.
 * Handles filters, selections, search, and modal states.
 */

export type BlockRenderer = 'redirect' | 'article' | 'image' | 'card' | 'gallery' | 'all';
export type BlockStatus = 'published' | 'draft' | 'all';

interface ContentStore {
  // Filters and search
  selectedRenderer: BlockRenderer;
  selectedStatus: BlockStatus;
  searchQuery: string;
  selectedTags: string[];
  
  // Selection and bulk operations
  selectedBlocks: string[];
  isSelectMode: boolean;
  
  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  editingBlock: ContentBlock | null;
  
  // UI states
  isLoading: boolean;
  viewMode: 'table' | 'grid';
  
  // Actions
  setSelectedRenderer: (renderer: BlockRenderer) => void;
  setSelectedStatus: (status: BlockStatus) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  
  // Selection actions
  setSelectedBlocks: (ids: string[]) => void;
  toggleBlockSelection: (id: string) => void;
  selectAllBlocks: (blockIds: string[]) => void;
  clearSelection: () => void;
  setSelectMode: (enabled: boolean) => void;
  
  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (block: ContentBlock) => void;
  closeEditModal: () => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  
  // Reset all filters
  resetFilters: () => void;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  // Initial state
  selectedRenderer: 'all',
  selectedStatus: 'all',
  searchQuery: '',
  selectedTags: [],
  selectedBlocks: [],
  isSelectMode: false,
  isCreateModalOpen: false,
  isEditModalOpen: false,
  editingBlock: null,
  isLoading: false,
  viewMode: 'table',
  
  // Filter actions
  setSelectedRenderer: (renderer) => set({ selectedRenderer: renderer }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  
  // Selection actions
  setSelectedBlocks: (ids) => set({ selectedBlocks: ids }),
  toggleBlockSelection: (id) => {
    const { selectedBlocks } = get();
    const isSelected = selectedBlocks.includes(id);
    
    if (isSelected) {
      set({ selectedBlocks: selectedBlocks.filter(blockId => blockId !== id) });
    } else {
      set({ selectedBlocks: [...selectedBlocks, id] });
    }
  },
  selectAllBlocks: (blockIds) => set({ selectedBlocks: blockIds }),
  clearSelection: () => set({ selectedBlocks: [], isSelectMode: false }),
  setSelectMode: (enabled) => set({ 
    isSelectMode: enabled,
    selectedBlocks: enabled ? get().selectedBlocks : [],
  }),
  
  // Modal actions
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openEditModal: (block) => set({ 
    isEditModalOpen: true, 
    editingBlock: block,
  }),
  closeEditModal: () => set({ 
    isEditModalOpen: false, 
    editingBlock: null,
  }),
  
  // UI actions
  setLoading: (loading) => set({ isLoading: loading }),
  setViewMode: (mode) => set({ viewMode: mode }),
  
  // Reset filters
  resetFilters: () => set({
    selectedRenderer: 'all',
    selectedStatus: 'all',
    searchQuery: '',
    selectedTags: [],
    selectedBlocks: [],
    isSelectMode: false,
  }),
}));

/**
 * MEDIA STORE
 * 
 * Separate store for media library state management.
 */

interface MediaStore {
  // Upload state
  isUploading: boolean;
  uploadProgress: number;
  uploadQueue: File[];
  
  // Selection
  selectedMedia: string[];
  
  // Modal states
  isMediaLibraryOpen: boolean;
  isUploadModalOpen: boolean;
  
  // Actions
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  addToUploadQueue: (files: File[]) => void;
  removeFromUploadQueue: (file: File) => void;
  clearUploadQueue: () => void;
  
  setSelectedMedia: (ids: string[]) => void;
  toggleMediaSelection: (id: string) => void;
  clearMediaSelection: () => void;
  
  openMediaLibrary: () => void;
  closeMediaLibrary: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  // Initial state
  isUploading: false,
  uploadProgress: 0,
  uploadQueue: [],
  selectedMedia: [],
  isMediaLibraryOpen: false,
  isUploadModalOpen: false,
  
  // Upload actions
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  addToUploadQueue: (files) => {
    const { uploadQueue } = get();
    set({ uploadQueue: [...uploadQueue, ...files] });
  },
  removeFromUploadQueue: (file) => {
    const { uploadQueue } = get();
    set({ uploadQueue: uploadQueue.filter(f => f !== file) });
  },
  clearUploadQueue: () => set({ uploadQueue: [] }),
  
  // Selection actions
  setSelectedMedia: (ids) => set({ selectedMedia: ids }),
  toggleMediaSelection: (id) => {
    const { selectedMedia } = get();
    const isSelected = selectedMedia.includes(id);
    
    if (isSelected) {
      set({ selectedMedia: selectedMedia.filter(mediaId => mediaId !== id) });
    } else {
      set({ selectedMedia: [...selectedMedia, id] });
    }
  },
  clearMediaSelection: () => set({ selectedMedia: [] }),
  
  // Modal actions
  openMediaLibrary: () => set({ isMediaLibraryOpen: true }),
  closeMediaLibrary: () => set({ isMediaLibraryOpen: false }),
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),
}));