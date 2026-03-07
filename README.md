# PDF Editor

A web-based PDF editor focused on adding names and signatures to PDF documents.

## Overview

This application allows users to:
- Upload PDF documents from their device
- Add text anywhere on PDF pages with custom font, size, and color
- Add signatures by drawing, typing, or uploading an image
- Move and resize text and signature elements
- Export the edited PDF with all changes embedded
- All editing happens in the browser - files are never uploaded to servers

## Tech Stack

- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI components
- **PDF Viewing**: PDF.js for rendering PDF pages in the browser
- **PDF Editing**: pdf-lib for modifying and exporting PDFs
- **Signature Drawing**: react-signature-canvas
- **Routing**: Wouter
- **State Management**: React useState hooks (client-side only)

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn UI components
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── signature-modal.tsx
│   │   ├── signature-element.tsx
│   │   ├── text-element.tsx
│   │   ├── text-toolbar.tsx
│   │   └── export-modal.tsx
│   ├── lib/
│   │   ├── pdf-utils.ts  # PDF loading, rendering, and export utilities
│   │   ├── queryClient.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── landing.tsx   # Homepage with file upload
│   │   └── editor.tsx    # Main PDF editor interface
│   ├── App.tsx
│   └── index.css
shared/
├── schema.ts             # TypeScript types for elements
server/
├── routes.ts            # Minimal backend (no API needed)
└── storage.ts           # Empty storage (all data is client-side)
```

## Key Features

1. **Landing Page**: Drag-and-drop upload zone with feature highlights
2. **PDF Viewer**: Renders PDF pages using PDF.js with zoom and page navigation
3. **Text Tool**: Add and edit text with font family, size, and color controls
4. **Signature Modal**: Three methods to create signatures - draw, type, or upload
5. **Draggable Elements**: Text and signatures can be moved and resized on the canvas
6. **Export**: Downloads the edited PDF with all changes embedded using pdf-lib

## Design Principles

- Fluent Design aesthetic for productivity focus
- Clean, minimal interface with focus on the document
- Dark mode support via theme toggle
- Responsive design for desktop and tablet use
- All processing happens client-side for privacy

## Running the Application

The application runs with `npm run dev` which starts both the Express server and Vite dev server.

## Recent Changes

- Initial implementation: Landing page, PDF editor, signature modal, export functionality
- Added theme toggle for dark/light mode support
- Implemented drag-and-drop for text and signature elements
- Added Arabic text support with canvas-based rendering for pdf-lib export
- Mobile responsiveness improvements:
  - Viewport-aware canvas scaling (effectiveScale calculation)
  - Minimum 44px touch targets and 24px resize handles
  - Safe area inset support for bottom toolbar
  - Local state buffering in TextToolbar to prevent keyboard dismissal
  - Conditional touch-action (touch-none/touch-auto) for drag vs edit modes
- Created PROJECT_DOCUMENTATION.md with complete technical documentation
