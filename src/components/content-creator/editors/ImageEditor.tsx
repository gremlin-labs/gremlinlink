'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageSelector, MediaAsset } from '@/components/ui/image-selector';
import { Info } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';

interface ImageEditorProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

interface ImageData {
  image?: MediaAsset;
  alt: string;
  caption?: string;
  clickAction: 'lightbox' | 'link' | 'none';
  linkUrl?: string;
  url?: string;
  width?: number;
  height?: number;
  filename?: string;
  size_bytes?: number;
  mime_type?: string;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ block, onChange }) => {
  const data = block.data as unknown as ImageData;

  const updateData = (key: keyof ImageData, value: string | MediaAsset | null) => {
    const newData = { ...block.data, [key]: value };
    
    // If updating the image, also extract URL and metadata for compatibility
    if (key === 'image' && value && typeof value === 'object') {
      const mediaAsset = value as MediaAsset;
      newData.url = mediaAsset.url;
      newData.width = mediaAsset.width;
      newData.height = mediaAsset.height;
      newData.filename = mediaAsset.filename;
      newData.size_bytes = mediaAsset.size_bytes;
      newData.mime_type = mediaAsset.mime_type;
    }
    
    onChange({
      data: newData,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Image Selection */}
      <Card className="bg-card-elevated">
        <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Image
            <Info className="w-4 h-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <ImageSelector
            value={data.image || null}
            onChange={(image) => updateData('image', image)}
            label="Select Image"
            helpText="Choose from your media library or upload a new image"
          />

          {data.image && (
            <>
              <div>
                <Label htmlFor="alt" className="block mb-2 text-sm font-medium">Alt Text (Required)</Label>
                <Input
                  id="alt"
                  value={data.alt || ''}
                  onChange={(e) => updateData('alt', e.target.value)}
                  placeholder="Describe this image for accessibility"
                  required
                  className="bg-input-contrast h-11 text-base"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Required for accessibility. Describe what&apos;s in the image.
                </p>
              </div>

              <div>
                <Label htmlFor="caption" className="block mb-2 text-sm font-medium">Caption</Label>
                <Input
                  id="caption"
                  value={data.caption || ''}
                  onChange={(e) => updateData('caption', e.target.value)}
                  placeholder="Optional caption below image"
                  className="bg-input-contrast h-11 text-base"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Click Behavior */}
      {data.image && (
        <Card className="bg-card-elevated">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Click Behavior
              <Info className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div>
              <Label className="block mb-3 text-sm font-medium">What happens when users click the image?</Label>
              <RadioGroup
                value={data.clickAction || 'lightbox'}
                onValueChange={(value: string) => updateData('clickAction', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lightbox" id="lightbox" />
                  <Label htmlFor="lightbox" className="cursor-pointer text-sm">
                    Open in lightbox (recommended)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link" className="cursor-pointer text-sm">
                    Link to URL
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer text-sm">
                    No action
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {data.clickAction === 'link' && (
              <div>
                <Label htmlFor="linkUrl" className="block mb-2 text-sm font-medium">Link URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={data.linkUrl || ''}
                  onChange={(e) => updateData('linkUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="bg-input-contrast h-11 text-base"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Details */}
      {data.image && (
        <Card className="bg-card-elevated">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              Image Details
              <Info className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Filename</div>
                <div className="truncate">{data.image.filename}</div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">File Size</div>
                <div>{formatFileSize(data.image.size_bytes)}</div>
              </div>
              {data.image.width && data.image.height && (
                <>
                  <div>
                    <div className="font-medium text-muted-foreground">Dimensions</div>
                    <div>{data.image.width}×{data.image.height}</div>
                  </div>
                  <div>
                    <div className="font-medium text-muted-foreground">Aspect Ratio</div>
                    <div>{(data.image.width / data.image.height).toFixed(2)}:1</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {data.image && (
        <Card className="bg-card-elevated">
          <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
            <CardTitle className="text-base sm:text-lg">Preview</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-background">
                <Image
                  src={data.image.url}
                  alt={data.alt || data.image.filename}
                  width={data.image.width || 800}
                  height={data.image.height || 600}
                  className="w-full h-auto object-cover"
                />
                {data.caption && (
                  <div className="p-3 text-sm text-muted-foreground text-center border-t">
                    {data.caption}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {data.clickAction === 'lightbox' && 'Click to open in lightbox'}
                {data.clickAction === 'link' && data.linkUrl && `Click to visit ${data.linkUrl}`}
                {data.clickAction === 'none' && 'Image is not clickable'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function formatFileSize(bytes?: number) {
  if (!bytes) return 'Unknown size';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
} 