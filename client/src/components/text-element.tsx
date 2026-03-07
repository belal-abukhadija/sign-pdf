import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import type { TextElement as TextElementType } from "@shared/schema";

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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

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

  const scaledFontSize = element.fontSize * scale;
  const minTouchTarget = 44;

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
        minWidth: minTouchTarget,
        minHeight: minTouchTarget,
        display: "flex",
        alignItems: "center",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      data-testid={`text-element-${element.id}`}
    >
      <div className="relative group">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localContent}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-white dark:bg-gray-900 border-none outline-none touch-auto"
            style={{
              fontSize: scaledFontSize,
              fontFamily: element.fontFamily,
              color: element.color,
              minWidth: 80,
            }}
            data-testid="input-text-edit"
          />
        ) : (
          <span
            style={{
              fontSize: scaledFontSize,
              fontFamily: element.fontFamily,
              color: element.color,
              whiteSpace: "nowrap",
            }}
          >
            {element.content || "Enter text"}
          </span>
        )}
        {isSelected && !isEditing && (
          <>
            <button
              className="absolute -top-3 -right-3 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
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
