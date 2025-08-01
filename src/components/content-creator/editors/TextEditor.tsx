'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette, FileText } from 'lucide-react';
import { ContentBlock } from '@/lib/db/schema';

interface TextEditorProps {
  block: ContentBlock;
  onChange: (updates: Partial<ContentBlock>) => void;
}

interface TextData {
  content: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: 'small' | 'normal' | 'large' | 'xl';
  color?: string;
  backgroundColor?: string;
  padding?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({ block, onChange }) => {
  const data = block.data as unknown as TextData;

  const updateData = (key: keyof TextData, value: string | boolean) => {
    onChange({
      data: { ...block.data, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Text Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="textContent" className="text-sm font-medium mb-2 block">Text Content</Label>
            <Textarea
              id="textContent"
              value={data.content || ''}
              onChange={(e) => updateData('content', e.target.value)}
              placeholder="Enter your text content here..."
              rows={6}
              className="resize-none bg-[var(--color-input-contrast)]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Supports multiple paragraphs. Line breaks will be preserved.
            </p>
          </div>

          <div>
            <Label htmlFor="fontSize" className="text-sm font-medium mb-2 block">Font Size</Label>
            <Select
              value={data.fontSize || 'normal'}
              onValueChange={(value) => updateData('fontSize', value)}
            >
              <SelectTrigger className="h-11 bg-[var(--color-input-contrast)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="xl">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Text Alignment</Label>
            <RadioGroup
              value={data.alignment || 'left'}
              onValueChange={(value) => updateData('alignment', value)}
              className="grid grid-cols-4 gap-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="left" id="text-align-left" className="sr-only" />
                <Label 
                  htmlFor="text-align-left" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full text-sm"
                >
                  Left
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="center" id="text-align-center" className="sr-only" />
                <Label 
                  htmlFor="text-align-center" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full text-sm"
                >
                  Center
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="right" id="text-align-right" className="sr-only" />
                <Label 
                  htmlFor="text-align-right" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full text-sm"
                >
                  Right
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="justify" id="text-align-justify" className="sr-only" />
                <Label 
                  htmlFor="text-align-justify" 
                  className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground w-full text-sm"
                >
                  Justify
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="textColor" className="text-sm font-medium mb-2 block">
              Text Color (Optional)
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className="w-10 h-10 rounded border border-input cursor-pointer"
                  style={{ backgroundColor: data.color || '#000000' }}
                  onClick={() => document.getElementById('textColorPicker')?.click()}
                >
                  {!data.color && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  id="textColor"
                  type="text"
                  value={data.color || ''}
                  onChange={(e) => updateData('color', e.target.value)}
                  placeholder="#000000 or rgb(0,0,0)"
                  className="flex-1 h-11 bg-[var(--color-input-contrast)]"
                />
                <input
                  id="textColorPicker"
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
          </div>

          <div>
            <Label htmlFor="backgroundColor" className="text-sm font-medium mb-2 block">
              Background Color (Optional)
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div 
                  className="w-10 h-10 rounded border border-input cursor-pointer"
                  style={{ backgroundColor: data.backgroundColor || '#ffffff' }}
                  onClick={() => document.getElementById('bgColorPicker')?.click()}
                >
                  {!data.backgroundColor && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  id="backgroundColor"
                  type="text"
                  value={data.backgroundColor || ''}
                  onChange={(e) => updateData('backgroundColor', e.target.value)}
                  placeholder="#ffffff or rgb(255,255,255)"
                  className="flex-1 h-11 bg-[var(--color-input-contrast)]"
                />
                <input
                  id="bgColorPicker"
                  type="color"
                  value={data.backgroundColor || '#ffffff'}
                  onChange={(e) => updateData('backgroundColor', e.target.value)}
                  className="sr-only"
                />
              </div>
              {data.backgroundColor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateData('backgroundColor', '')}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="padding" className="text-sm font-medium">
              Add Padding
            </Label>
            <Switch
              id="padding"
              checked={data.padding || false}
              onCheckedChange={(checked) => updateData('padding', checked)}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-4">
            Add spacing around the text with a rounded background
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-card-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-6 bg-background">
            {data.content ? (
              <div 
                className={`
                  text-${data.alignment || 'left'}
                  ${data.fontSize === 'small' ? 'text-sm' : ''}
                  ${data.fontSize === 'large' ? 'text-lg' : ''}
                  ${data.fontSize === 'xl' ? 'text-xl' : ''}
                  ${data.fontSize === 'normal' || !data.fontSize ? 'text-base' : ''}
                  ${data.padding ? 'p-6 rounded-lg' : ''}
                  whitespace-pre-wrap
                `}
                style={{ 
                  color: data.color,
                  backgroundColor: data.backgroundColor
                }}
              >
                {data.content}
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