import bidiFactory from "bidi-js";

/**
 * Bidirectional text layout for PDF export.
 *
 * pdf-lib hands text to fontkit, which shapes each string in the direction of
 * its dominant script. That produces correct Arabic letterforms, but it knows
 * nothing about the Unicode Bidirectional Algorithm - so a string that mixes
 * Arabic with digits or Latin comes out with the embedded runs reversed
 * ("2026" printing as "6202").
 *
 * The fix is to run UAX #9 ourselves, split the string into directional runs,
 * and hand each run to pdf-lib separately in logical order at its own x
 * offset. fontkit then shapes each run correctly and we control their
 * left-to-right placement on the page.
 */

const bidi = bidiFactory();

const ARABIC_RANGE =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export type TextDirection = "auto" | "ltr" | "rtl";

export function containsArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

/** Resolves "auto" against the text's own content. */
export function resolveDirection(
  text: string,
  direction: TextDirection = "auto"
): "ltr" | "rtl" {
  if (direction !== "auto") return direction;
  return containsArabic(text) ? "rtl" : "ltr";
}

export interface DirectionalRun {
  text: string;
  rtl: boolean;
}

/**
 * Splits `text` into directional runs ordered left-to-right as they should
 * appear on the page. Each run's characters stay in logical order, which is
 * what fontkit expects.
 */
export function toVisualRuns(
  text: string,
  direction: "ltr" | "rtl"
): DirectionalRun[] {
  if (!text) return [];

  const levels = bidi.getEmbeddingLevels(text, direction);
  const order = bidi.getReorderedIndices(text, levels);

  const groups: Array<{ rtl: boolean; indices: number[] }> = [];
  for (const index of order) {
    const rtl = levels.levels[index] % 2 === 1;
    const last = groups[groups.length - 1];
    if (!last || last.rtl !== rtl) {
      groups.push({ rtl, indices: [index] });
    } else {
      last.indices.push(index);
    }
  }

  return groups.map((group) => {
    // Visual order runs backwards inside an RTL group; undo that so the run is
    // back in logical order for the shaper.
    const indices = group.rtl ? [...group.indices].reverse() : group.indices;
    return {
      text: indices.map((i) => text[i]).join(""),
      rtl: group.rtl,
    };
  });
}
