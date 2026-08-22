import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation } from "wouter";
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
  Maximize,
  SlidersHorizontal,
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
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SignatureModal } from "@/components/signature-modal";
import { ImageModal } from "@/components/image-modal";
import { ExportModal } from "@/components/export-modal";
import { TextElement } from "@/components/text-element";
import { SignatureElement } from "@/components/signature-element";
import { ImageElement } from "@/components/image-element";
import { TextToolbar } from "@/components/text-toolbar";
import {
  exportPdfWithEdits,
  exportImageWithEdits,
  downloadPdf,
  downloadBlob,
  generateId,
} from "@/lib/pdf-utils";
import {
  openDocument,
  imageSourceOf,
  extensionForMime,
  withExtension,
  type EditableDocument,
} from "@/lib/document";
import { getImageSize } from "@/lib/image-utils";
import { DEFAULT_FONT_ID, preloadDefaultArabicFont } from "@/lib/fonts";
import { getStoredFile, getStoredFileName } from "@/lib/file-store";
import type {
  TextElement as TextElementType,
  SignatureElement as SignatureElementType,
  ImageElement as ImageElementType,
} from "@shared/schema";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function EditorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [doc, setDoc] = useState<EditableDocument | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [availableWidth, setAvailableWidth] = useState(0);
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

  const scrollRef = useRef<HTMLElement | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedTextId(null);
    setSelectedSignatureId(null);
    setSelectedImageId(null);
  }, []);

  useEffect(() => {
    const loadStoredDocument = async () => {
      const file = getStoredFile();
      const storedName = getStoredFileName();

      if (!file) {
        setLocation("/");
        return;
      }

      try {
        setSourceFile(file);
        setFileName(storedName);

        const opened = await openDocument(file);
        setDoc(opened);
        setTotalPages(opened.pageCount);
        setIsLoading(false);
        preloadDefaultArabicFont();
      } catch (error) {
        console.error("Failed to load document:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to load the file. Please try again.",
          variant: "destructive",
        });
        setLocation("/");
      }
    };

    loadStoredDocument();
  }, [setLocation, toast]);

  // Track the space the page can actually occupy so it can be fitted to width.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setAvailableWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLoading]);

  // Page dimensions in page units (PDF points, or image pixels) - the
  // coordinate space every element is stored in.
  useEffect(() => {
    if (!doc) return;
    setPageSize(doc.getPageSize(currentPage));
  }, [doc, currentPage]);

  const gutter = isMobile ? 16 : 48;

  // On mobile the page always fills the width; zoom multiplies out from there
  // and the container scrolls, instead of the old clamp that made zoom a no-op.
  const fitScale =
    pageSize.width > 0 && availableWidth > 0
      ? Math.max((availableWidth - gutter) / pageSize.width, 0.1)
      : 1;
  const baseScale = isMobile ? fitScale : Math.min(fitScale, 1);
  const displayScale = baseScale * zoom;
  const displayWidth = pageSize.width * displayScale;
  const displayHeight = pageSize.height * displayScale;

  useEffect(() => {
    if (!doc || displayScale <= 0) return;
    let cancelled = false;

    // Debounced so pinching or resizing doesn't queue a render per frame.
    const timer = setTimeout(async () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const renderScale = clamp(displayScale * dpr, 0.5, 5);
      try {
        const rendered = await doc.renderPage(currentPage, renderScale);
        if (!cancelled) setPageImage(rendered);
      } catch (error) {
        console.error("Failed to render page:", error);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, currentPage, displayScale]);

  /** Places a new element at the centre of what the user is currently looking at. */
  const centerOfView = useCallback(
    (width: number, height: number) => {
      const el = scrollRef.current;
      if (!el || displayScale <= 0) return { x: 50, y: 50 };
      const x = (el.scrollLeft + el.clientWidth / 2) / displayScale - width / 2;
      const y = (el.scrollTop + el.clientHeight / 2) / displayScale - height / 2;
      return {
        x: clamp(x, 0, Math.max(0, pageSize.width - width)),
        y: clamp(y, 0, Math.max(0, pageSize.height - height)),
      };
    },
    [displayScale, pageSize.width, pageSize.height]
  );

  /** Keeps elements on the page so they can't be dragged into nowhere. */
  const clampPosition = useCallback(
    (x: number, y: number, width: number, height: number) => ({
      x: clamp(x, 0, Math.max(0, pageSize.width - width)),
      y: clamp(y, 0, Math.max(0, pageSize.height - height)),
    }),
    [pageSize.width, pageSize.height]
  );

  const handleAddText = useCallback(() => {
    const width = 150;
    const height = 30;
    const newText: TextElementType = {
      id: generateId(),
      content: "New Text",
      ...centerOfView(width, height),
      width,
      height,
      fontSize: 16,
      fontFamily: DEFAULT_FONT_ID,
      color: "#000000",
      page: currentPage,
    };
    setTextElements((prev) => [...prev, newText]);
    clearSelection();
    setSelectedTextId(newText.id);
  }, [currentPage, centerOfView, clearSelection]);

  const handleAddSignature = useCallback(
    async (signatureData: string) => {
      // Match the signature's own aspect ratio instead of squashing it into a
      // fixed 200x80 box.
      let width = Math.min(220, pageSize.width * 0.45 || 220);
      let height = width * 0.4;
      try {
        const natural = await getImageSize(signatureData);
        if (natural.width > 0) {
          height = width * (natural.height / natural.width);
        }
      } catch {
        // Fall back to the default ratio.
      }

      const newSignature: SignatureElementType = {
        id: generateId(),
        signatureData,
        ...centerOfView(width, height),
        width,
        height,
        page: currentPage,
      };
      setSignatureElements((prev) => [...prev, newSignature]);
      clearSelection();
      setSelectedSignatureId(newSignature.id);
    },
    [currentPage, pageSize.width, centerOfView, clearSelection]
  );

  const handleAddImage = useCallback(
    (imageData: string, naturalWidth: number, naturalHeight: number) => {
      const width = Math.min(240, pageSize.width * 0.5 || 240);
      const height = Math.round(
        width * (naturalHeight / Math.max(naturalWidth, 1))
      );
      const newImage: ImageElementType = {
        id: generateId(),
        imageData,
        ...centerOfView(width, height),
        width,
        height,
        page: currentPage,
      };
      setImageElements((prev) => [...prev, newImage]);
      clearSelection();
      setSelectedImageId(newImage.id);
    },
    [currentPage, pageSize.width, centerOfView, clearSelection]
  );

  const handleUpdateText = useCallback(
    (id: string, updates: Partial<TextElementType>) => {
      setTextElements((prev) =>
        prev.map((el) => {
          if (el.id !== id) return el;
          const next = { ...el, ...updates };
          return { ...next, ...clampPosition(next.x, next.y, next.width, next.height) };
        })
      );
    },
    [clampPosition]
  );

  const handleUpdateSignature = useCallback(
    (id: string, updates: Partial<SignatureElementType>) => {
      setSignatureElements((prev) =>
        prev.map((el) => {
          if (el.id !== id) return el;
          const next = { ...el, ...updates };
          return { ...next, ...clampPosition(next.x, next.y, next.width, next.height) };
        })
      );
    },
    [clampPosition]
  );

  const handleUpdateImage = useCallback(
    (id: string, updates: Partial<ImageElementType>) => {
      setImageElements((prev) =>
        prev.map((el) => {
          if (el.id !== id) return el;
          const next = { ...el, ...updates };
          return { ...next, ...clampPosition(next.x, next.y, next.width, next.height) };
        })
      );
    },
    [clampPosition]
  );

  const handleDeleteText = useCallback(
    (id: string) => {
      setTextElements((prev) => prev.filter((el) => el.id !== id));
      clearSelection();
    },
    [clearSelection]
  );

  const handleDeleteSignature = useCallback(
    (id: string) => {
      setSignatureElements((prev) => prev.filter((el) => el.id !== id));
      clearSelection();
    },
    [clearSelection]
  );

  const handleDeleteImage = useCallback(
    (id: string) => {
      setImageElements((prev) => prev.filter((el) => el.id !== id));
      clearSelection();
    },
    [clearSelection]
  );

  const handleExport = useCallback(
    async (exportFileName: string, imageMimeType?: string) => {
      if (!sourceFile || !doc) return;

      try {
        if (doc.kind === "image") {
          const source = imageSourceOf(doc);
          if (!source) throw new Error("Image source unavailable");

          const mime = imageMimeType || "image/png";
          const blob = await exportImageWithEdits(
            source,
            { textElements, signatureElements, imageElements },
            mime
          );
          downloadBlob(
            blob,
            withExtension(exportFileName, extensionForMime(mime))
          );
        } else {
          const pdfBytes = await exportPdfWithEdits(
            sourceFile,
            textElements,
            signatureElements,
            imageElements
          );
          downloadPdf(pdfBytes, exportFileName);
        }

        toast({
          title: "Success",
          description: `Your ${
            doc.kind === "image" ? "image" : "PDF"
          } has been downloaded successfully.`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Export failed:", errorMessage, error);
        toast({
          title: "Export Failed",
          description: errorMessage || "There was an error exporting your file.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [sourceFile, doc, textElements, signatureElements, imageElements, toast]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) clearSelection();
    },
    [clearSelection]
  );

  // Pinch-to-zoom over the page. Single-finger gestures fall through so the
  // container keeps its normal panning behaviour.
  const handlePinchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchRef.current = {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
      };
    },
    [zoom]
  );

  const handlePinchMove = useCallback((e: React.TouchEvent) => {
    const pinch = pinchRef.current;
    if (!pinch || e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.distance <= 0) return;
    setZoom(clamp((pinch.zoom * distance) / pinch.distance, MIN_ZOOM, MAX_ZOOM));
  }, []);

  const handlePinchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  const currentPageTextElements = useMemo(
    () => textElements.filter((el) => el.page === currentPage),
    [textElements, currentPage]
  );
  const currentPageSignatureElements = useMemo(
    () => signatureElements.filter((el) => el.page === currentPage),
    [signatureElements, currentPage]
  );
  const currentPageImageElements = useMemo(
    () => imageElements.filter((el) => el.page === currentPage),
    [imageElements, currentPage]
  );

  const selectedText = textElements.find((el) => el.id === selectedTextId);
  const elementCount =
    currentPageTextElements.length +
    currentPageSignatureElements.length +
    currentPageImageElements.length;

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  const zoomControls = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom((z) => clamp(z - 0.25, MIN_ZOOM, MAX_ZOOM))}
        disabled={zoom <= MIN_ZOOM}
        aria-label="Zoom out"
        data-testid="button-zoom-out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs w-11 text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom((z) => clamp(z + 0.25, MIN_ZOOM, MAX_ZOOM))}
        disabled={zoom >= MAX_ZOOM}
        aria-label="Zoom in"
        data-testid="button-zoom-in"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setZoom(1)}
        disabled={zoom === 1}
        aria-label="Fit to width"
        data-testid="button-zoom-fit"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </>
  );

  const ToolsContent = () => (
    <div className="space-y-4">
      {!isMobile && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Add Elements
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-16 flex-col gap-2 bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary"
              variant="outline"
              onClick={handleAddText}
              data-testid="button-add-text"
            >
              <Type className="h-5 w-5" />
              <span className="text-xs font-medium">Add Text</span>
            </Button>
            <Button
              className="h-16 flex-col gap-2 bg-primary/10 hover:bg-primary/20 border-2 border-primary/30 text-primary"
              variant="outline"
              onClick={() => setShowSignatureModal(true)}
              data-testid="button-add-signature"
            >
              <Pen className="h-5 w-5" />
              <span className="text-xs font-medium">Add Signature</span>
            </Button>
            <Button
              className="col-span-2 h-14 flex-col gap-2 bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-400/40 text-blue-600"
              variant="outline"
              onClick={() => setShowImageModal(true)}
              data-testid="button-add-image"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs font-medium">Add Image</span>
            </Button>
          </div>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["text-properties"]}>
        <AccordionItem value="text-properties">
          <AccordionTrigger className="text-sm py-3">
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
          {elementCount === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">
              No elements on this page yet. Use Text, Sign, or Image to add one.
            </p>
          )}
          {currentPageTextElements.map((el) => (
            <button
              key={el.id}
              className={`flex w-full items-center gap-2 p-3 rounded-md text-left transition-colors ${
                selectedTextId === el.id
                  ? "bg-primary/10 text-primary"
                  : "hover-elevate"
              }`}
              onClick={() => {
                clearSelection();
                setSelectedTextId(el.id);
                setShowMobileTools(false);
              }}
              data-testid={`element-list-text-${el.id}`}
            >
              <Type className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">
                {el.content || "Empty text"}
              </span>
            </button>
          ))}
          {currentPageSignatureElements.map((el) => (
            <button
              key={el.id}
              className={`flex w-full items-center gap-2 p-3 rounded-md text-left transition-colors ${
                selectedSignatureId === el.id
                  ? "bg-primary/10 text-primary"
                  : "hover-elevate"
              }`}
              onClick={() => {
                clearSelection();
                setSelectedSignatureId(el.id);
                setShowMobileTools(false);
              }}
              data-testid={`element-list-signature-${el.id}`}
            >
              <Pen className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Signature</span>
            </button>
          ))}
          {currentPageImageElements.map((el) => (
            <button
              key={el.id}
              className={`flex w-full items-center gap-2 p-3 rounded-md text-left transition-colors ${
                selectedImageId === el.id
                  ? "bg-blue-500/10 text-blue-600"
                  : "hover-elevate"
              }`}
              onClick={() => {
                clearSelection();
                setSelectedImageId(el.id);
                setShowMobileTools(false);
              }}
              data-testid={`element-list-image-${el.id}`}
            >
              <ImagePlus className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Image</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b bg-background px-1 md:px-4">
        <div className="flex items-center gap-1 md:gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                aria-label="Back to home"
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
            <span className="text-sm font-medium truncate max-w-24 md:max-w-48">
              {fileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {!isMobile && (
            <>
              <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                {zoomControls}
              </div>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {totalPages > 1 && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                clearSelection();
              }}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs md:text-sm w-12 md:w-16 text-center tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                clearSelection();
              }}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          )}

          {!isMobile && <Separator orientation="vertical" className="h-6" />}

          <Button
            onClick={() => setShowExportModal(true)}
            data-testid="button-export"
            size={isMobile ? "icon" : "default"}
            aria-label="Export"
          >
            <Download className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Export</span>}
          </Button>
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

        <main
          ref={scrollRef}
          className="flex-1 overflow-auto overscroll-contain bg-muted/30 p-2 md:p-6"
          onTouchStart={handlePinchStart}
          onTouchMove={handlePinchMove}
          onTouchEnd={handlePinchEnd}
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          <div
            className="relative mx-auto shadow-lg bg-white"
            style={{
              width: displayWidth || undefined,
              height: displayHeight || undefined,
            }}
            onClick={handleCanvasClick}
            data-testid="pdf-canvas-container"
          >
            {pageImage && (
              <img
                src={pageImage}
                alt={`Page ${currentPage}`}
                className="absolute inset-0 w-full h-full pointer-events-none select-none"
                draggable={false}
              />
            )}

            {currentPageTextElements.map((element) => (
              <TextElement
                key={element.id}
                element={element}
                isSelected={selectedTextId === element.id}
                scale={displayScale}
                onSelect={() => {
                  clearSelection();
                  setSelectedTextId(element.id);
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
                scale={displayScale}
                onSelect={() => {
                  clearSelection();
                  setSelectedSignatureId(element.id);
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
                scale={displayScale}
                onSelect={() => {
                  clearSelection();
                  setSelectedImageId(element.id);
                }}
                onUpdate={(updates) => handleUpdateImage(element.id, updates)}
                onDelete={() => handleDeleteImage(element.id)}
              />
            ))}
          </div>
        </main>

        {isMobile && (
          <div className="pointer-events-none absolute right-2 bottom-3 z-40 flex flex-col items-center rounded-full border bg-background/95 shadow-lg backdrop-blur">
            <div className="pointer-events-auto flex flex-col items-center py-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => clamp(z + 0.25, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                data-testid="button-mobile-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom((z) => clamp(z - 0.25, MIN_ZOOM, MAX_ZOOM))}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                data-testid="button-mobile-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(1)}
                disabled={zoom === 1}
                aria-label="Fit to width"
                data-testid="button-mobile-zoom-fit"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <nav className="flex-shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-4">
            <Button
              variant="ghost"
              className="h-16 flex-col gap-1 rounded-none"
              onClick={handleAddText}
              data-testid="button-mobile-add-text"
            >
              <Type className="h-5 w-5" />
              <span className="text-[11px] font-medium">Text</span>
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex-col gap-1 rounded-none"
              onClick={() => setShowSignatureModal(true)}
              data-testid="button-mobile-add-signature"
            >
              <Pen className="h-5 w-5" />
              <span className="text-[11px] font-medium">Sign</span>
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex-col gap-1 rounded-none"
              onClick={() => setShowImageModal(true)}
              data-testid="button-mobile-add-image"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[11px] font-medium">Image</span>
            </Button>
            <Button
              variant="ghost"
              className="h-16 flex-col gap-1 rounded-none relative"
              onClick={() => setShowMobileTools(true)}
              data-testid="button-mobile-tools"
            >
              <SlidersHorizontal className="h-5 w-5" />
              <span className="text-[11px] font-medium">Tools</span>
              {elementCount > 0 && (
                <span className="absolute top-2 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {elementCount}
                </span>
              )}
            </Button>
          </div>
        </nav>
      )}

      {isMobile && (
        <Sheet open={showMobileTools} onOpenChange={setShowMobileTools}>
          <SheetContent side="bottom" className="h-[75dvh] flex flex-col">
            <SheetHeader>
              <SheetTitle>Tools & Properties</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
              <div className="pb-10">
                <ToolsContent />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

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
        kind={doc?.kind ?? "pdf"}
      />
    </div>
  );
}
