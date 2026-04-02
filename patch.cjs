const fs = require('fs');
let content = fs.readFileSync('client/src/pages/editor.tsx', 'utf8');

// 1. Add ImagePlus to lucide-react imports
content = content.replace(
  '  Pen,\n  Download,',
  '  Pen,\n  ImagePlus,\n  Download,'
);

// 2. Add Image components imports
content = content.replace(
  'import { SignatureModal } from "@/components/signature-modal";',
  'import { SignatureModal } from "@/components/signature-modal";\nimport { ImageModal } from "@/components/image-modal";'
);
content = content.replace(
  'import { SignatureElement } from "@/components/signature-element";',
  'import { SignatureElement } from "@/components/signature-element";\nimport { ImageElement } from "@/components/image-element";'
);

// 3. Add ImageElement to schema imports
content = content.replace(
  '  SignatureElement as SignatureElementType,\n} from "@shared/schema";',
  '  SignatureElement as SignatureElementType,\n  ImageElement as ImageElementType,\n} from "@shared/schema";'
);

// 4. Add states
content = content.replace(
  '  const [signatureElements, setSignatureElements] = useState<\n    SignatureElementType[]\n  >([]);',
  '  const [signatureElements, setSignatureElements] = useState<\n    SignatureElementType[]\n  >([]);\n  const [imageElements, setImageElements] = useState<ImageElementType[]>([]);'
);

content = content.replace(
  '  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(\n    null\n  );',
  '  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(\n    null\n  );\n  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);'
);

content = content.replace(
  '  const [showSignatureModal, setShowSignatureModal] = useState(false);',
  '  const [showSignatureModal, setShowSignatureModal] = useState(false);\n  const [showImageModal, setShowImageModal] = useState(false);'
);

// 5. Update canvas click
content = content.replace(
  '      setSelectedSignatureId(null);\n    }\n  }, []);',
  '      setSelectedSignatureId(null);\n      setSelectedImageId(null);\n    }\n  }, []);'
);

// 6. Update handlers
content = content.replace(
  '    setSelectedTextId(null);\n  }, [currentPage]);',
  '    setSelectedTextId(null);\n    setSelectedImageId(null);\n  }, [currentPage]);\n\n  const handleAddImage = useCallback(\n    (imageData: string, naturalWidth: number, naturalHeight: number) => {\n      const defaultWidth = 200;\n      const aspect = naturalHeight / Math.max(naturalWidth, 1);\n      const defaultHeight = Math.round(defaultWidth * aspect);\n      const newImage: ImageElementType = {\n        id: generateId(),\n        imageData,\n        x: 100,\n        y: 150,\n        width: defaultWidth,\n        height: defaultHeight,\n        page: currentPage,\n      };\n      setImageElements((prev) => [...prev, newImage]);\n      setSelectedImageId(newImage.id);\n      setSelectedTextId(null);\n      setSelectedSignatureId(null);\n    },\n    [currentPage]\n  );'
);

content = content.replace(
  '    setSelectedTextId(null);\n  }, []);',
  '    setSelectedTextId(null);\n    setSelectedImageId(null);\n  }, []);'
);

content = content.replace(
  '    setSelectedSignatureId(null);\n  }, []);',
  '    setSelectedSignatureId(null);\n    setSelectedImageId(null);\n  }, []);\n\n  const handleUpdateImage = useCallback(\n    (id: string, updates: Partial<ImageElementType>) => {\n      setImageElements((prev) =>\n        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))\n      );\n    },\n    []\n  );\n\n  const handleDeleteImage = useCallback((id: string) => {\n    setImageElements((prev) => prev.filter((el) => el.id !== id));\n    setSelectedImageId(null);\n  }, []);'
);

// 7. Update export
content = content.replace(
  '          signatureElements\n        );',
  '          signatureElements,\n          imageElements\n        );'
);
content = content.replace(
  '    [pdfFile, textElements, signatureElements, toast]',
  '    [pdfFile, textElements, signatureElements, imageElements, toast]'
);

// 8. Update current page elements
content = content.replace(
  '    (el) => el.page === currentPage\n  );\n\n  const selectedText',
  '    (el) => el.page === currentPage\n  );\n  const currentPageImageElements = imageElements.filter(\n    (el) => el.page === currentPage\n  );\n\n  const selectedText'
);

// 9. Update UI Tools
content = content.replace(
  '            <span className="text-xs font-medium">Add Signature</span>\n          </Button>\n        </div>',
  '            <span className="text-xs font-medium">Add Signature</span>\n          </Button>\n          <Button\n            className="col-span-2 h-14 flex-col gap-2 bg-blue-500/10 hover:bg-blue-500/20 border-2 border-blue-400/40 text-blue-600 dark:text-blue-400"\n            variant="outline"\n            onClick={() => {\n              setShowImageModal(true);\n              setShowMobileTools(false);\n            }}\n            data-testid="button-add-image"\n          >\n            <ImagePlus className="h-5 w-5" />\n            <span className="text-xs font-medium">Add Image</span>\n          </Button>\n        </div>'
);

