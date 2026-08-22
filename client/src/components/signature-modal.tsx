import { useState, useRef, useCallback, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pen, Type, Image, Trash2, Check, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trimTransparentEdges, removeWhiteBackground } from "@/lib/image-utils";

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
}

const signatureFonts = [
  { name: "Architects Daughter", fontFamily: "'Architects Daughter', cursive", className: "font-['Architects_Daughter']" },
  { name: "Brush Script", fontFamily: "'Brush Script MT', cursive", className: "font-['Brush_Script_MT',cursive]" },
  { name: "Georgia Italic", fontFamily: "italic 48px Georgia, serif", className: "italic font-serif" },
  { name: "Lucida Handwriting", fontFamily: "'Lucida Handwriting', cursive", className: "font-['Lucida_Handwriting',cursive]" },
  { name: "Segoe Script", fontFamily: "'Segoe Script', cursive", className: "font-['Segoe_Script',cursive]" },
  { name: "Comic Sans", fontFamily: "'Comic Sans MS', cursive", className: "font-['Comic_Sans_MS',cursive]" },
];

const penColors = ["#000000", "#1d4ed8", "#b91c1c"];

export function SignatureModal({ open, onClose, onSave }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState(0);
  const [penColor, setPenColor] = useState(penColors[0]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [stripBackground, setStripBackground] = useState(true);
  const [processedUpload, setProcessedUpload] = useState<string | null>(null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // react-signature-canvas never syncs the canvas backing store with its CSS
  // box, so on a stretched (mobile) canvas strokes land far from the finger.
  // Size it to the rendered box at device pixel ratio whenever that box changes.
  useEffect(() => {
    if (!open || activeTab !== "draw") return;

    const wrapper = canvasWrapperRef.current;
    const pad = signatureRef.current;
    if (!wrapper || !pad) return;

    const resize = () => {
      const canvas = pad.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = wrapper.clientWidth;
      const height = wrapper.clientHeight;
      if (!width || !height) return;

      const data = pad.isEmpty() ? null : pad.toData();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")!.scale(ratio, ratio);
      pad.clear();
      if (data) pad.fromData(data);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [open, activeTab]);

  // Start each session clean rather than inheriting the previous signature.
  useEffect(() => {
    if (!open) {
      setTypedName("");
      setUploadedImage(null);
      setProcessedUpload(null);
      setHasStrokes(false);
      setActiveTab("draw");
      signatureRef.current?.clear();
    }
  }, [open]);

  useEffect(() => {
    if (!uploadedImage) {
      setProcessedUpload(null);
      return;
    }
    if (!stripBackground) {
      setProcessedUpload(uploadedImage);
      return;
    }
    let cancelled = false;
    removeWhiteBackground(uploadedImage)
      .then((result) => {
        if (!cancelled) setProcessedUpload(result);
      })
      .catch(() => {
        if (!cancelled) setProcessedUpload(uploadedImage);
      });
    return () => {
      cancelled = true;
    };
  }, [uploadedImage, stripBackground]);

  const clearSignature = useCallback(() => {
    signatureRef.current?.clear();
    setHasStrokes(false);
  }, []);

  const undoStroke = useCallback(() => {
    const pad = signatureRef.current;
    if (!pad) return;
    const data = pad.toData();
    data.pop();
    pad.fromData(data);
    setHasStrokes(data.length > 0);
  }, []);

  const handleSaveDrawn = useCallback(() => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const trimmed = trimTransparentEdges(signatureRef.current.getCanvas());
      onSave(trimmed.toDataURL("image/png"));
      onClose();
    }
  }, [onSave, onClose]);

  const handleSaveTyped = useCallback(async () => {
    if (typedName.trim()) {
      const fontFamily = signatureFonts[selectedFont].fontFamily;

      try {
        await document.fonts.load(`48px ${fontFamily}`);
      } catch {
      }

      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = penColor;

      ctx.font = fontFamily.startsWith("italic")
        ? fontFamily
        : `48px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

      const trimmed = trimTransparentEdges(canvas);
      onSave(trimmed.toDataURL("image/png"));
      onClose();
    }
  }, [typedName, selectedFont, penColor, onSave, onClose]);

  const handleSaveUploaded = useCallback(() => {
    const result = processedUpload || uploadedImage;
    if (result) {
      onSave(result);
      onClose();
    }
  }, [processedUpload, uploadedImage, onSave, onClose]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = useCallback(() => {
    switch (activeTab) {
      case "draw":
        handleSaveDrawn();
        break;
      case "type":
        handleSaveTyped();
        break;
      case "upload":
        handleSaveUploaded();
        break;
    }
  }, [activeTab, handleSaveDrawn, handleSaveTyped, handleSaveUploaded]);

  const isValid =
    (activeTab === "draw" && hasStrokes) ||
    (activeTab === "type" && typedName.trim().length > 0) ||
    (activeTab === "upload" && uploadedImage !== null);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Create Your Signature</DialogTitle>
          <DialogDescription>
            Draw it, type your name, or upload a photo of your signature.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="draw" className="h-9" data-testid="tab-draw">
              <Pen className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Draw</span>
            </TabsTrigger>
            <TabsTrigger value="type" className="h-9" data-testid="tab-type">
              <Type className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Type</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="h-9" data-testid="tab-upload">
              <Image className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="space-y-3">
              <div
                ref={canvasWrapperRef}
                className="relative border-2 border-dashed rounded-md bg-white overflow-hidden h-48 sm:h-56 touch-none"
              >
                <SignatureCanvas
                  ref={signatureRef}
                  penColor={penColor}
                  onEnd={() => setHasStrokes(true)}
                  clearOnResize={false}
                  canvasProps={{
                    className: "absolute inset-0 w-full h-full touch-none",
                  }}
                  backgroundColor="rgba(255,255,255,0)"
                />
                {!hasStrokes && (
                  <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
                    Draw your signature here
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {penColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPenColor(color)}
                      aria-label={`Pen color ${color}`}
                      className={`h-9 w-9 rounded-full border-2 transition-transform ${
                        penColor === color
                          ? "border-primary scale-110"
                          : "border-border"
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`button-pen-color-${color}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    onClick={undoStroke}
                    disabled={!hasStrokes}
                    data-testid="button-undo-signature"
                  >
                    <Undo2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Undo</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10"
                    onClick={clearSignature}
                    disabled={!hasStrokes}
                    data-testid="button-clear-signature"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="signature-name">Your Name</Label>
                <Input
                  id="signature-name"
                  placeholder="Enter your name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="mt-1.5 h-11 text-base"
                  data-testid="input-signature-name"
                />
              </div>
              <div>
                <Label>Choose a Style</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {signatureFonts.map((font, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFont(index)}
                      className={`p-3 min-h-14 border rounded-md text-lg truncate transition-all hover-elevate ${
                        selectedFont === index
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      } ${font.className}`}
                      style={{ color: penColor }}
                      data-testid={`button-font-${index}`}
                    >
                      {typedName || "Your Name"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              {uploadedImage ? (
                <div className="space-y-3">
                  <div
                    className="border rounded-md p-4"
                    style={{
                      // Checkerboard makes it obvious whether the background is
                      // actually transparent before the signature is placed.
                      backgroundImage:
                        "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0,0 8px,8px -8px,-8px 0px",
                    }}
                  >
                    <img
                      src={processedUpload || uploadedImage}
                      alt="Uploaded signature"
                      className="max-h-32 mx-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <Label htmlFor="strip-bg" className="text-sm">
                        Remove background
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Makes white paper transparent
                      </p>
                    </div>
                    <Switch
                      id="strip-bg"
                      checked={stripBackground}
                      onCheckedChange={setStripBackground}
                      data-testid="switch-strip-background"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => setUploadedImage(null)}
                    data-testid="button-remove-upload"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-signature"
                >
                  <Image className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Tap to upload or photograph your signature
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, or GIF
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-signature-upload"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            variant="outline"
            className="h-11 sm:h-10"
            onClick={onClose}
            data-testid="button-cancel-signature"
          >
            Cancel
          </Button>
          <Button
            className="h-11 sm:h-10"
            onClick={handleSave}
            disabled={!isValid}
            data-testid="button-save-signature"
          >
            <Check className="h-4 w-4 mr-2" />
            Add Signature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
