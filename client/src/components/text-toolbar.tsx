import { useState, useEffect } from "react";
import { Bold, AlignLeft, AlignRight, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TextElement } from "@shared/schema";
import { FONTS, getFont, preloadArabicPreviewFonts } from "@/lib/fonts";
import { containsArabic } from "@/lib/bidi-text";

interface TextToolbarProps {
  element: TextElement | null;
  onUpdate: (updates: Partial<TextElement>) => void;
}

const latinFonts = FONTS.filter((f) => !f.arabic);
const arabicFonts = FONTS.filter((f) => f.arabic);

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

  const selected = getFont(element.fontFamily);
  const arabicText = containsArabic(element.content);
  // A base-14 face cannot encode Arabic, so export silently substitutes one
  // that can. Say so rather than letting the preview and the file disagree.
  const willSubstitute = arabicText && !!selected.standard;

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
          className="mt-1.5 h-10 text-base"
          dir="auto"
          data-testid="input-text-content"
        />
      </div>

      <div>
        <Label htmlFor="font-family" className="text-xs font-medium">
          Font Family
        </Label>
        <Select
          value={selected.id}
          onValueChange={(value) => onUpdate({ fontFamily: value })}
          onOpenChange={(isOpen) => isOpen && preloadArabicPreviewFonts()}
        >
          <SelectTrigger className="mt-1.5 h-10" data-testid="select-font-family">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Latin</SelectLabel>
              {latinFonts.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  <span style={{ fontFamily: font.cssFamily }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Arabic — عربي</SelectLabel>
              {arabicFonts.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  <span style={{ fontFamily: font.cssFamily }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {willSubstitute && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Wand2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {selected.label} has no Arabic glyphs — an Arabic font will be
              used on export. Pick one above to preview it accurately.
            </span>
          </p>
        )}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label className="text-xs font-medium">Direction</Label>
          <ToggleGroup
            type="single"
            value={element.direction ?? "auto"}
            onValueChange={(value) =>
              value && onUpdate({ direction: value as TextElement["direction"] })
            }
            className="mt-1.5 justify-start"
            data-testid="toggle-text-direction"
          >
            <ToggleGroupItem value="auto" className="h-10 px-3 text-xs">
              Auto
            </ToggleGroupItem>
            <ToggleGroupItem value="ltr" className="h-10 px-3" aria-label="Left to right">
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="rtl" className="h-10 px-3" aria-label="Right to left">
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <Label className="text-xs font-medium">Weight</Label>
          <Toggle
            pressed={element.bold === true}
            onPressedChange={(pressed) => onUpdate({ bold: pressed })}
            className="mt-1.5 h-10 w-10"
            aria-label="Bold"
            data-testid="toggle-text-bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium">
          Font Size: {element.fontSize}px
        </Label>
        <Slider
          value={[element.fontSize]}
          onValueChange={([value]) => onUpdate({ fontSize: value })}
          min={8}
          max={120}
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
            className="flex-1 font-mono text-sm h-10"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}