// 10. Update text/empty states
content = content.replace(
  '          {currentPageTextElements.length === 0 &&\n            currentPageSignatureElements.length === 0 && (\n              <p className="text-xs text-muted-foreground italic py-2">\n                No elements on this page. Tap "Add Text" or "Add Signature" above to get started.\n              </p>\n            )}',
  '          {currentPageTextElements.length === 0 &&\n            currentPageSignatureElements.length === 0 &&\n            currentPageImageElements.length === 0 && (\n              <p className="text-xs text-muted-foreground italic py-2">\n                No elements on this page. Tap "Add Text", "Add Signature", or "Add Image" above to get started.\n              </p>\n            )}'
);

// 11. Make sure to deselect others when selecting text or signature
content = content.replaceAll(
  '                setSelectedTextId(el.id);\n                setSelectedSignatureId(null);\n              }}',
  '                setSelectedTextId(el.id);\n                setSelectedSignatureId(null);\n                setSelectedImageId(null);\n              }}'
);

content = content.replaceAll(
  '                setSelectedSignatureId(el.id);\n                setSelectedTextId(null);\n              }}',
  '                setSelectedSignatureId(el.id);\n                setSelectedTextId(null);\n                setSelectedImageId(null);\n              }}'
);

content = content.replaceAll(
  '                  setSelectedTextId(element.id);\n                  setSelectedSignatureId(null);\n                }}',
  '                  setSelectedTextId(element.id);\n                  setSelectedSignatureId(null);\n                  setSelectedImageId(null);\n                }}'
);

content = content.replaceAll(
  '                  setSelectedSignatureId(element.id);\n                  setSelectedTextId(null);\n                }}',
  '                  setSelectedSignatureId(element.id);\n                  setSelectedTextId(null);\n                  setSelectedImageId(null);\n                }}'
);

// 12. Add element items in list
content = content.replace(
  '              <span className="text-xs">Signature</span>\n            </div>\n          ))}',
  '              <span className="text-xs">Signature</span>\n            </div>\n          ))}\n          {currentPageImageElements.map((el) => (\n            <div\n              key={el.id}\n              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${\n                selectedImageId === el.id\n                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"\n                  : "hover-elevate"\n              }`}\n              onClick={() => {\n                setSelectedImageId(el.id);\n                setSelectedTextId(null);\n                setSelectedSignatureId(null);\n              }}\n              data-testid={`element-list-image-${el.id}`}\n            >\n              <ImagePlus className="h-3 w-3" />\n              <span className="text-xs">Image</span>\n            </div>\n          ))}'
);

// 13. Add Image element component on canvas
content = content.replace(
  '                onDelete={() => handleDeleteSignature(element.id)}\n              />\n            ))}',
  '                onDelete={() => handleDeleteSignature(element.id)}\n              />\n            ))}\n\n            {currentPageImageElements.map((element) => (\n              <ImageElement\n                key={element.id}\n                element={element}\n                isSelected={selectedImageId === element.id}\n                scale={effectiveScale}\n                onSelect={() => {\n                  setSelectedImageId(element.id);\n                  setSelectedTextId(null);\n                  setSelectedSignatureId(null);\n                }}\n                onUpdate={(updates) => handleUpdateImage(element.id, updates)}\n                onDelete={() => handleDeleteImage(element.id)}\n              />\n            ))}'
);

// 14. Mobile tools
content = content.replace(
  '              <Button\n                className="flex-1 max-w-32 bg-primary text-primary-foreground"\n                onClick={() => setShowSignatureModal(true)}\n                data-testid="button-mobile-add-signature"\n              >\n                <Pen className="h-4 w-4 mr-1" />\n                Sign\n              </Button>',
  '              <Button\n                className="flex-1 max-w-32 bg-primary text-primary-foreground"\n                onClick={() => setShowSignatureModal(true)}\n                data-testid="button-mobile-add-signature"\n              >\n                <Pen className="h-4 w-4 mr-1" />\n                Sign\n              </Button>\n\n              <Button\n                className="flex-1 max-w-32 bg-blue-600 text-white"\n                onClick={() => setShowImageModal(true)}\n                data-testid="button-mobile-add-image"\n              >\n                <ImagePlus className="h-4 w-4 mr-1" />\n                Image\n              </Button>'
);

// 15. Modals
content = content.replace(
  '      <SignatureModal\n        open={showSignatureModal}\n        onClose={() => setShowSignatureModal(false)}\n        onSave={handleAddSignature}\n      />',
  '      <SignatureModal\n        open={showSignatureModal}\n        onClose={() => setShowSignatureModal(false)}\n        onSave={handleAddSignature}\n      />\n\n      <ImageModal\n        open={showImageModal}\n        onClose={() => setShowImageModal(false)}\n        onSave={handleAddImage}\n      />'
);

fs.writeFileSync('client/src/pages/editor.tsx', content);
