'use client';

// import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageSelector, MediaAsset } from '@/components/ui/image-selector';
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor';
import { LexicalContentRenderer } from '@/components/ui/lexical-content-renderer';
import { FileText, Eye } from 'lucide-react';
import Image from 'next/image';

interface ArticleFormData {
  title?: string;
  coverImage?: MediaAsset | null;
  excerpt?: string;
  content?: string;
  readingTime?: number;
  author?: string;
  tags?: string;
  [key: string]: unknown;
}

interface ArticleEditorProps {
  slug: string;
  formData: ArticleFormData;
  onChange: (data: ArticleFormData) => void;
  onSave: (publish?: boolean) => void;
  isSaving: boolean;
}

export function ArticleEditor({ slug, formData, onChange }: Omit<ArticleEditorProps, 'onSave' | 'isSaving'>) {
  const updateFormData = (updates: Partial<ArticleFormData>) => {
    onChange({ ...formData, ...updates });
  };

  const characterCount = (text: string, max: number) => (
    <div className="text-xs text-muted-foreground text-right">
      {text.length}/{max} characters
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Article Editor */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-5 h-5" />
            Article Content
          </CardTitle>
          <CardDescription>
            Create rich content with text, images, and formatting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Article Title */}
          <div className="space-y-2">
            <Label htmlFor="article-title" className="block mb-2 text-sm font-medium">Article Title *</Label>
            <Input
              id="article-title"
              value={formData.title || ''}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="Enter your article title"
              className="text-lg font-medium bg-input-contrast h-12"
              required
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="block mb-2 text-sm font-medium">Cover Image</Label>
            <ImageSelector
              value={formData.coverImage || null}
              onChange={(image) => updateFormData({ coverImage: image })}
              label=""
              helpText="Recommended size: 1920x1080 (16:9 aspect ratio)"
              aspectRatio={16/9}
              recommendedSize={{ width: 1920, height: 1080 }}
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="article-excerpt" className="block mb-2 text-sm font-medium">Excerpt</Label>
            <Textarea
              id="article-excerpt"
              value={formData.excerpt || ''}
              onChange={(e) => updateFormData({ excerpt: e.target.value })}
              placeholder="Brief summary for previews and SEO..."
              rows={3}
              maxLength={160}
              className="bg-input-contrast"
            />
            {characterCount(formData.excerpt || '', 160)}
            <p className="text-xs text-muted-foreground">
              Used in search results and social media previews
            </p>
          </div>

          {/* Rich Text Content Editor */}
          <div className="space-y-2">
            <Label className="block mb-2 text-sm font-medium">Article Content</Label>
            <div className="border rounded-lg overflow-hidden">
              <LexicalRichTextEditor
                value={formData.content || ''}
                onChange={(value) => updateFormData({ content: value })}
                placeholder="Start writing your article..."
                autoFocus={false}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the toolbar above to format your text, add headings, lists, links, and more. Supports markdown shortcuts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Article Settings */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Article Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reading-time" className="block mb-2 text-sm font-medium">Estimated Reading Time</Label>
              <Input
                id="reading-time"
                type="number"
                value={formData.readingTime || ''}
                onChange={(e) => updateFormData({ readingTime: parseInt(e.target.value) || 0 })}
                placeholder="5"
                className="bg-input-contrast h-11"
              />
              <p className="text-xs text-muted-foreground">Minutes (auto-calculated if empty)</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="author" className="block mb-2 text-sm font-medium">Author</Label>
              <Input
                id="author"
                value={formData.author || ''}
                onChange={(e) => updateFormData({ author: e.target.value })}
                placeholder="Author name"
                className="bg-input-contrast h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="block mb-2 text-sm font-medium">Tags</Label>
            <Input
              id="tags"
              value={formData.tags || ''}
              onChange={(e) => updateFormData({ tags: e.target.value })}
              placeholder="technology, web development, tutorial (comma separated)"
              className="bg-input-contrast h-11"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas for categorization and SEO
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Eye className="w-4 h-4" />
            Article Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-background">
              {/* Cover Image Preview */}
              {formData.coverImage && (
                <div className="aspect-video bg-muted relative">
                  <Image 
                    src={formData.coverImage.url || formData.coverImage.thumbnail_url} 
                    alt={formData.coverImage.alt || 'Cover image'} 
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              {/* Article Header */}
              <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">
                  {formData.title || 'Untitled Article'}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  {formData.author && <span>By {formData.author}</span>}
                  {formData.readingTime && <span>{formData.readingTime} min read</span>}
                  <span>Published at gremlin.link/{slug}</span>
                </div>
                
                {formData.excerpt && (
                  <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed">
                    {formData.excerpt}
                  </p>
                )}
                
                {/* Content Preview */}
                <LexicalContentRenderer 
                  content={formData.content || ''}
                  maxLength={500}
                />
                
                {/* Tags Preview */}
                {formData.tags && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {formData.tags.split(',').map((tag: string, index: number) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 