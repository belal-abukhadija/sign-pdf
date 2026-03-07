# PDF Editor Design Guidelines

## Design Approach
**System Selected**: Fluent Design (Microsoft) - optimized for productivity and document-centric workflows
**Rationale**: This is a utility-focused application where efficiency, clarity, and professional appearance are paramount. Fluent's document-editing patterns align perfectly with PDF manipulation workflows.

## Typography
- **Primary Font**: Inter or System UI Stack
- **Hierarchy**:
  - H1: 32px/bold - App title, main headings
  - H2: 24px/semibold - Section headers, modal titles
  - H3: 18px/semibold - Toolbar sections, panel headers
  - Body: 14px/regular - UI labels, descriptions
  - Small: 12px/regular - Helper text, metadata
  - Mono: 13px/mono - File names, technical details

## Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8, 12 for tight, precise UI controls
- **Editor Canvas**: Center-aligned PDF viewer with 50% max-width to allow toolbars on sides
- **Toolbars**: Fixed top toolbar (h-16) and collapsible side panel (w-80)
- **Modals**: max-w-2xl for signature creation, max-w-md for settings

## Component Library

### Landing Page (Simple Utility Focus)
- **Hero**: Split layout - left: headline "Edit PDFs Instantly" + upload zone (dotted border, drag-drop), right: animated preview showing PDF → edit → download flow
- **Features Grid**: 3-column (lg) → 1-column (mobile): Upload, Edit, Export with icons
- **CTA Section**: Prominent "Start Editing" button with file picker
- **Footer**: Minimal - privacy notice, supported formats

### Editor Interface (Primary Application)
**Top Toolbar** (fixed, bg-white, border-b):
- Left: Logo, file name display
- Center: Zoom controls (-, 100%, +), page navigation (← 1/5 →)
- Right: Export button (primary), Settings icon

**Left Sidebar** (w-80, collapsible):
- **Text Tool Panel**: Font selector, size picker (12-72px), color picker
- **Signature Panel**: 3 tabs - Draw, Type, Upload with preview area
- **Form Fields Panel**: Draggable field templates (Name, Date, Signature boxes)

**Main Canvas**:
- PDF viewer with scroll (bg-gray-100 for contrast)
- Draggable overlays for text/signature elements with resize handles
- Active element: blue border (2px), corner resize handles (8x8px)
- Grid guides appear on drag (dotted lines)

**Signature Modal** (when creating signature):
- **Draw Tab**: Canvas area (500x200px) with Clear/Done buttons, stroke preview
- **Type Tab**: Input field + 6 signature font previews in grid
- **Upload Tab**: Drag-drop zone with image preview and crop tool

**Export Modal**:
- File name input
- Format options: PDF (embedded), PDF (flattened)
- Quality slider if applicable
- Download button (large, primary)

### Interactive Elements
- **Draggable Items**: Cursor changes to move icon, semi-transparent during drag
- **Resize Handles**: 8px corner circles, visible on hover/active
- **Toolbar Buttons**: Icon-only with tooltips, 40x40px click targets
- **Tool Panels**: Accordion-style sections with expand/collapse
- **Upload Zone**: Dashed border (2px), changes to solid on drag-over

### Responsive Behavior
- **Desktop** (lg+): Full sidebar + toolbar layout
- **Tablet** (md): Collapsible sidebar, floating toolbar buttons
- **Mobile**: Bottom sheet for tools, simplified single-column view

## Images
**Landing Page Only**:
1. **Hero Visual**: Screenshot or illustration of PDF editor interface (right side of split layout, 600x400px)
2. **Feature Icons**: Simple line icons for Upload (cloud-arrow), Edit (pen), Export (download) - use Heroicons
3. **Preview Animation**: Optional GIF/video showing edit flow (can be static screenshots if no animation)

**No images in editor interface** - focus on functional UI clarity

## Form & Input Standards
- Input fields: h-10, rounded border, focus ring (2px blue)
- Buttons: h-10 for secondary, h-12 for primary actions
- Checkboxes/Radio: 20x20px, rounded for checkboxes, circular for radio
- Color picker: Standard HTML color input styled to match UI

## Accessibility
- All toolbar buttons: aria-labels and keyboard shortcuts (Ctrl+S export, etc.)
- PDF canvas: keyboard navigation between elements (Tab/Arrow keys)
- Signature canvas: ARIA live region announcing stroke actions
- High contrast mode support for element outlines