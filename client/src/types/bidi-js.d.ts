declare module 'bidi-js' {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface Bidi {
    getEmbeddingLevels(text: string, direction?: 'ltr' | 'rtl' | 'auto'): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels): string;
    /** Character indices of `text` in visual (left-to-right) order. */
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels): number[];
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number
    ): Array<[number, number]>;
  }

  function bidiFactory(): Bidi;
  export default bidiFactory;
}
