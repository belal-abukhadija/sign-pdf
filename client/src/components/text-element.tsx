import { useState, useRef, useCallback, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import type { TextElement as TextElementType } from "@shared/schema";
import { LINE_HEIGHT_RATIO } from "@/lib/pdf-utils";
import { ensurePreviewFont, resolveFontFor } from "@/lib/fonts";
import { resolveDirection, type TextDirection } from "@/lib/bidi-text";

interface TextElementProps {
  element: TextElementType;
  isSelected: boolean;
  scale: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElementType>) => void;
  onDelete: () => void;
}

export function TextElement({
  element,
  isSelected,
  scale,
  onSelect,
  onUpdate,
  onDelete,
}: TextElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(element.content);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const reportedSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (!isEditing) {
      setLocalContent(element.content);
    }
  }, [element.content, isEditing]);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      onSelect();
      if (!isEditing) {
        setIsDragging(true);
        const rect = elementRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top,
          });
        }
      }
    },
    [onSelect, isEditing]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startDrag(e.clientX, e.clientY);
    },
    [startDrag]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    },
    [startDrag]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (isDragging && elementRef.current) {
        const parent = elementRef.current.parentElement;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const newX = (clientX - parentRect.left - dragOffset.x) / scale;
          const newY = (clientY - parentRect.top - dragOffset.y) / scale;
          onUpdate({ x: Math.max(0, newX), y: Math.max(0, newY) });
        }
      }
    },
    [isDragging, dragOffset, scale, onUpdate]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => handleMove(e.clientX, e.clientY),
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [isDragging, handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  const startEditing = useCallback(() => {
    setIsDragging(false);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing();
    },
    [startEditing]
  );

  const handleInputBlur = useCallback(() => {
    onUpdate({ content: localContent });
    setIsEditing(false);
  }, [localContent, onUpdate]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalContent(e.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        onUpdate({ content: localContent });
        setIsEditing(false);
      }
      if (e.key === "Escape") {
        setLocalContent(element.content);
        setIsEditing(false);
      }
    },
    [localContent, element.content, onUpdate]
  );

  const definition = resolveFontFor(element.content, element.fontFamily);
  const direction = resolveDirection(
    element.content,
    (element.direction as TextDirection) ?? "auto"
  );

  // Load the exact TTF the exporter will embed, so what is on screen is what
  // lands in the file.
  useEffect(() => {
    void ensurePreviewFont(definition, element.bold === true);
  }, [definition, element.bold]);

  const scaledFontSize = element.fontSize * scale;
  const minTouchTarget = 44;

  // The stored width/height start as guesses. Measuring the rendered text and
  // writing the real size back keeps the page-bounds clamp honest for long
  // strings, and gives the element list something accurate to hit-test.
  useEffect(() => {
    const span = textRef.current;
    if (!span || isEditing || scale <= 0) return;

    const measure = () => {
      const width = span.offsetWidth / scale;
      const height = span.offsetHeight / scale;
      if (
        Math.abs(width - reportedSize.current.width) > 0.5 ||
        Math.abs(height - reportedSize.current.height) > 0.5
      ) {
        reportedSize.current = { width, height };
        onUpdate({ width, height });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(span);
    return () => observer.disconnect();
  }, [scale, isEditing, element.content, element.fontSize, element.bold, element.fontFamily, onUpdate]);

  const textStyle: React.CSSProperties = {
    fontSize: scaledFontSize,
    fontFamily: definition.cssFamily,
    fontWeight: element.bold ? 700 : 400,
    color: element.color,
    // Matches the half-leading model the PDF exporter reproduces.
    lineHeight: LINE_HEIGHT_RATIO,
    direction,
    unicodeBidi: "plaintext",
    whiteSpace: "pre",
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move select-none ${
        isEditing ? "touch-auto" : "touch-none"
      } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""} ${
        isDragging ? "opacity-70" : ""
      }`}
      style={{
        left: element.x * scale,
        top: element.y * scale,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      data-testid={`text-element-${element.id}`}
    >
      <div className="relative group">
        {/* Invisible pad that guarantees a 44px touch target without changing
            where the text itself sits. */}
        {!isEditing && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: minTouchTarget, height: minTouchTarget }}
          />
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localContent}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-white border-none outline-none touch-auto"
            style={{
              ...textStyle,
              // Never below 16px: iOS Safari zooms the whole page in on focus
              // for smaller inputs, which throws the editor viewport off.
              fontSize: Math.max(scaledFontSize, 16),
              minWidth: 80,
            }}
            data-testid="input-text-edit"
          />
        ) : (
          <span ref={textRef} style={textStyle}>
            {element.content || "Enter text"}
          </span>
        )}
        {isSelected && !isEditing && (
          <>
            {/* Touch devices have no double-click, so editing needs its own
                explicit control rather than a hidden gesture. */}
            <button
              className="absolute -top-4 -left-4 p-2 bg-primary text-primary-foreground rounded-full shadow-md z-10 touch-none"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              aria-label="Edit text"
              data-testid="button-edit-text"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="absolute -top-4 -right-4 p-2 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 z-10 touch-none"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete text"
              data-testid="button-delete-text"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
