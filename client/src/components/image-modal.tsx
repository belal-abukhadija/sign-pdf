import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, Trash2, Check, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (imageData: string, naturalWidth: number, naturalHeight: number) => void;
}

export function ImageModal({ open, onClose, onSave }: ImageModalProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setUploadedImage(null);
      setNaturalSize(null);
      setIsDraggingOver(false);
    }
  }, [open]);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setUploadedImage(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadImageFile(file);
    },
    [loadImageFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadImageFile(file);
    },
    [loadImageFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const handleSave = useCallback(() => {
    if (uploadedImage && naturalSize) {
      onSave(uploadedImage, naturalSize.w, naturalSize.h);
      onClose();
    }
  }, [uploadedImage, naturalSize, onSave, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-blue-500" />
            Add Image to PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {uploadedImage ? (
            /* ─── Preview ─── */
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-center min-h-[160px]">
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="max-h-48 max-w-full object-contain rounded shadow"
                />
              </div>
              {naturalSize && (
                <p className="text-xs text-center text-muted-foreground">
                  {naturalSize.w} × {naturalSize.h} px
                </p>
              )}
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedImage(null);
                    setNaturalSize(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-remove-image"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-change-image"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </div>
            </div>
          ) : (
            /* ─── Drop zone ─── */
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                  : "border-border hover:border-blue-400 hover:bg-muted/40"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-image"
            >
              <ImagePlus
                className={`h-12 w-12 mx-auto mb-3 transition-colors ${
                  isDraggingOver ? "text-blue-500" : "text-muted-foreground"
                }`}
              />
              <p className="text-sm font-medium text-foreground">
                Drag &amp; drop an image here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse — PNG, JPG, GIF, WebP, SVG
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-image-upload"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-image">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!uploadedImage}
            data-testid="button-save-image"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Check className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
