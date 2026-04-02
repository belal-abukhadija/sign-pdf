import { z } from "zod";

export const signatureSchema = z.object({
  id: z.string(),
  type: z.enum(["draw", "type", "upload"]),
  data: z.string(),
  fontFamily: z.string().optional(),
  createdAt: z.date(),
});

export type Signature = z.infer<typeof signatureSchema>;

export const textElementSchema = z.object({
  id: z.string(),
  content: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  page: z.number(),
});

export type TextElement = z.infer<typeof textElementSchema>;

export const signatureElementSchema = z.object({
  id: z.string(),
  signatureData: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number(),
});

export type SignatureElement = z.infer<typeof signatureElementSchema>;

export const imageElementSchema = z.object({
  id: z.string(),
  imageData: z.string(),   // base64 data URL
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number(),
});

export type ImageElement = z.infer<typeof imageElementSchema>;

export const pdfEditorStateSchema = z.object({
  fileName: z.string(),
  totalPages: z.number(),
  currentPage: z.number(),
  zoom: z.number(),
  textElements: z.array(textElementSchema),
  signatureElements: z.array(signatureElementSchema),
  imageElements: z.array(imageElementSchema),
});

export type PDFEditorState = z.infer<typeof pdfEditorStateSchema>;
