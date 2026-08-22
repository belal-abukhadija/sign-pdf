import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import type { SignatureElement as SignatureElementType } from "@shared/schema";

interface SignatureElementProps {
  element: SignatureElementType;
  isSelected: boolean;
  scale: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<SignatureElementType>) => void;
  onDelete: () => void;
}

export function SignatureElement({
  element,
  isSelected,
  scale,
  onSelect,
  onUpdate,
  onDelete,
}: SignatureElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      onSelect();
      setIsDragging(true);
      const rect = elementRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
      }
    },
    [onSelect]
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

  const startResize = useCallback(
    (clientX: number, clientY: number, corner: string) => {
      setIsResizing(true);
      setResizeCorner(corner);
      setInitialSize({ width: element.width, height: element.height });
      setInitialPos({ x: clientX, y: clientY });
    },
    [element.width, element.height]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.stopPropagation();
      startResize(e.clientX, e.clientY, corner);
    },
    [startResize]
  );

  const handleResizeTouchStart = useCallback(
    (e: React.TouchEvent, corner: string) => {
      e.stopPropagation();
      const touch = e.touches[0];
      startResize(touch.clientX, touch.clientY, corner);
    },
    [startResize]
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
      if (isResizing && resizeCorner) {
        const deltaX = (clientX - initialPos.x) / scale;
        const deltaY = (clientY - initialPos.y) / scale;
        const aspectRatio = initialSize.width / initialSize.height;

        let newWidth = initialSize.width;
        let newHeight = initialSize.height;

        if (resizeCorner.includes("e")) {
          newWidth = Math.max(50, initialSize.width + deltaX);
          newHeight = newWidth / aspectRatio;
        } else if (resizeCorner.includes("w")) {
          newWidth = Math.max(50, initialSize.width - deltaX);
          newHeight = newWidth / aspectRatio;
        }

        if (resizeCorner.includes("s")) {
          newHeight = Math.max(30, initialSize.height + deltaY);
          newWidth = newHeight * aspectRatio;
        } else if (resizeCorner.includes("n")) {
          newHeight = Math.max(30, initialSize.height - deltaY);
          newWidth = newHeight * aspectRatio;
        }

        onUpdate({ width: newWidth, height: newHeight });
      }
    },
    [isDragging, isResizing, dragOffset, scale, resizeCorner, initialPos, initialSize, onUpdate]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => handleMove(e.clientX, e.clientY),
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (isDragging || isResizing) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [isDragging, isResizing, handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeCorner(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
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
  }, [isDragging, isResizing, handleMouseMove, handleTouchMove, handleEnd]);

  const scaledWidth = element.width * scale;
  const scaledHeight = element.height * scale;
  const minTouchTarget = 44;
  const handleSize = 24;

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move select-none touch-none ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
      } ${isDragging ? "opacity-70" : ""}`}
      style={{
        left: element.x * scale,
        top: element.y * scale,
        width: Math.max(scaledWidth, minTouchTarget),
        height: Math.max(scaledHeight, minTouchTarget),
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      data-testid={`signature-element-${element.id}`}
    >
      <img
        src={element.signatureData}
        alt="Signature"
        className="w-full h-full object-contain pointer-events-none"
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
        draggable={false}
      />
      {isSelected && (
        <>
          <button
            className="absolute -top-4 -right-4 p-2 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 z-10 touch-none"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete signature"
            data-testid="button-delete-signature"
          >
            <X className="h-4 w-4" />
          </button>
          {["nw", "ne", "sw", "se"].map((corner) => (
            <div
              key={corner}
              className="absolute bg-primary border-2 border-white rounded-full touch-none"
              style={{
                width: handleSize,
                height: handleSize,
                top: corner.includes("n") ? -handleSize / 2 : "auto",
                bottom: corner.includes("s") ? -handleSize / 2 : "auto",
                left: corner.includes("w") ? -handleSize / 2 : "auto",
                right: corner.includes("e") ? -handleSize / 2 : "auto",
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              }}
              onMouseDown={(e) => handleResizeStart(e, corner)}
              onTouchStart={(e) => handleResizeTouchStart(e, corner)}
              data-testid={`resize-handle-${corner}`}
            />
          ))}
        </>
      )}
    </div>
  );
}
