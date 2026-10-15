import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Upload, Pen } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      title: "Sign in three ways",
      description: "Draw it with a finger or mouse, type it in a handwriting face, or upload a picture of the one you already use.",
    },
    {
      title: "Arabic that stays joined",
      description: "Real embedded fonts with correct Arabic shaping, right-to-left layout and mixed Arabic and English lines.",
    },
    {
      title: "PDFs and photos alike",
      description: "Sign a contract or a photographed form. The same tools work on both.",
    },
    {
      title: "Sharp exports",
      description: "Text stays selectable vector text in PDFs, and images export at full resolution.",
    },
    {
      title: "Nothing is uploaded",
      description: "Editing and exporting happen in your browser. Your files never leave your device.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="wb-bar">
        <a className="wb-brand" href="/">
          <span className="wb-mark" aria-hidden="true"><Pen /></span>
          <span className="wb-brand-text">
            <span className="wb-brand-name">Sign &amp; Edit</span>
            <span className="wb-brand-owner">Belal&apos;s tools</span>
          </span>
        </a>
        <div className="wb-bar-end">
          <span className="wb-note hidden sm:inline">Works offline. Nothing is uploaded.</span>
        </div>
      </header>

      <main className="wb-page">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={handleInputChange}
          data-testid="input-file-upload"
        />
        <section className="grid items-center gap-10 pb-16 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:pb-24 lg:pt-12">
          <div>
            <h1
              className="m-0 font-semibold"
              style={{ fontSize: "clamp(2.75rem, 1.4rem + 3.6vw, 4.75rem)", lineHeight: 1, letterSpacing: "-0.04em" }}
            >
              Sign it without printing it
            </h1>
            <p className="wb-lede" style={{ marginTop: "var(--wb-s5)" }}>
              Add your signature and Arabic or English text to any PDF or photo, right in your browser. No account, no installation, free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-hero"
              >
                <Upload className="h-5 w-5" />
                Open a file
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <a href="#features">What it can do</a>
              </Button>
            </div>
          </div>

          <div
            className={`wb-drop${isDragging ? " is-over" : ""}`}
            style={{ minHeight: 360 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <span className="wb-drop-icon"><Upload /></span>
            <p className="wb-drop-title">
              {isDragging ? "Drop to open it" : "Drop a PDF or an image here"}
            </p>
            <p className="wb-drop-hint">or click to choose. PDF, PNG, JPEG, WebP or GIF.</p>
          </div>
        </section>

        <section id="features" className="grid gap-8 py-16 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <h2 className="wb-title" style={{ fontSize: "clamp(1.75rem, 1.2rem + 2vw, 2.5rem)" }}>
            What it can do
          </h2>
          <dl className="m-0 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title}>
                <dt className="wb-h3" style={{ fontSize: "var(--wb-t-lg)" }}>{feature.title}</dt>
                <dd className="m-0 mt-2 text-muted-foreground">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col items-start gap-6 rounded-[var(--wb-r-lg)] p-8 sm:p-12" style={{ background: "var(--wb-ink)", color: "var(--wb-bg)" }}>
          <h2 className="wb-title" style={{ fontSize: "clamp(1.75rem, 1.2rem + 2vw, 2.5rem)" }}>
            Signed in under a minute
          </h2>
          <p className="m-0 max-w-xl" style={{ opacity: 0.75 }}>
            Open the file, place your signature, download. No sign-up.
          </p>
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-cta"
          >
            <Upload className="h-5 w-5" />
            Open a file
          </Button>
        </section>
      </main>

      <footer className="wb-foot">
        <span>Made by <a href="mailto:belalabukhadija97@gmail.com">Belal</a></span>
        <span>More free tools at <a href="https://belal.work" target="_blank" rel="noopener noreferrer">belal.work</a></span>
      </footer>
    </div>
  );
}
