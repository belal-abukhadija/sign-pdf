import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Type,
  Pen,
  ImagePlus,
  Download,
  Home,
  Loader2,
  FileText,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignatureModal } from "@/components/signature-modal";
import { ImageModal } from "@/components/image-modal";
import { ExportModal } from "@/components/export-modal";
import { TextElement } from "@/components/text-element";
import { SignatureElement } from "@/components/signature-element";
import { ImageElement } from "@/components/image-element";
import { TextToolbar } from "@/components/text-toolbar";
import {
  loadPdfDocument,
  renderPageToCanvas,
  exportPdfWithEdits,
  downloadPdf,
  generateId,
} from "@/lib/pdf-utils";
import { getStoredFile, getStoredFileName } from "@/lib/file-store";
import type {
  TextElement as TextElementType,
  SignatureElement as SignatureElementType,
  ImageElement as ImageElementType,
} from "@shared/schema";

export default function EditorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [pageCanvas, setPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileTools, setShowMobileTools] = useState(false);

  const [textElements, setTextElements] = useState<TextElementType[]>([]);
  const [signatureElements, setSignatureElements] = useState<
    SignatureElementType[]
  >([]);
  const [imageElements, setImageElements] = useState<ImageElementType[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
    null
  );
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadStoredPdf = async () => {
      const file = getStoredFile();
      const storedName = getStoredFileName();

      if (!file) {
        setLocation("/");
        return;
      }

      try {
        setPdfFile(file);
        setFileName(storedName);

        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load PDF:", error);
        toast({
          title: "Error",
          description: "Failed to load PDF. Please try again.",
          variant: "destructive",
        });
        setLocation("/");
      }
    };

    loadStoredPdf();
  }, [setLocation, toast]);

  useEffect(() => {
    const renderCurrentPage = async () => {
      if (!pdfDoc) return;

      try {
        const { canvas, width, height } = await renderPageToCanvas(
          pdfDoc,
          currentPage,
          zoom
        );
        setPageCanvas(canvas);
        setPageDimensions({ width: width / zoom, height: height / zoom });
      } catch (error) {
        console.error("Failed to render page:", error);
      }
    };

    renderCurrentPage();
  }, [pdfDoc, currentPage, zoom]);

  const handleAddText = useCallback(() => {
    const newText: TextElementType = {
      id: generateId(),
      content: "New Text",
      x: 100,
      y: 100,
      width: 150,
      height: 30,
      fontSize: 16,
      fontFamily: "Arial",
      color: "#000000",
      page: currentPage,
    };
    setTextElements((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
    setSelectedSignatureId(null);
  }, [currentPage]);

  const handleAddSignature = useCallback((signatureData: string) => {
    const newSignature: SignatureElementType = {
      id: generateId(),
      signatureData,
      x: 100,
      y: 200,
      width: 200,
      height: 80,
      page: currentPage,
    };
    setSignatureElements((prev) => [...prev, newSignature]);
    setSelectedSignatureId(newSignature.id);
    setSelectedTextId(null);
    setSelectedImageId(null);
  }, [currentPage]);

  const handleAddImage = useCallback(
    (imageData: string, naturalWidth: number, naturalHeight: number) => {
      const defaultWidth = 200;
      const aspect = naturalHeight / Math.max(naturalWidth, 1);
      const defaultHeight = Math.round(defaultWidth * aspect);
      const newImage: ImageElementType = {
        id: generateId(),
        imageData,
        x: 100,
        y: 150,
        width: defaultWidth,
        height: defaultHeight,
        page: currentPage,
      };
      setImageElements((prev) => [...prev, newImage]);
      setSelectedImageId(newImage.id);
      setSelectedTextId(null);
      setSelectedSignatureId(null);
    },
    [currentPage]
  );

  const handleUpdateText = useCallback(
    (id: string, updates: Partial<TextElementType>) => {
      setTextElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    []
  );

  const handleUpdateSignature = useCallback(
    (id: string, updates: Partial<SignatureElementType>) => {
      setSignatureElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    []
  );

  const handleDeleteText = useCallback((id: string) => {
    setTextElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedTextId(null);
    setSelectedImageId(null);
  }, []);

  const handleDeleteSignature = useCallback((id: string) => {
    setSignatureElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedSignatureId(null);
    setSelectedImageId(null);
  }, []);

  const handleUpdateImage = useCallback(
    (id: string, updates: Partial<ImageElementType>) => {
      setImageElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    []
  );

  const handleDeleteImage = useCallback((id: string) => {
    setImageElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedImageId(null);
  }, []);

  const handleExport = useCallback(
    async (exportFileName: string) => {
      if (!pdfFile) return;

      try {
        const pdfBytes = await exportPdfWithEdits(
          pdfFile,
          textElements,
          signatureElements,
          imageElements
        );
        downloadPdf(pdfBytes, exportFileName);
        toast({
          title: "Success",
          description: "Your PDF has been downloaded successfully.",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Export failed:", errorMessage, error);
        toast({
          title: "Export Failed",
          description: errorMessage || "There was an error exporting your PDF.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [pdfFile, textElements, signatureElements, imageElements, toast]
  );

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedTextId(null);
      setSelectedSignatureId(null);
      setSelectedImageId(null);
    }
  }, []);

  const currentPageTextElements = textElements.filter(
    (el) => el.page === currentPage
  );
  const currentPageSignatureElements = signatureElements.filter(
    (el) => el.page === currentPage
  );
  const currentPageImageElements = imageElements.filter(
    (el) => el.page === currentPage
  );

  const selectedText = textElements.find((el) => el.id === selectedTextId);

  const maxCanvasWidth = isMobile ? viewportWidth - 16 : Infinity;
  const baseWidth = pageDimensions.width * zoom;
  const baseHeight = pageDimensions.height * zoom;
  const effectiveWidth = Math.min(baseWidth, maxCanvasWidth);
  const scaleFactor = baseWidth > 0 ? effectiveWidth / baseWidth : 1;
  const effectiveHeight = baseHeight * scaleFactor;
  const effectiveScale = zoom * scaleFactor;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  const ToolsContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Add Elements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-16 flex-col gap-2 bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary"
            variant="outline"
            onClick={() => {
              handleAddText();
              setShowMobileTools(false);
            }}
            data-testid="button-add-text"
          >
            <Type className="h-5 w-5" />
            <span className="text-xs font-medium">Add Text</span>
          </Button>
          <Button
            className="h-16 flex-col gap-2 bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary"
            variant="outline"
            onClick={() => {
              setShowSignatureModal(true);
              setShowMobileTools(false);
            }}
            data-testid="button-add-signature"
          >
            <Pen className="h-5 w-5" />
            <span className="text-xs font-medium">Add Signature</span>
          </Button>
          <Button
            className="col-span-2 h-14 flex-col gap-2 bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-400/40 text-blue-600 dark:text-blue-400"
            variant="outline"
            onClick={() => {
              setShowImageModal(true);
              setShowMobileTools(false);
            }}
            data-testid="button-add-image"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs font-medium">Add Image</span>
          </Button>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["text-properties"]}
      >
        <AccordionItem value="text-properties">
          <AccordionTrigger className="text-sm py-2">
            Text Properties
          </AccordionTrigger>
          <AccordionContent>
            <TextToolbar
              element={selectedText || null}
              onUpdate={(updates) =>
                selectedTextId && handleUpdateText(selectedTextId, updates)
              }
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Elements on Page {currentPage}
        </h3>
        <div className="space-y-1">
          {currentPageTextElements.length === 0 &&
            currentPageSignatureElements.length === 0 &&
            currentPageImageElements.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                No elements on this page. Tap "Add Text", "Add Signature", or "Add Image" above to get started.
              </p>
            )}
          {currentPageTextElements.map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                selectedTextId === el.id
                  ? "bg-primary/10 text-primary"
                  : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedTextId(el.id);
                setSelectedSignatureId(null);
                setSelectedImageId(null);
              }}
              data-testid={`element-list-text-${el.id}`}
            >
              <Type className="h-3 w-3" />
              <span className="text-xs truncate">
                {el.content || "Empty text"}
              </span>
            </div>
          ))}
          {currentPageSignatureElements.map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                selectedSignatureId === el.id
                  ? "bg-primary/10 text-primary"
                  : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedSignatureId(el.id);
                setSelectedTextId(null);
                setSelectedImageId(null);
              }}
              data-testid={`element-list-signature-${el.id}`}
            >
              <Pen className="h-3 w-3" />
              <span className="text-xs">Signature</span>
            </div>
          ))}
          {currentPageImageElements.map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                selectedImageId === el.id
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedImageId(el.id);
                setSelectedTextId(null);
                setSelectedSignatureId(null);
              }}
              data-testid={`element-list-image-${el.id}`}
            >
              <ImagePlus className="h-3 w-3" />
              <span className="text-xs">Image</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-2 border-b bg-background px-2 md:px-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-home"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Home</TooltipContent>
          </Tooltip>
          {!isMobile && <Separator orientation="vertical" className="h-6" />}
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate max-w-20 md:max-w-48">
              {fileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {!isMobile && (
            <>
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      disabled={zoom <= 0.5}
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
                <span className="text-sm w-14 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      disabled={zoom >= 3}
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous Page</TooltipContent>
            </Tooltip>
            <span className="text-xs md:text-sm w-12 md:w-20 text-center">
              {currentPage}/{totalPages}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next Page</TooltipContent>
            </Tooltip>
          </div>

          {!isMobile && <Separator orientation="vertical" className="h-6" />}

          <Button
            onClick={() => setShowExportModal(true)}
            data-testid="button-export"
            size={isMobile ? "icon" : "default"}
          >
            <Download className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Export</span>}
          </Button>

          {!isMobile && <ThemeToggle />}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {!isMobile && (
          <aside className="w-72 border-r bg-card flex flex-col">
            <div className="p-3 border-b">
              <h2 className="text-sm font-semibold">Tools</h2>
            </div>
            <ScrollArea className="flex-1 p-3">
              <ToolsContent />
            </ScrollArea>
          </aside>
        )}

        <main className={`flex-1 overflow-auto bg-muted/30 p-2 md:p-6 ${isMobile ? "pb-28" : "pb-6"}`}>
          <div
            ref={canvasContainerRef}
            className="relative mx-auto shadow-lg bg-white overflow-hidden"
            style={{
              width: effectiveWidth,
              height: effectiveHeight,
            }}
            onClick={handleCanvasClick}
            data-testid="pdf-canvas-container"
          >
            {pageCanvas && (
              <img
                src={pageCanvas.toDataURL()}
                alt={`Page ${currentPage}`}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                draggable={false}
              />
            )}

            {currentPageTextElements.map((element) => (
              <TextElement
                key={element.id}
                element={element}
                isSelected={selectedTextId === element.id}
                scale={effectiveScale}
                onSelect={() => {
                  setSelectedTextId(element.id);
                  setSelectedSignatureId(null);
                  setSelectedImageId(null);
                }}
                onUpdate={(updates) => handleUpdateText(element.id, updates)}
                onDelete={() => handleDeleteText(element.id)}
              />
            ))}

            {currentPageSignatureElements.map((element) => (
              <SignatureElement
                key={element.id}
                element={element}
                isSelected={selectedSignatureId === element.id}
                scale={effectiveScale}
                onSelect={() => {
                  setSelectedSignatureId(element.id);
                  setSelectedTextId(null);
                  setSelectedImageId(null);
                }}
                onUpdate={(updates) =>
                  handleUpdateSignature(element.id, updates)
                }
                onDelete={() => handleDeleteSignature(element.id)}
              />
            ))}

            {currentPageImageElements.map((element) => (
              <ImageElement
                key={element.id}
                element={element}
                isSelected={selectedImageId === element.id}
                scale={effectiveScale}
                onSelect={() => {
                  setSelectedImageId(element.id);
                  setSelectedTextId(null);
                  setSelectedSignatureId(null);
                }}
                onUpdate={(updates) => handleUpdateImage(element.id, updates)}
                onDelete={() => handleDeleteImage(element.id)}
              />
            ))}
          </div>
        </main>

        {isMobile && (
          <>
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-around gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  disabled={zoom <= 0.5}
                  data-testid="button-mobile-zoom-out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                  data-testid="button-mobile-zoom-in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              <Button
                className="flex-1 max-w-32 bg-primary text-primary-foreground"
                onClick={handleAddText}
                data-testid="button-mobile-add-text"
              >
                <Type className="h-4 w-4 mr-1" />
                Text
              </Button>

              <Button
                className="flex-1 max-w-32 bg-primary text-primary-foreground"
                onClick={() => setShowSignatureModal(true)}
                data-testid="button-mobile-add-signature"
              >
                <Pen className="h-4 w-4 mr-1" />
                Sign
              </Button>

              <Button
                className="flex-1 max-w-32 bg-blue-600 text-white"
                onClick={() => setShowImageModal(true)}
                data-testid="button-mobile-add-image"
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Image
              </Button>

              <Sheet open={showMobileTools} onOpenChange={setShowMobileTools}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-mobile-tools">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh]">
                  <SheetHeader>
                    <SheetTitle>Tools & Properties</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-full mt-4 pb-8">
                    <ToolsContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <ThemeToggle />
            </div>
          </>
        )}
      </div>

      <SignatureModal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleAddSignature}
      />

      <ImageModal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSave={handleAddImage}
      />

      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        defaultFileName={fileName}
      />
    </div>
  );
}
