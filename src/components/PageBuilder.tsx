'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Link, 
  FileText,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface PageObject {
  id: string;
  object_type: 'link' | 'image' | 'post';
  object_id: string;
  display_order: number;
  layout_size: 'small' | 'medium' | 'large' | 'full';
  data: Record<string, unknown>;
}

interface AvailableObject {
  id: string;
  type: 'link' | 'image' | 'post';
  title: string;
  description?: string;
  url?: string;
  slug?: string;
}

interface PageBuilderProps {
  pageId: string;
  pageTitle: string;
  initialObjects: PageObject[];
  onObjectsChange?: (objects: PageObject[]) => void;
}

// Sortable Item Component
function SortablePageObject({ 
  object, 
  onRemove, 
  onLayoutChange,
}: { 
  object: PageObject;
  onRemove: (objectId: string) => void;
  onLayoutChange: (objectId: string, size: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: object.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link className="h-4 w-4" />;
      case 'image': return <FileText className="h-4 w-4" />;
      case 'post': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  const getObjectTitle = (object: PageObject) => {
    return String(object.data?.title || object.data?.alt_text || 'Untitled');
  };

  const getObjectDescription = (object: PageObject) => {
    if (object.object_type === 'link') {
      return String(object.data?.target_url || object.data?.description || '');
    }
    if (object.object_type === 'image') {
      return String(object.data?.caption || `${object.data?.width || ''}x${object.data?.height || ''}`);
    }
    if (object.object_type === 'post') {
      return String(object.data?.excerpt || 'Blog post');
    }
    return '';
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <Card className="border-2 hover:border-blue-200 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>

            {/* Object Icon & Info */}
            <div className="flex items-center gap-2 flex-1">
              {getObjectIcon(object.object_type)}
              <div className="flex-1">
                <div className="font-medium text-sm">{getObjectTitle(object)}</div>
                <div className="text-xs text-gray-500 truncate">
                  {getObjectDescription(object)}
                </div>
              </div>
            </div>

            {/* Object Type Badge */}
            <Badge variant="secondary" className="text-xs">
              {object.object_type}
            </Badge>

            {/* Layout Size Selector */}
            <Select
              value={object.layout_size}
              onValueChange={(value) => onLayoutChange(object.object_id, value)}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">S</SelectItem>
                <SelectItem value="medium">M</SelectItem>
                <SelectItem value="large">L</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(object.object_id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Object Library Component
function ObjectLibrary({ 
  onAddObject,
}: { 
  onAddObject: (object: AvailableObject) => void;
}) {
  const [availableObjects, setAvailableObjects] = useState<AvailableObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Fetch available objects
  const fetchAvailableObjects = async () => {
    setLoading(true);
    try {
      // Fetch links, images, and posts in parallel
      const [linksRes, imagesRes, postsRes] = await Promise.all([
        fetch('/api/admin/links'),
        fetch('/api/admin/images'),
        fetch('/api/admin/posts'),
      ]);

      const [linksData, imagesData, postsData] = await Promise.all([
        linksRes.ok ? linksRes.json() : { data: [] },
        imagesRes.ok ? imagesRes.json() : { data: [] },
        postsRes.ok ? postsRes.json() : { data: [] },
      ]);

      const objects: AvailableObject[] = [
        ...(linksData.data || []).map((link: Record<string, unknown>) => ({
          id: String(link.id),
          type: 'link' as const,
          title: String(link.title),
          description: String(link.description || ''),
          url: String(link.target_url || ''),
          slug: String(link.slug || ''),
        })),
        ...(imagesData.data || []).map((image: Record<string, unknown>) => ({
          id: String(image.id),
          type: 'image' as const,
          title: String(image.title || image.alt_text || 'Untitled Image'),
          description: String(image.caption || ''),
          url: String(image.url || ''),
        })),
        ...(postsData.data || []).map((post: Record<string, unknown>) => ({
          id: String(post.id),
          type: 'post' as const,
          title: String(post.title),
          description: String(post.excerpt || ''),
        })),
      ];

      setAvailableObjects(objects);
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Failed to load available objects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableObjects();
  }, []);

  // Filter objects based on search and type
  const filteredObjects = availableObjects.filter(obj => {
    const matchesSearch = obj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (obj.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || obj.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link className="h-4 w-4" />;
      case 'image': return <FileText className="h-4 w-4" />;
      case 'post': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search objects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Objects List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : filteredObjects.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm || selectedType !== 'all' ? 'No objects match your search' : 'No objects available'}
          </div>
        ) : (
          filteredObjects.map((obj) => (
            <Card key={obj.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {getObjectIcon(obj.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{obj.title}</div>
                    {obj.description && (
                      <div className="text-xs text-gray-500 truncate">{obj.description}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {obj.type}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => onAddObject(obj)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Main Page Builder Component
export default function PageBuilder({ 
  pageId, 
  pageTitle, 
  initialObjects,
  onObjectsChange,
}: PageBuilderProps) {
  const [objects, setObjects] = useState<PageObject[]>(initialObjects);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = objects.findIndex(obj => obj.id === active.id);
      const newIndex = objects.findIndex(obj => obj.id === over.id);

      const newObjects = arrayMove(objects, oldIndex, newIndex);
      
      // Update display_order for all objects
      const updatedObjects = newObjects.map((obj, index) => ({
        ...obj,
        display_order: index,
      }));

      setObjects(updatedObjects);
      onObjectsChange?.(updatedObjects);

      // Save new order to backend
      await saveObjectOrder(updatedObjects);
    }
  };

  // Save object order to backend
  const saveObjectOrder = async (orderedObjects: PageObject[]) => {
    setSaving(true);
    try {
      const orderData = orderedObjects.map((obj, index) => ({
        object_id: obj.object_id,
        display_order: index,
      }));

      const response = await fetch(`/api/admin/pages/${pageId}/objects/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objects: orderData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save order');
      }

      toast.success('Object order saved');
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Failed to save object order');
    } finally {
      setSaving(false);
    }
  };

  // Add object to page
  const handleAddObject = async (availableObject: AvailableObject) => {
    try {
      const response = await fetch(`/api/admin/pages/${pageId}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_type: availableObject.type,
          object_id: availableObject.id,
          layout_size: 'medium',
          display_order: objects.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add object');
      }

      const newPageObject = await response.json();
      const updatedObjects = [...objects, newPageObject];
      setObjects(updatedObjects);
      onObjectsChange?.(updatedObjects);
      setIsLibraryOpen(false);
      toast.success('Object added to page');
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Failed to add object');
    }
  };

  // Remove object from page
  const handleRemoveObject = async (objectId: string) => {
    try {
      const response = await fetch(`/api/admin/pages/${pageId}/objects/${objectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove object');
      }

      const updatedObjects = objects.filter(obj => obj.object_id !== objectId);
      setObjects(updatedObjects);
      onObjectsChange?.(updatedObjects);
      toast.success('Object removed from page');
    } catch {
      // Log error for debugging (could be replaced with proper logging service)
      toast.error('Failed to remove object');
    }
  };

  // Handle layout size change
  const handleLayoutChange = (objectId: string, size: string) => {
    const updatedObjects = objects.map(obj => 
      obj.object_id === objectId 
        ? { ...obj, layout_size: size as PageObject['layout_size'] }
        : obj
    );
    setObjects(updatedObjects);
    onObjectsChange?.(updatedObjects);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{pageTitle}</h2>
          <p className="text-gray-600">Drag and drop to reorder objects</p>
        </div>
        <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Object
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Object to Page</DialogTitle>
              <DialogDescription>
                Choose from your available links, images, and posts
              </DialogDescription>
            </DialogHeader>
            <ObjectLibrary onAddObject={handleAddObject} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Page Objects */}
      <div className="space-y-4">
        {objects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No objects yet</h3>
            <p className="mb-4">Add some links, images, or posts to get started</p>
            <Button onClick={() => setIsLibraryOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Object
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={objects.map(obj => obj.id)}
              strategy={verticalListSortingStrategy}
            >
              {objects.map((object) => (
                <SortablePageObject
                  key={object.id}
                  object={object}
                  onRemove={handleRemoveObject}
                  onLayoutChange={handleLayoutChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving changes...
        </div>
      )}
    </div>
  );
}