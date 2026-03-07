import { useState, useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Pen, Type, Image, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

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

export function SignatureModal({ open, onClose, onSave }: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearSignature = useCallback(() => {
    signatureRef.current?.clear();
  }, []);

  const handleSaveDrawn = useCallback(() => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const canvas = signatureRef.current.getCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
      onClose();
    }
  }, [onSave, onClose]);

  const handleSaveTyped = useCallback(async () => {
    if (typedName.trim()) {
      const selectedFontData = signatureFonts[selectedFont];
      const fontFamily = selectedFontData.fontFamily;
      
      try {
        await document.fonts.load(`48px ${fontFamily}`);
      } catch {
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000000";
      
      if (fontFamily.startsWith("italic")) {
        ctx.font = fontFamily;
      } else {
        ctx.font = `48px ${fontFamily}`;
      }
      
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
      onClose();
    }
  }, [typedName, selectedFont, onSave, onClose]);

  const handleSaveUploaded = useCallback(() => {
    if (uploadedImage) {
      onSave(uploadedImage);
      onClose();
    }
  }, [uploadedImage, onSave, onClose]);

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

  const isValid = useCallback(() => {
    switch (activeTab) {
      case "draw":
        return signatureRef.current && !signatureRef.current.isEmpty();
      case "type":
        return typedName.trim().length > 0;
      case "upload":
        return uploadedImage !== null;
      default:
        return false;
    }
  }, [activeTab, typedName, uploadedImage]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Your Signature</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" data-testid="tab-draw">
              <Pen className="h-4 w-4 mr-2" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" data-testid="tab-type">
              <Type className="h-4 w-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Image className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="space-y-4">
              <div className="border rounded-md bg-white dark:bg-gray-900 overflow-hidden">
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-48",
                    style: { width: "100%", height: "192px" },
                  }}
                  backgroundColor="rgba(255,255,255,0)"
                />
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  data-testid="button-clear-signature"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <p className="text-sm text-muted-foreground">
                  Draw your signature above
                </p>
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
                  className="mt-1.5"
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
                      className={`p-3 border rounded-md text-lg transition-all hover-elevate ${
                        selectedFont === index
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      } ${font.className}`}
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
                <div className="border rounded-md p-4 bg-muted/30">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-32 mx-auto object-contain"
                  />
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadedImage(null)}
                      data-testid="button-remove-upload"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-signature"
                >
                  <Image className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload an image of your signature
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

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-signature">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-signature">
            <Check className="h-4 w-4 mr-2" />
            Add Signature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
