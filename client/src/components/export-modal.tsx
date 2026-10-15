import { useState, useCallback, useEffect } from "react";
import { Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DocumentKind } from "@shared/schema";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (fileName: string, imageMimeType?: string) => Promise<void>;
  defaultFileName: string;
  kind: DocumentKind;
}

const imageFormats = [
  { mime: "image/png", label: "PNG", hint: "Lossless, keeps transparency" },
  { mime: "image/jpeg", label: "JPEG", hint: "Smaller file, no transparency" },
  { mime: "image/webp", label: "WebP", hint: "Small and lossless-ish" },
];

function suggestName(defaultFileName: string, kind: DocumentKind): string {
  const base = defaultFileName.replace(/\.[^.]+$/, "");
  return kind === "image" ? `${base}_signed` : `${base}_edited.pdf`;
}

export function ExportModal({
  open,
  onClose,
  onExport,
  defaultFileName,
  kind,
}: ExportModalProps) {
  const [fileName, setFileName] = useState(() =>
    suggestName(defaultFileName, kind)
  );
  const [mimeType, setMimeType] = useState("image/png");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setFileName(suggestName(defaultFileName, kind));
  }, [defaultFileName, kind]);

  const isImage = kind === "image";

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const name =
        isImage || fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      await onExport(name, isImage ? mimeType : undefined);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [fileName, mimeType, isImage, onExport, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-foreground" />
            )}
            Export {isImage ? "Image" : "PDF"}
          </DialogTitle>
          <DialogDescription>
            Save your edited {isImage ? "image" : "PDF"} with all changes
            embedded
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="export-filename" className="text-sm font-medium">
              File Name
            </Label>
            <Input
              id="export-filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="mt-1.5 h-10 text-base"
              placeholder={isImage ? "image" : "document.pdf"}
              data-testid="input-export-filename"
            />
          </div>

          {isImage && (
            <div>
              <Label className="text-sm font-medium">Format</Label>
              <ToggleGroup
                type="single"
                value={mimeType}
                onValueChange={(value) => value && setMimeType(value)}
                className="mt-1.5 justify-start"
                data-testid="toggle-image-format"
              >
                {imageFormats.map((format) => (
                  <ToggleGroupItem
                    key={format.mime}
                    value={format.mime}
                    className="h-10 px-4"
                  >
                    {format.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {imageFormats.find((f) => f.mime === mimeType)?.hint}
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-muted-foreground">
              {isImage
                ? "Your signature, text, and images are composited at the picture's full resolution and downloaded to your device."
                : "Your edited PDF will be downloaded directly to your device. Text is embedded as real, selectable text."}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            className="h-11 sm:h-10"
            onClick={onClose}
            disabled={isExporting}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            className="h-11 sm:h-10"
            onClick={handleExport}
            disabled={isExporting || !fileName.trim()}
            data-testid="button-confirm-export"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download {isImage ? "Image" : "PDF"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
