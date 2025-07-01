'use client';

import { RedirectEditor } from './editors/RedirectEditor';
import { ArticleEditor } from './editors/ArticleEditor';
import { ImageEditor } from './editors/ImageEditor';
import { GalleryEditor } from './editors/GalleryEditor';
import { PageEditor } from './editors/PageEditor';
import { ContentBlock } from '@/lib/db/schema';

interface ContentConfigurationProps {
  slug: string;
  contentType: string;
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  onSave: (publish?: boolean) => void;
  isSaving: boolean;
}

export function ContentConfiguration({
  slug,
  contentType,
  formData,
  onChange,
  onSave,
  isSaving,
}: ContentConfigurationProps) {
  // Create a mock ContentBlock for the new editor interface
  // Use a valid UUID format for temp blocks to avoid database errors
  const mockBlock: ContentBlock = {
    id: '00000000-0000-0000-0000-000000000000', // Valid UUID format for temp blocks
    slug,
    type: 'root',
    parent_id: undefined,
    renderer: contentType,
    data: (formData.data as Record<string, unknown>) || formData || {},
    metadata: (formData.metadata as Record<string, unknown>) || {},
    display_order: 0,
    is_published: Boolean(formData.is_published ?? true),
    is_landing_block: false,
    is_private: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const handleBlockChange = (updates: Partial<ContentBlock>) => {
    // Merge the updates properly
    const newFormData = {
      ...formData,
      data: updates.data || formData.data,
      metadata: updates.metadata || formData.metadata,
    };
    
    onChange(newFormData);
  };

  const renderEditor = () => {
    const newEditorProps = {
      block: mockBlock,
      onChange: handleBlockChange,
    };

    const legacyEditorProps = {
      slug,
      formData,
      onChange,
      onSave,
      isSaving,
    };

    switch (contentType) {
      case 'redirect':
        return <RedirectEditor {...newEditorProps} />;
      case 'image':
        return <ImageEditor {...newEditorProps} />;
      case 'page':
        return <PageEditor {...newEditorProps} />;
      case 'article':
        return <ArticleEditor {...legacyEditorProps} />;
      case 'gallery':
        return <GalleryEditor {...legacyEditorProps} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Editor for &quot;{contentType}&quot; is not yet implemented.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configure Your Content</h2>
        <p className="text-muted-foreground">
          Set up your <strong>{contentType}</strong> at <span className="font-mono">gremlin.link/{slug}</span>
        </p>
      </div>

      {renderEditor()}
    </div>
  );
} 