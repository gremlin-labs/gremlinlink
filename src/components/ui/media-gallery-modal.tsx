'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Search, Grid, List } from 'lucide-react';
import { MediaAsset } from './image-selector';

interface MediaGalleryModalProps {
  onSelect: (asset: MediaAsset | MediaAsset[]) => void;
  onClose: () => void;
  _aspectRatio?: number;
  recommendedSize?: { width: number; height: number };
  mode?: 'single' | 'multiple';
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  onSelect,
  onClose,
  // _aspectRatio,
  recommendedSize,
  mode = 'single',
}) => {
  const [view, setView] = useState<'gallery' | 'upload'>('gallery');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load media assets
  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/media');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch {
      // Handle error silently or use proper error handling
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newAssets = data.assets || [];
        setAssets(prev => [...newAssets, ...prev]);
        
        // Auto-select uploaded assets
        if (newAssets.length > 0) {
          if (mode === 'single') {
            onSelect(newAssets[0]);
            return;
          } else {
            // For multiple mode, add to selected assets
            setSelectedAssets(prev => [...prev, ...newAssets]);
          }
        }
        
        // Switch to gallery view to show uploaded images
        setView('gallery');
      }
    } catch {
      // Handle error silently or use proper error handling
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleAssetClick = (asset: MediaAsset) => {
    if (mode === 'single') {
      setSelectedAsset(asset);
    } else {
      setSelectedAssets(prev => {
        const isSelected = prev.some(a => a.id === asset.id);
        if (isSelected) {
          return prev.filter(a => a.id !== asset.id);
        } else {
          return [...prev, asset];
        }
      });
    }
  };

  const handleSelect = () => {
    if (mode === 'single' && selectedAsset) {
      onSelect(selectedAsset);
    } else if (mode === 'multiple' && selectedAssets.length > 0) {
      onSelect(selectedAssets);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.original_filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] h-[90vh] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {mode === 'multiple' ? 'Select Images' : 'Select Image'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-6rem)]">
          {/* Header Controls */}
          <div className="flex flex-col items-start justify-between p-4 border-b gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={view === 'gallery' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('gallery')}
                >
                  Media Library
                </Button>
                <Button
                  variant={view === 'upload' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('upload')}
                >
                  Upload New
                </Button>
              </div>
              
              {view === 'gallery' && (
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {view === 'gallery' && (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden min-h-0">
            {view === 'gallery' ? (
              <div className="h-full overflow-y-auto p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Upload className="w-8 h-8 mb-3" />
                    <p className="font-medium">No images found</p>
                    <p className="text-sm">Upload some images to get started</p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'space-y-2'
                  }>
                    {filteredAssets.map(asset => {
                      const isSelected = mode === 'single' 
                        ? selectedAsset?.id === asset.id
                        : selectedAssets.some(a => a.id === asset.id);
                      
                      return (
                        <Card
                          key={asset.id}
                          className={`cursor-pointer transition-all duration-200 overflow-hidden ${
                            isSelected 
                              ? 'ring-2 ring-primary ring-offset-2' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleAssetClick(asset)}
                        >
                          {viewMode === 'grid' ? (
                            <div>
                              <div className="aspect-square overflow-hidden relative">
                                <Image
                                  src={asset.thumbnail_url || asset.url}
                                  alt={asset.filename}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                              </div>
                              <div className="p-1.5">
                                <p className="text-xs font-medium truncate">{asset.filename}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(asset.size_bytes)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center p-3 gap-3">
                              <div className="w-12 h-12 relative rounded overflow-hidden">
                                <Image
                                  src={asset.thumbnail_url || asset.url}
                                  alt={asset.filename}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{asset.filename}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{formatFileSize(asset.size_bytes)}</span>
                                  {asset.width && asset.height && (
                                    <span>{asset.width}×{asset.height}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="p-6"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  isDragOver 
                    ? 'border-primary bg-primary/10' 
                    : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5'
                }`}>
                  <div className={`p-3 rounded-full mx-auto mb-3 transition-colors ${
                    isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  } w-fit`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-medium mb-2">
                    {isDragOver ? 'Drop images here' : 'Upload Images'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Drag and drop images here, or click to select files
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supports: JPEG, PNG, WebP, GIF • Max 10MB per file
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild disabled={uploading} variant={isDragOver ? 'default' : 'outline'}>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      {uploading ? 'Uploading...' : 'Select Files'}
                    </label>
                  </Button>
                  {recommendedSize && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Recommended size: {recommendedSize.width}×{recommendedSize.height}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {view === 'gallery' && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                {mode === 'single' 
                  ? selectedAsset ? '1 image selected' : 'Select an image'
                  : `${selectedAssets.length} images selected`
                }
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSelect}
                  disabled={mode === 'single' ? !selectedAsset : selectedAssets.length === 0}
                >
                  Select
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 