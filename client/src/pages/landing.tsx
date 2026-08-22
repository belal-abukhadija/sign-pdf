import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, FileText, Pen, Download, Shield, Zap, ArrowRight, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { storeFile } from "@/lib/file-store";
import { detectKind } from "@/lib/document";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file) return;
    if (!detectKind(file)) {
      toast({
        title: "Unsupported file",
        description: "Choose a PDF or an image (PNG, JPEG, WebP, GIF).",
        variant: "destructive",
      });
      return;
    }
    storeFile(file);
    setLocation("/editor");
  }, [setLocation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const features = [
    {
      icon: Upload,
      title: "Easy Upload",
      description: "Drag and drop any PDF document or image to get started instantly",
    },
    {
      icon: Pen,
      title: "Add Signatures",
      description: "Draw, type, or upload your signature and place it anywhere",
    },
    {
      icon: FileText,
      title: "Arabic & English Text",
      description: "Real embedded fonts with correct Arabic shaping, right-to-left layout and bidirectional text",
    },
    {
      icon: Images,
      title: "PDFs and Images",
      description: "Sign a contract or a photographed document - the same tools work on both",
    },
    {
      icon: Download,
      title: "Sharp Exports",
      description: "Text stays selectable vector text in PDFs; images export at full resolution",
    },
    {
      icon: Shield,
      title: "100% Private",
      description: "All editing happens in your browser. Files never leave your device",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "No server processing required. Instant editing and export",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Sign &amp; Edit</span>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Edit PDFs{" "}
                <span className="text-primary">Instantly</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Add your signature and text to any PDF or image, right in your
                browser. Full Arabic support, no installation, no account, and
                completely free.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-hero"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload File
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="#features">
                    Learn More
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div
              className={`relative rounded-md border-2 border-dashed p-8 lg:p-12 transition-all duration-200 ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-upload"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className={`rounded-full p-4 transition-colors ${
                  isDragging ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Upload className={`h-10 w-10 transition-colors ${
                    isDragging ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {isDragging
                      ? "Drop your file here"
                      : "Drag & drop a PDF or image"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, PNG, JPEG, WebP or GIF
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse-files"
                >
                  Browse Files
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleInputChange}
                data-testid="input-file-upload"
              />
            </div>
          </div>
        </section>

        <section id="features" className="bg-muted/30 py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                A complete PDF editing solution that works entirely in your browser
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-md bg-primary/10 p-2.5">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upload a PDF or image and start signing in seconds. No sign-up required.
            </p>
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-cta"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload Your File
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Your files are processed locally and never uploaded to our servers.
          </p>
          <p className="mt-2">
            Supports standard PDF files and PNG, JPEG, WebP and GIF images.
          </p>
        </div>
      </footer>
    </div>
  );
}
