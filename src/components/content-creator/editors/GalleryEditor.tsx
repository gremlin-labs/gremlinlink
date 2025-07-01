'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup } from '@/components/ui/radio-group';
import { MultiImageSelector } from '@/components/ui/multi-image-selector';
import Image from 'next/image';

import { Images, GripVertical, X, Eye, Grid3X3, LayoutGrid, Play } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  alt?: string;
  caption?: string;
  size_bytes: number;
  mime_type: string;
}

interface GalleryFormData {
  images?: MediaAsset[];
  layout?: string;
  columns?: number;
  gap?: string;
  clickBehavior?: string;
  [key: string]: unknown;
}

interface GalleryEditorProps {
  slug: string;
  formData: GalleryFormData;
  onChange: (data: GalleryFormData) => void;
  onSave: (publish?: boolean) => void;
  isSaving: boolean;
}

export function GalleryEditor({ slug, formData, onChange }: Omit<GalleryEditorProps, 'onSave' | 'isSaving'>) {

  const updateFormData = (updates: Partial<GalleryFormData>) => {
    onChange({ ...formData, ...updates });
  };

  const addImages = (newImages: MediaAsset[]) => {
    const currentImages = formData.images || [];
    updateFormData({ 
      images: [...(currentImages as MediaAsset[]), ...newImages.map(img => ({ ...img, alt: img.alt || '', caption: img.caption || '' }))],
    });
  };

  const handleMultiImageSelect = (assets: import('@/components/ui/multi-image-selector').MediaAsset[]) => {
    // Convert to local MediaAsset format
    const convertedAssets: MediaAsset[] = assets.map(asset => ({
      id: asset.id,
      filename: asset.filename,
      url: asset.url,
      thumbnail_url: asset.thumbnail_url,
      alt: asset.alt || '',
      caption: '', // Initialize empty caption for new images
      size_bytes: asset.size_bytes || 0,
      mime_type: asset.mime_type || 'image/jpeg',
    }));
    addImages(convertedAssets);
  };



  const removeImage = (index: number) => {
    const images = [...(formData.images || [])];
    images.splice(index, 1);
    updateFormData({ images });
  };

  const updateImageAlt = (index: number, alt: string) => {
    const images = [...(formData.images || [])];
    images[index] = { ...images[index], alt };
    updateFormData({ images });
  };

  const updateImageCaption = (index: number, caption: string) => {
    const images = [...(formData.images || [])];
    images[index] = { ...images[index], caption };
    updateFormData({ images });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const images = Array.from(formData.images || []);
    const [reorderedItem] = images.splice(result.source.index, 1);
    images.splice(result.destination.index, 0, reorderedItem);

    updateFormData({ images });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Gallery Images Management */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Images className="w-5 h-5" />
            Gallery Images
          </CardTitle>
          <CardDescription>
            Add, arrange, and configure images for your gallery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Add Images Section */}
          <div className="space-y-3">
            <MultiImageSelector
              onSelect={handleMultiImageSelect}
              label="Add Images to Gallery"
              helpText="Select multiple images from your library or upload new ones"
            />
          </div>

          {/* Gallery Images Management */}
          {formData.images && formData.images.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Gallery Images ({formData.images.length})</Label>
              </div>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="gallery-images">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {formData.images?.map((image: MediaAsset, index: number) => (
                        <Draggable 
                          key={image.id} 
                          draggableId={image.id} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-background ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              {/* Mobile: Top row with drag handle and remove button */}
                              <div className="flex items-center justify-between w-full sm:hidden">
                                <div 
                                  className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded" 
                                  {...provided.dragHandleProps}
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeImage(index)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Desktop: Drag handle */}
                              <div 
                                className="hidden sm:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded" 
                                {...provided.dragHandleProps}
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />
                              </div>
                              
                              {/* Image thumbnail */}
                              <div className="flex-shrink-0 w-full sm:w-auto">
                                <Image 
                                  src={image.thumbnail_url} 
                                  alt={image.alt || image.filename} 
                                  width={80}
                                  height={80}
                                  className="w-full h-32 sm:w-20 sm:h-20 object-cover rounded border"
                                />
                              </div>
                              
                              {/* Form fields */}
                              <div className="flex-1 space-y-3 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium">Alt Text (Required)</Label>
                                    <Input
                                      value={image.alt || ''}
                                      onChange={(e) => updateImageAlt(index, e.target.value)}
                                      placeholder="Describe this image"
                                      className="text-sm bg-input-contrast h-10"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium">Caption (Optional)</Label>
                                    <Input
                                      value={image.caption || ''}
                                      onChange={(e) => updateImageCaption(index, e.target.value)}
                                      placeholder="Image caption"
                                      className="text-sm bg-input-contrast h-10"
                                    />
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  {image.filename} • {Math.round(image.size_bytes / 1024)}KB
                                </div>
                              </div>
                              
                              {/* Desktop: Remove button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImage(index)}
                                className="hidden sm:flex text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gallery Layout & Settings */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Gallery Layout & Settings</CardTitle>
          <CardDescription>
            Configure how your gallery will be displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Layout Selection */}
          <div className="space-y-3">
            <Label className="block mb-2 text-sm font-medium">Layout Style</Label>
            <RadioGroup
              value={formData.layout || 'grid'}
              onValueChange={(value) => updateFormData({ layout: value })}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input 
                  type="radio" 
                  value="grid" 
                  checked={formData.layout === 'grid' || !formData.layout}
                  onChange={() => updateFormData({ layout: 'grid' })}
                  className="sr-only"
                />
                <Grid3X3 className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">Grid</div>
                  <div className="text-xs text-muted-foreground">Equal sized images in rows</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input 
                  type="radio" 
                  value="masonry" 
                  checked={formData.layout === 'masonry'}
                  onChange={() => updateFormData({ layout: 'masonry' })}
                  className="sr-only"
                />
                <LayoutGrid className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">Masonry</div>
                  <div className="text-xs text-muted-foreground">Pinterest-style layout</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <input 
                  type="radio" 
                  value="carousel" 
                  checked={formData.layout === 'carousel'}
                  onChange={() => updateFormData({ layout: 'carousel' })}
                  className="sr-only"
                />
                <Play className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">Carousel</div>
                  <div className="text-xs text-muted-foreground">Horizontal scrolling</div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Grid-specific settings */}
          {(formData.layout === 'grid' || !formData.layout) && (
            <div className="space-y-2">
              <Label className="block mb-2">Grid Columns</Label>
              <Select
                value={String(formData.columns || 3)}
                onValueChange={(value) => updateFormData({ columns: parseInt(value) })}
              >
                <SelectTrigger className="bg-input-contrast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="5">5 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gap/Spacing */}
          <div className="space-y-2">
            <Label className="block mb-2">Image Spacing</Label>
            <Select
              value={formData.gap || 'medium'}
              onValueChange={(value) => updateFormData({ gap: value })}
            >
              <SelectTrigger className="bg-input-contrast">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Gap</SelectItem>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Click Behavior */}
          <div className="space-y-3">
            <Label className="block mb-2">Click Behavior</Label>
            <RadioGroup
              value={formData.clickBehavior || 'lightbox'}
              onValueChange={(value) => updateFormData({ clickBehavior: value })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  value="lightbox" 
                  checked={formData.clickBehavior === 'lightbox' || !formData.clickBehavior}
                  onChange={() => updateFormData({ clickBehavior: 'lightbox' })}
                />
                <Label>Open in lightbox (recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  value="none" 
                  checked={formData.clickBehavior === 'none'}
                  onChange={() => updateFormData({ clickBehavior: 'none' })}
                />
                <Label>No click action</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Preview */}
      <Card className="bg-card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Gallery Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-background">
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Gallery</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.images?.length || 0} images • {formData.layout || 'grid'} layout • Available at gremlin.link/{slug}
                </p>
              </div>
              
              {formData.images && formData.images.length > 0 ? (
                <div className={`
                  ${formData.layout === 'grid' || !formData.layout 
                    ? `grid grid-cols-${formData.columns || 3} gap-${formData.gap === 'large' ? '4' : formData.gap === 'small' ? '1' : '2'}`
                    : formData.layout === 'carousel'
                    ? 'flex gap-2 overflow-x-auto'
                    : formData.layout === 'masonry'
                    ? 'columns-3 gap-2'
                    : 'space-y-2'
                  }
                `}>
                  {formData.images.slice(0, 6).map((image: MediaAsset) => (
                    <div key={image.id} className="relative group">
                      <Image 
                        src={image.thumbnail_url} 
                        alt={image.alt || image.filename}
                        width={200}
                        height={96}
                        className={`
                          w-full object-cover rounded border
                          ${formData.layout === 'carousel' ? 'h-32 flex-shrink-0' : 'h-24'}
                        `}
                      />
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b">
                          {image.caption}
                        </div>
                      )}
                    </div>
                  ))}
                  {formData.images.length > 6 && (
                    <div className="flex items-center justify-center h-24 bg-muted rounded border text-muted-foreground">
                      +{formData.images.length - 6} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Images className="w-8 h-8 mx-auto mb-2" />
                  <p>No images added yet</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
} 