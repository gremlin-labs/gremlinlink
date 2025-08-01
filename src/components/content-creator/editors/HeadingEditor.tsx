'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Palette, Type } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';

interface HeadingEditorProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

interface HeadingData {
  text: string;
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  alignment?: 'left' | 'center' | 'right';
  color?: string;
}

export const HeadingEditor: React.FC<HeadingEditorProps> = ({ block, onChange }) => {
  const data = block.data as unknown as HeadingData;

  const updateData = (key: keyof HeadingData, value: string) => {
    onChange({
      data: { ...block.data, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="w-5 h-5" />
            Heading Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="headingText" className="text-sm font-medium mb-2 block">Heading Text</Label>
            <Input
              id="headingText"
              value={data.text || ''}
              onChange={(e) => updateData('text', e.target.value)}
              placeholder="Enter your heading text"
              className="h-11 bg-[var(--color-input-contrast)]"
            />
          </div>

          <div>
            <Label htmlFor="headingLevel" className="text-sm font-medium mb-2 block">Heading Level</Label>
            <Select
              value={data.level || 'h2'}
              onValueChange={(value) => updateData('level', value)}
            >
              <SelectTrigger className="h-11 bg-[var(--color-input-contrast)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1 - Page Title</SelectItem>
                <SelectItem value="h2">H2 - Section Title</SelectItem>
                <SelectItem value="h3">H3 - Subsection</SelectItem>
                <SelectItem value="h4">H4 - Sub-subsection</SelectItem>
                <SelectItem value="h5">H5 - Minor Heading</SelectItem>
                <SelectItem value="h6">H6 - Smallest Heading</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Choose the semantic importance of your heading
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Text Alignment</Label>
            <RadioGroup
              value={data.alignment || 'left'}
              onValueChange={(value) => updateData('alignment', value)}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="left" id="align-left" className="sr-only" />
                <Label 
                  htmlFor="align-left" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full"
                >
                  Left
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="center" id="align-center" className="sr-only" />
                <Label 
                  htmlFor="align-center" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full"
                >
                  Center
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="right" id="align-right" className="sr-only" />
                <Label 
                  htmlFor="align-right" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full"
                >
                  Right
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="headingColor" className="text-sm font-medium mb-2 block">
              Text Color (Optional)
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className="w-10 h-10 rounded border border-input cursor-pointer"
                  style={{ backgroundColor: data.color || '#000000' }}
                  onClick={() => document.getElementById('headingColorPicker')?.click()}
                >
                  {!data.color && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  id="headingColor"
                  type="text"
                  value={data.color || ''}
                  onChange={(e) => updateData('color', e.target.value)}
                  placeholder="#000000 or rgb(0,0,0)"
                  className="flex-1 h-11 bg-[var(--color-input-contrast)]"
                />
                <input
                  id="headingColorPicker"
                  type="color"
                  value={data.color || '#000000'}
                  onChange={(e) => updateData('color', e.target.value)}
                  className="sr-only"
                />
              </div>
              {data.color && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateData('color', '')}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to use the default text color
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-background">
            {data.text ? (
              <div className={`text-${data.alignment || 'left'}`}>
                {data.level === 'h1' && <h1 className="text-4xl font-bold" style={{ color: data.color }}>{data.text}</h1>}
                {data.level === 'h2' && <h2 className="text-3xl font-bold" style={{ color: data.color }}>{data.text}</h2>}
                {data.level === 'h3' && <h3 className="text-2xl font-semibold" style={{ color: data.color }}>{data.text}</h3>}
                {data.level === 'h4' && <h4 className="text-xl font-semibold" style={{ color: data.color }}>{data.text}</h4>}
                {data.level === 'h5' && <h5 className="text-lg font-medium" style={{ color: data.color }}>{data.text}</h5>}
                {data.level === 'h6' && <h6 className="text-base font-medium" style={{ color: data.color }}>{data.text}</h6>}
                {!data.level && <h2 className="text-3xl font-bold" style={{ color: data.color }}>{data.text}</h2>}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">Enter text to see preview</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};