import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { TextElement } from "@shared/schema";

interface TextToolbarProps {
  element: TextElement | null;
  onUpdate: (updates: Partial<TextElement>) => void;
}

const fontFamilies = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier New" },
];

export function TextToolbar({ element, onUpdate }: TextToolbarProps) {
  const [localContent, setLocalContent] = useState(element?.content || "");

  useEffect(() => {
    setLocalContent(element?.content || "");
  }, [element?.id, element?.content]);

  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <p>Select a text element to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label htmlFor="text-content" className="text-xs font-medium">
          Text Content
        </Label>
        <Input
          id="text-content"
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={() => onUpdate({ content: localContent })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onUpdate({ content: localContent });
            }
          }}
          className="mt-1.5"
          data-testid="input-text-content"
        />
      </div>

      <div>
        <Label htmlFor="font-family" className="text-xs font-medium">
          Font Family
        </Label>
        <Select
          value={element.fontFamily}
          onValueChange={(value) => onUpdate({ fontFamily: value })}
        >
          <SelectTrigger className="mt-1.5" data-testid="select-font-family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium">
          Font Size: {element.fontSize}px
        </Label>
        <Slider
          value={[element.fontSize]}
          onValueChange={([value]) => onUpdate({ fontSize: value })}
          min={8}
          max={72}
          step={1}
          className="mt-2"
          data-testid="slider-font-size"
        />
      </div>

      <div>
        <Label htmlFor="text-color" className="text-xs font-medium">
          Text Color
        </Label>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="color"
            id="text-color"
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-10 h-10 rounded border cursor-pointer"
            data-testid="input-text-color"
          />
          <Input
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}
