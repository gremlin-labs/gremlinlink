'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageSelector, MediaAsset } from '@/components/ui/image-selector';
import { IconPicker } from '@/components/IconPicker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Info } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';

interface RedirectEditorProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

interface RedirectData {
  url: string;
  statusCode: number;
  // Card display options
  cardTitle?: string;
  cardDescription?: string;
  cardImage?: MediaAsset;
  icon?: string;
}

export const RedirectEditor: React.FC<RedirectEditorProps> = ({ block, onChange }) => {
  const [showDisplayOptions, setShowDisplayOptions] = useState(true);
  
  const data = block.data as unknown as RedirectData;

  const updateData = (key: keyof RedirectData, value: string | number | MediaAsset | null) => {
    const newData = { ...block.data, [key]: value };
    const newMetadata = { ...block.metadata };

    // Also update metadata for card display options to ensure compatibility
    if (key === 'cardTitle') {
      newMetadata.title = value as string;
    } else if (key === 'cardDescription') {
      newMetadata.description = value as string;
    } else if (key === 'cardImage') {
      newMetadata.image = value as MediaAsset;
    }

    onChange({
      data: newData,
      metadata: newMetadata,
    });
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Redirect Configuration */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Redirect Configuration
            <Info className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <div>
            <Label htmlFor="url" className="block mb-2 text-sm font-medium">Destination URL</Label>
            <Input
              id="url"
              type="url"
              value={data.url || ''}
              onChange={(e) => updateData('url', e.target.value)}
              placeholder="https://example.com"
              required
              className="bg-input-contrast h-11 text-base"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Where users will be redirected when they visit this link
            </p>
          </div>

          <div>
            <Label htmlFor="statusCode" className="block mb-2 text-sm font-medium">Redirect Type</Label>
            <Select
              value={String(data.statusCode || 302)}
              onValueChange={(value) => updateData('statusCode', parseInt(value))}
            >
              <SelectTrigger className="bg-input-contrast h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                <SelectItem value="307">307 - Temporary (Preserve Method)</SelectItem>
                <SelectItem value="308">308 - Permanent (Preserve Method)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Use 301 for permanent moves, 302 for temporary redirects
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card Display Options */}
      <Collapsible open={showDisplayOptions} onOpenChange={setShowDisplayOptions}>
        <Card className="bg-card-elevated">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors px-4 sm:px-6 py-3 sm:py-4">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  Card Display & SEO
                  <Info className="w-4 h-4 text-muted-foreground" />
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${showDisplayOptions ? 'rotate-180' : ''}`} />
              </CardTitle>
              <p className="text-sm text-muted-foreground text-left pr-6">
                Customize how this redirect appears when embedded in pages and shared on social media
                <span className="text-xs ml-2 opacity-75">(Click to {showDisplayOptions ? 'collapse' : 'expand'})</span>
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4 sm:space-y-6 pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Display Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground border-b pb-2">Display Information</h4>
                
                <div>
                  <Label htmlFor="cardTitle" className="block mb-2 text-sm font-medium">Title</Label>
                  <Input
                    id="cardTitle"
                    value={data.cardTitle || ''}
                    onChange={(e) => updateData('cardTitle', e.target.value)}
                    placeholder={data.url ? extractDomain(data.url) : 'Title for cards and search engines'}
                    className="bg-input-contrast h-11 text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Used for card display and search engine results (50-60 characters recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="cardDescription" className="block mb-2 text-sm font-medium">Description</Label>
                  <Textarea
                    id="cardDescription"
                    value={data.cardDescription || ''}
                    onChange={(e) => updateData('cardDescription', e.target.value)}
                    placeholder="Brief description for cards, search engines, and social media"
                    rows={3}
                    className="bg-input-contrast text-base resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Used for card display and social media previews (150-160 characters recommended)
                  </p>
                </div>
              </div>

              {/* Visual Elements */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground border-b pb-2">Visual Elements</h4>
                
                <div>
                  <ImageSelector
                    value={data.cardImage || null}
                    onChange={(image) => updateData('cardImage', image)}
                    label="Image"
                    helpText="Used for card display and social media sharing (Open Graph)"
                    recommendedSize={{ width: 1200, height: 630 }}
                    aspectRatio={1200 / 630}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended size: 1200×630 pixels. Used for both card display and social media sharing.
                  </p>
                </div>

                <div>
                  <Label className="block mb-2 text-sm font-medium">Icon</Label>
                  <IconPicker
                    value={data.icon || ''}
                    onChange={(icon) => updateData('icon', icon)}
                    placeholder="Choose an icon to represent this redirect"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Optional icon displayed alongside the title in cards and lists
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Preview Card */}
      {(data.cardTitle || data.cardDescription || data.cardImage) && (
        <Card className="bg-card-elevated">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              How this redirect will appear when displayed as a card
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="border rounded-lg p-4 bg-background">
              <div className="flex flex-col sm:flex-row gap-4">
                {data.cardImage && (
                  <div className="w-full sm:w-24 h-32 sm:h-16 flex-shrink-0">
                    <Image
                      src={data.cardImage.url}
                      alt={data.cardTitle || 'Preview'}
                      width={96}
                      height={64}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {data.icon && (
                      <span className="text-lg flex-shrink-0">{data.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">
                        {data.cardTitle || extractDomain(data.url || '')}
                      </h3>
                      {data.cardDescription && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {data.cardDescription}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {data.url}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 