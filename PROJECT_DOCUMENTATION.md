# PDF Editor - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [File Structure](#file-structure)
5. [Core Features](#core-features)
6. [Data Models](#data-models)
7. [Key Components](#key-components)
8. [PDF Processing](#pdf-processing)
9. [Arabic Text Support](#arabic-text-support)
10. [Mobile Responsiveness](#mobile-responsiveness)
11. [State Management](#state-management)
12. [Styling & Theming](#styling--theming)
13. [Running the Application](#running-the-application)
14. [Important Implementation Details](#important-implementation-details)

---

## Project Overview

A **fully client-side PDF editor** focused on adding names and signatures to PDF documents. All file processing happens in the browser - files are never uploaded to any server, ensuring complete privacy.

### Key Capabilities
- Upload PDF documents from device (drag-and-drop or click-to-upload)
- Add text anywhere on PDF pages with custom font, size, and color
- Full Arabic text support with proper RTL rendering
- Add signatures via three methods: draw, type, or upload image
- Drag and resize text and signature elements (mouse + touch support)
- Navigate between PDF pages with zoom controls
- Export edited PDF with all changes permanently embedded
- Fully responsive design for desktop, tablet, and mobile devices
- Dark/light theme toggle

---

## Tech Stack

### Frontend Framework
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **Wouter** for client-side routing

### UI Components
- **Shadcn UI** - Pre-built accessible components
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Framer Motion** - Animations (available but used sparingly)

### PDF Processing
- **PDF.js (pdfjs-dist)** - Renders PDF pages in the browser as canvas
- **pdf-lib** - Modifies and exports PDFs with embedded changes

### Signature Handling
- **react-signature-canvas** - Drawing signatures with mouse/touch

### State Management
- React `useState` hooks (no external state library needed)
- All state is client-side only

### Form Handling
- **react-hook-form** with Zod validation (available but minimal forms in this app)
- **@tanstack/react-query** for data fetching (minimal usage since app is client-side)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────┤
│  Landing Page                    Editor Page                 │
│  ┌─────────────────┐            ┌─────────────────────────┐ │
│  │ File Upload     │            │ PDF Viewer (PDF.js)     │ │
│  │ (drag & drop)   │──────────►│ Text Elements (overlay) │ │
│  │                 │            │ Signature Elements      │ │
│  └─────────────────┘            │ Toolbar (desktop/mobile)│ │
│                                 └─────────────────────────┘ │
│                                           │                  │
│                                           ▼                  │
│                                 ┌─────────────────────────┐ │
│                                 │ Export (pdf-lib)        │ │
│                                 │ Download edited PDF     │ │
│                                 └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  In-Memory File Store: Stores uploaded PDF temporarily      │
│  (Never leaves the browser - pure client-side)              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. User uploads PDF on landing page
2. File stored in memory via `file-store.ts`
3. Navigate to `/editor` route
4. PDF.js renders pages to canvas
5. User adds text/signatures as overlay elements
6. Elements stored in React state with page association
7. On export, pdf-lib embeds all elements into PDF
8. User downloads the modified PDF

---

## File Structure

```
project-root/
├── client/
│   └── src/
│       ├── components/
│       │   ├── ui/                    # Shadcn UI components
│       │   ├── export-modal.tsx       # Export confirmation dialog
│       │   ├── signature-element.tsx  # Draggable/resizable signature
│       │   ├── signature-modal.tsx    # Create signature (draw/type/upload)
│       │   ├── text-element.tsx       # Draggable text with inline editing
│       │   ├── text-toolbar.tsx       # Font, size, color controls
│       │   ├── theme-provider.tsx     # Dark/light theme context
│       │   └── theme-toggle.tsx       # Theme switch button
│       ├── hooks/
│       │   ├── use-mobile.tsx         # Mobile detection hook
│       │   └── use-toast.ts           # Toast notifications
│       ├── lib/
│       │   ├── file-store.ts          # In-memory PDF file storage
│       │   ├── pdf-utils.ts           # PDF loading, rendering, export
│       │   ├── queryClient.ts         # TanStack Query setup
│       │   └── utils.ts               # Utility functions (cn, etc.)
│       ├── pages/
│       │   ├── editor.tsx             # Main PDF editor interface
│       │   ├── landing.tsx            # Homepage with file upload
│       │   └── not-found.tsx          # 404 page
│       ├── App.tsx                    # Root component with routing
│       └── index.css                  # Global styles, Tailwind imports
├── server/
│   ├── index.ts                       # Express server entry
│   ├── routes.ts                      # API routes (minimal)
│   ├── storage.ts                     # Storage interface (not used)
│   └── vite.ts                        # Vite dev server integration
├── shared/
│   └── schema.ts                      # TypeScript types and Zod schemas
├── design_guidelines.md               # UI/UX design system
├── package.json                       # Dependencies
├── tailwind.config.ts                 # Tailwind configuration
├── vite.config.ts                     # Vite configuration
└── tsconfig.json                      # TypeScript configuration
```

---

## Core Features

### 1. PDF Upload (Landing Page)
- Drag-and-drop zone with visual feedback
- Click-to-browse file picker
- Accepts only PDF files (`application/pdf`)
- Stores file in memory, redirects to editor

### 2. PDF Viewing (Editor)
- Renders PDF pages using PDF.js to canvas
- Page navigation (previous/next with keyboard support)
- Zoom controls (50% to 300%)
- Page counter display

### 3. Text Tool
- Add text anywhere by clicking on canvas
- Inline editing (double-click to edit)
- Properties: font family, font size (8-72px), color
- Draggable positioning
- Supports Arabic text with proper RTL rendering

### 4. Signature Tool
Three creation methods:
- **Draw**: Freehand drawing with react-signature-canvas
- **Type**: Enter name, choose from 6 signature fonts
- **Upload**: Upload image of existing signature

All signatures become draggable/resizable PNG images.

### 5. Element Manipulation
- **Drag**: Move elements anywhere on the page
- **Resize**: Corner handles for proportional resizing (signatures)
- **Delete**: X button when selected
- **Touch support**: Full mobile touch event handling

### 6. Export
- Embeds all text/signatures into PDF using pdf-lib
- Text rendered as PNG images (supports all fonts including Arabic)
- Downloads as `[original-name]-edited.pdf`

---

## Data Models

Defined in `shared/schema.ts`:

```typescript
// Text Element
interface TextElement {
  id: string;              // Unique identifier
  content: string;         // The text content
  x: number;               // X position on page (in PDF units)
  y: number;               // Y position on page (in PDF units)
  width: number;           // Element width
  height: number;          // Element height
  fontSize: number;        // Font size in pixels
  fontFamily: string;      // Font family name
  color: string;           // Hex color code
  page: number;            // Page number (1-indexed)
}

// Signature Element
interface SignatureElement {
  id: string;              // Unique identifier
  signatureData: string;   // Base64 PNG data URL
  x: number;               // X position on page
  y: number;               // Y position on page
  width: number;           // Display width
  height: number;          // Display height
  page: number;            // Page number (1-indexed)
}

// Signature (creation data)
interface Signature {
  id: string;
  type: "draw" | "type" | "upload";
  data: string;            // Base64 image data
  fontFamily?: string;     // For typed signatures
  createdAt: Date;
}
```

---

## Key Components

### `client/src/pages/editor.tsx`
The main editor interface (~630 lines). Handles:
- PDF loading and rendering
- State for all text and signature elements
- Page navigation and zoom
- Element selection and manipulation
- Responsive layout (sidebar on desktop, bottom bar on mobile)
- Keyboard shortcuts

### `client/src/components/text-element.tsx`
Draggable text component with:
- Inline text editing (double-click)
- Mouse and touch drag support
- Selection state visual feedback
- Delete button
- Scale-aware positioning

### `client/src/components/signature-element.tsx`
Draggable/resizable signature component with:
- Corner resize handles (larger on mobile)
- Aspect ratio preservation during resize
- Mouse and touch support
- Selection border and delete button

### `client/src/components/signature-modal.tsx`
Modal dialog for creating signatures:
- Tabbed interface (Draw/Type/Upload)
- Drawing canvas with clear button
- Font selection for typed signatures
- Image upload with preview

### `client/src/components/text-toolbar.tsx`
Properties panel for text elements:
- Font family dropdown
- Font size slider
- Color picker with presets

### `client/src/lib/file-store.ts`
Simple in-memory file storage:
```typescript
let storedFile: File | null = null;
let storedFileName: string = "";

export function storeFile(file: File): void
export function getStoredFile(): File | null
export function getStoredFileName(): string
export function clearStoredFile(): void
```

### `client/src/lib/pdf-utils.ts`
Core PDF processing utilities:
- `loadPdfDocument(file)` - Loads PDF using PDF.js
- `renderPageToCanvas(pdf, pageNumber, scale)` - Renders page
- `exportPdfWithEdits(file, textElements, signatureElements)` - Creates modified PDF
- `downloadPdf(pdfBytes, fileName)` - Triggers browser download
- `generateId()` - Creates unique element IDs

---

## PDF Processing

### Rendering (PDF.js)
```typescript
// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Load document
const arrayBuffer = await file.arrayBuffer();
const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// Render page to canvas
const page = await doc.getPage(pageNumber);
const viewport = page.getViewport({ scale });
await page.render({ canvasContext: ctx, viewport }).promise;
```

### Export (pdf-lib)
```typescript
// Load original PDF
const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
const pages = pdfDoc.getPages();

// Embed text as image (for font/Arabic support)
const textImage = await pdfDoc.embedPng(imageData);
page.drawImage(textImage, { x, y, width, height });

// Embed signature
const signatureImage = await pdfDoc.embedPng(imageBytes);
page.drawImage(signatureImage, { x, y, width, height });

// Save and download
const pdfBytes = await pdfDoc.save();
```

---

## Arabic Text Support

Arabic text requires special handling because:
1. pdf-lib doesn't support complex text shaping natively
2. Arabic characters need right-to-left rendering and glyph shaping

### Solution: Canvas-Based Rendering
All text (including Arabic) is rendered to a canvas using the browser's native text engine, then embedded as PNG images:

```typescript
async function renderTextToImage(text, fontSize, color, fontFamily) {
  // Load Arabic font
  await loadArabicFontToDocument(); // Noto Sans Arabic from Google Fonts
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const isArabic = containsArabic(text);
  const font = isArabic 
    ? `${fontSize * 2}px 'Noto Sans Arabic', Arial` 
    : `${fontSize * 2}px ${fontFamily}, Arial`;
  
  if (isArabic) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
  }
  
  ctx.fillText(text, x, y);
  
  // Return as PNG bytes
  return canvas.toBlob() → arrayBuffer → Uint8Array
}
```

Arabic detection regex:
```typescript
/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
```

---

## Mobile Responsiveness

### Detection Hook
```typescript
// client/src/hooks/use-mobile.tsx
export function useIsMobile() {
  // Synchronous initialization to prevent layout jank
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 768px)").matches
  );
  // Listens for resize events
}
```

### Layout Differences

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Tools | Right sidebar (w-72) | Bottom sheet |
| Primary actions | Sidebar buttons | Fixed bottom toolbar |
| Zoom controls | Header + sidebar | Bottom toolbar |
| Resize handles | 12px | 24px (larger touch targets) |
| Min touch target | N/A | 44px minimum |
| Touch support | Mouse events | Touch + mouse events |

### Viewport-Aware Canvas Scaling

On mobile, the canvas is constrained to fit the viewport width while maintaining aspect ratio:

```typescript
// Calculate effective dimensions when canvas is clamped
const maxCanvasWidth = isMobile ? viewportWidth - 16 : Infinity;
const baseWidth = pageDimensions.width * zoom;
const baseHeight = pageDimensions.height * zoom;
const effectiveWidth = Math.min(baseWidth, maxCanvasWidth);
const scaleFactor = baseWidth > 0 ? effectiveWidth / baseWidth : 1;
const effectiveHeight = baseHeight * scaleFactor;
const effectiveScale = zoom * scaleFactor;

// Elements use effectiveScale for positioning (not raw zoom)
<TextElement scale={effectiveScale} ... />
<SignatureElement scale={effectiveScale} ... />
```

This ensures overlays (text/signatures) align correctly with the PDF regardless of viewport size.

### Local State for Text Input

To prevent keyboard dismissal on mobile during text editing, the TextElement uses local state while editing and only commits changes on blur:

```typescript
const [localContent, setLocalContent] = useState(element.content);

const handleInputChange = (e) => {
  setLocalContent(e.target.value); // Local only - no parent re-render
};

const handleInputBlur = () => {
  onUpdate({ content: localContent }); // Commit on blur
  setIsEditing(false);
};
```

### Touch Action for Editing vs Dragging

The element container uses conditional `touch-action` to support both dragging and text editing:

```typescript
className={`... ${isEditing ? "touch-auto" : "touch-none"} ...`}
```

- **`touch-none`**: Applied when NOT editing - prevents default touch behaviors so dragging works smoothly
- **`touch-auto`**: Applied when editing - allows normal touch input so the keyboard stays open while typing

### Text Properties Panel (TextToolbar) - Mobile Keyboard Fix

The Text Properties sidebar/sheet uses local state buffering to prevent keyboard dismissal on mobile. Without this, each keystroke would trigger a parent re-render, causing the Sheet component to remount and lose input focus:

```typescript
// client/src/components/text-toolbar.tsx
const [localContent, setLocalContent] = useState(element?.content || "");

// Sync when selected element changes
useEffect(() => {
  setLocalContent(element?.content || "");
}, [element?.id, element?.content]);

// Input uses local state - no parent re-render per keystroke
<Input
  value={localContent}
  onChange={(e) => setLocalContent(e.target.value)}  // Local only
  onBlur={() => onUpdate({ content: localContent })}  // Commit on blur
  onKeyDown={(e) => {
    if (e.key === "Enter") onUpdate({ content: localContent });
  }}
/>
```

This pattern ensures the keyboard stays open while typing on mobile, with changes committed when the user taps outside or presses Enter.

### Touch Event Handling

Both `text-element.tsx` and `signature-element.tsx` implement:

```typescript
// Unified drag start
const startDrag = (clientX, clientY) => { ... };

// Mouse handlers
const handleMouseDown = (e) => startDrag(e.clientX, e.clientY);
const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);

// Touch handlers
const handleTouchStart = (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY);
const handleTouchMove = (e) => {
  e.preventDefault(); // Prevent scroll
  handleMove(e.touches[0].clientX, e.touches[0].clientY);
};

// Attach listeners with { passive: false } for touch
window.addEventListener("touchmove", handleTouchMove, { passive: false });
```

### Safe Area Support

The mobile bottom toolbar uses safe area insets for devices with notches/home indicators:

```css
padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
```

---

## State Management

All state is managed with React's `useState` in the editor component:

```typescript
// PDF state
const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
const [pdfFile, setPdfFile] = useState<File | null>(null);
const [fileName, setFileName] = useState("");
const [totalPages, setTotalPages] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [zoom, setZoom] = useState(1.0);

// Elements (per-page)
const [textElements, setTextElements] = useState<TextElement[]>([]);
const [signatureElements, setSignatureElements] = useState<SignatureElement[]>([]);

// Selection
const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);

// UI state
const [showSignatureModal, setShowSignatureModal] = useState(false);
const [showExportModal, setShowExportModal] = useState(false);
const [showMobileTools, setShowMobileTools] = useState(false);
```

Elements are filtered by current page for display:
```typescript
const currentPageTextElements = textElements.filter(el => el.page === currentPage);
const currentPageSignatureElements = signatureElements.filter(el => el.page === currentPage);
```

---

## Styling & Theming

### Theme System
- Provider: `client/src/components/theme-provider.tsx`
- Toggle: `client/src/components/theme-toggle.tsx`
- Stored in localStorage as "light" or "dark"
- Applied via `.dark` class on `<html>` element

### Design System
See `design_guidelines.md` for complete details:
- **Colors**: Fluent Design inspired palette
- **Typography**: System fonts (Inter, Segoe UI)
- **Spacing**: Consistent 4px grid
- **Components**: Shadcn UI with custom tokens

### Key CSS Variables (in index.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --primary: 222.2 47.4% 11.2%;
  /* ... more tokens */
}

.dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
  /* ... dark variants */
}
```

---

## Running the Application

### Development
```bash
npm run dev
```
This starts:
- Express server on port 5000
- Vite dev server with HMR
- Frontend served at http://localhost:5000

### Production Build
```bash
npm run build
npm start
```

### Key Scripts (package.json)
```json
{
  "dev": "tsx server/index.ts",
  "build": "vite build",
  "start": "NODE_ENV=production tsx server/index.ts"
}
```

---

## Important Implementation Details

### 1. Coordinate System
- PDF.js uses bottom-left origin
- HTML/CSS uses top-left origin
- Conversion on export: `y = pageHeight - elementY - elementHeight`

### 2. Scale Handling
- Elements positioned in "PDF units" (1:1 at 100% zoom)
- Visual rendering scaled by zoom factor
- Drag calculations account for current scale

### 3. Selection Management
```typescript
// Clicking canvas deselects all
const handleCanvasClick = () => {
  setSelectedTextId(null);
  setSelectedSignatureId(null);
};

// Only one element can be selected at a time
const handleSelectText = (id) => {
  setSelectedTextId(id);
  setSelectedSignatureId(null);
};
```

### 4. Element Updates
```typescript
const handleUpdateTextElement = (id, updates) => {
  setTextElements(prev => prev.map(el => 
    el.id === id ? { ...el, ...updates } : el
  ));
};
```

### 5. Testing Attributes
All interactive elements have `data-testid` attributes:
- `button-*` for buttons
- `input-*` for inputs
- `text-element-{id}` for text elements
- `signature-element-{id}` for signatures
- `resize-handle-{corner}` for resize handles

### 6. Accessibility
- Keyboard navigation support (arrow keys for pages)
- Screen reader labels
- Focus management
- High contrast in both themes

### 7. Privacy
- No server uploads
- No analytics
- No cookies (except theme preference in localStorage)
- All processing in browser Web APIs

---

## Dependencies (Key Packages)

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18 | UI framework |
| pdfjs-dist | ^4 | PDF rendering |
| pdf-lib | ^1.17 | PDF modification |
| react-signature-canvas | ^1.0.6 | Signature drawing |
| tailwindcss | ^4 | Styling |
| wouter | ^3 | Routing |
| lucide-react | * | Icons |
| @radix-ui/* | * | Accessible primitives |
| zod | ^3 | Schema validation |

---

## Future Considerations

If extending this project:
1. **Form filling**: Detect and fill PDF form fields
2. **Annotations**: Highlights, underlines, shapes
3. **Multi-file**: Handle multiple PDFs in session
4. **Undo/Redo**: History stack for element changes
5. **Templates**: Save/load signature templates
6. **Cloud storage**: Optional save to user's cloud

---

*This documentation was created to enable seamless project transfer. For questions about specific implementation details, refer to the source files listed in each section.*
