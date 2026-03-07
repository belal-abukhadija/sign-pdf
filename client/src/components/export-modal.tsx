import { useState, useCallback } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
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

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (fileName: string) => Promise<void>;
  defaultFileName: string;
}

export function ExportModal({
  open,
  onClose,
  onExport,
  defaultFileName,
}: ExportModalProps) {
  const [fileName, setFileName] = useState(
    defaultFileName.replace(".pdf", "_edited.pdf")
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExport(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [fileName, onExport, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export PDF
          </DialogTitle>
          <DialogDescription>
            Save your edited PDF with all changes embedded
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
              className="mt-1.5"
              placeholder="document.pdf"
              data-testid="input-export-filename"
            />
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-sm text-muted-foreground">
              Your edited PDF will be downloaded directly to your device. 
              All text and signatures will be embedded in the document.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
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
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
