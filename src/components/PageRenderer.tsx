'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Eye, 
  Calendar,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { ImageGalleryModal } from '@/components/ui/image-gallery-modal';
import Image from 'next/image';

// Types
interface PageObject {
  id: string;
  object_type: 'link' | 'image' | 'post';
  object_id: string;
  display_order: number;
  layout_size: 'small' | 'medium' | 'large' | 'full';
  data: Record<string, unknown>;
}

interface Page {
  id: string;
  title: string;
  description: string | null;
  is_landing: boolean;
  theme: string;
  meta_image: string | null;
  objects: PageObject[];
}

interface PageRendererProps {
  page: Page;
  showTitle?: boolean;
  className?: string;
}

// Link Object Renderer
function LinkRenderer({ object }: { object: PageObject }) {
  const { data } = object;
  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
    full: 'p-8',
  };

  const handleClick = () => {
    // Track click analytics here
    window.open(String(data.target_url), '_blank', 'noopener,noreferrer');
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${sizeClasses[object.layout_size as keyof typeof sizeClasses]}`}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4">
          {data.image_url && String(data.image_url).trim() !== '' ? (
            <div className="flex-shrink-0">
              <Image
                src={String(data.image_url || '')}
                alt={String(data.title || '')}
                width={object.layout_size === 'small' ? 40 : object.layout_size === 'large' ? 80 : 60}
                height={object.layout_size === 'small' ? 40 : object.layout_size === 'large' ? 80 : 60}
                className="rounded-lg object-cover"
              />
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-gray-900 ${
              object.layout_size === 'small' ? 'text-sm' : 
              object.layout_size === 'large' ? 'text-xl' : 'text-lg'
            }`}>
              {String(data.title || '')}
            </h3>
            {data.description ? (
              <p className={`text-gray-600 mt-1 ${
                object.layout_size === 'small' ? 'text-xs' : 'text-sm'
              }`}>
                {String(data.description || '')}
              </p>
            ) : null}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {Number(data.clicks_count) || 0} clicks
              </Badge>
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Image Object Renderer
function ImageRenderer({ object }: { object: PageObject }) {
  const { data } = object;
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const sizeClasses = {
    small: 'max-w-xs',
    medium: 'max-w-md',
    large: 'max-w-2xl',
    full: 'w-full',
  };

  // Convert single image to gallery format for modal
  const galleryImages = [{
    url: String(data.url),
    alt_text: String(data.alt_text || data.title || 'Image'),
    caption: String(data.caption || data.title || ''),
  }];

  return (
    <>
      <div className={`${sizeClasses[object.layout_size as keyof typeof sizeClasses]} mx-auto`}>
        <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {data.url && String(data.url).trim() !== '' ? (
              <div onClick={() => setIsLightboxOpen(true)}>
                <Image
                  src={String(data.url || '')}
                  alt={String(data.alt_text || data.title || 'Image')}
                  width={Number(data.width) || 800}
                  height={Number(data.height) || 600}
                  className="w-full h-auto object-cover"
                  style={{ aspectRatio: data.width && data.height ? `${data.width}/${data.height}` : 'auto' }}
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No image URL provided</p>
                </div>
              </div>
            )}
            {(data.title || data.caption) ? (
              <div className="p-4">
                {data.title ? (
                  <h3 className="font-semibold text-gray-900 mb-1">{String(data.title || '')}</h3>
                ) : null}
                {data.caption ? (
                  <p className="text-sm text-gray-600">{String(data.caption || '')}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        images={galleryImages}
        initialIndex={0}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );
}

// Post Object Renderer
function PostRenderer({ object }: { object: PageObject }) {
  const { data } = object;
  const [isExpanded, setIsExpanded] = useState(false);

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'w-full',
  };

  // Render post content (simplified - would need proper block renderer for JSONB content)
  const renderContent = (content: Record<string, unknown>) => {
    if (typeof content === 'string') {
      return <div className="prose prose-gray max-w-none" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    
    // For JSONB content, we'd need a proper block renderer
    // For now, just show a placeholder
    return (
      <div className="prose prose-gray max-w-none">
        <p>Rich content would be rendered here...</p>
      </div>
    );
  };

  return (
    <div className={`${sizeClasses[object.layout_size as keyof typeof sizeClasses]} mx-auto`}>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Featured Image */}
          {data.featured_image ? (
            <div className="relative">
              <Image
                src={String(data.featured_image)}
                alt={String(data.title)}
                width={800}
                height={400}
                className="w-full h-48 object-cover"
              />
            </div>
          ) : null}

          {/* Content */}
          <div className="p-6">
            {/* Title */}
            <h2 className={`font-bold text-gray-900 mb-3 ${
              object.layout_size === 'small' ? 'text-lg' : 
              object.layout_size === 'large' ? 'text-3xl' : 'text-2xl'
            }`}>
              {String(data.title)}
            </h2>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              {data.published_at ? (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(String(data.published_at)).toLocaleDateString()}</span>
                </div>
              ) : null}
              {data.reading_time ? (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{Number(data.reading_time)} min read</span>
                </div>
              ) : null}
              {data.category ? (
                <Badge variant="secondary">{String(data.category)}</Badge>
              ) : null}
            </div>

            {/* Excerpt */}
            {data.excerpt ? (
              <p className="text-gray-600 mb-4 leading-relaxed">
                {String(data.excerpt)}
              </p>
            ) : null}

            {/* Content Preview */}
            {data.content ? (
              <div className={`${isExpanded ? '' : 'line-clamp-3'} mb-4`}>
                {renderContent(data.content as Record<string, unknown>)}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {data.tags && Array.isArray(data.tags) ? (
                  <div className="flex gap-1">
                    {(data.tags as string[]).slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {String(tag)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              
              <div className="flex gap-2">
                {data.content ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </Button>
                ) : null}
                {data.slug ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/posts/${String(data.slug)}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Full Post
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Object Renderer - Routes to appropriate renderer
function ObjectRenderer({ object }: { object: PageObject }) {
  switch (object.object_type) {
    case 'link':
      return <LinkRenderer object={object} />;
    case 'image':
      return <ImageRenderer object={object} />;
    case 'post':
      return <PostRenderer object={object} />;
    default:
      return null;
  }
}

// Main Page Renderer Component
export default function PageRenderer({ 
  page, 
  showTitle = true, 
  className = '',
}: PageRendererProps) {
  // Sort objects by display order
  const sortedObjects = [...page.objects].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Header */}
      {showTitle && (
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">{page.title}</h1>
          {page.description && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {page.description}
            </p>
          )}
        </div>
      )}

      {/* Page Objects */}
      <div className="space-y-6">
        {sortedObjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>This page doesn&apos;t have any content yet.</p>
          </div>
        ) : (
          sortedObjects.map((object) => (
            <div key={object.id} className="w-full">
              <ObjectRenderer object={object} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}