import { describe, it, expect } from "vitest";
import { stringifySRT, parseSRT, SubtitleCue } from "./srt-parser";

describe("srt-parser", () => {
  describe("stringifySRT", () => {
    it("should return an empty string for empty cues", () => {
      expect(stringifySRT([])).toBe("");
    });

    it("should format a single cue correctly", () => {
      const cues: SubtitleCue[] = [
        {
          startTime: 1.5,
          endTime: 4.0,
          text: "Hello World",
        },
      ];
      const expected = "1\n00:00:01,500 --> 00:00:04,000\nHello World\n\n";
      expect(stringifySRT(cues)).toBe(expected);
    });

    it("should format multiple cues correctly", () => {
      const cues: SubtitleCue[] = [
        { startTime: 0, endTime: 2, text: "First" },
        { startTime: 2.5, endTime: 5.123, text: "Second line\nWith newline" },
      ];
      const expected =
        "1\n00:00:00,000 --> 00:00:02,000\nFirst\n\n" +
        "2\n00:00:02,500 --> 00:00:05,123\nSecond line\nWith newline\n\n";
      expect(stringifySRT(cues)).toBe(expected);
    });

    it("should handle floating point precision correctly", () => {
       const cues: SubtitleCue[] = [
        { startTime: 61.001, endTime: 3661.999, text: "Precision" }
       ];
       // 61.001 = 00:01:01,001
       // 3661.999 = 01:01:01,999
       const expected = "1\n00:01:01,001 --> 01:01:01,999\nPrecision\n\n";
       expect(stringifySRT(cues)).toBe(expected);
    });

    it("should handle millisecond rounding overflow correctly", () => {
       // 0.9999 should round to 1.000 -> 00:00:01,000
       const cues: SubtitleCue[] = [
        { startTime: 0.9999, endTime: 1.0, text: "Rounding" }
       ];
       const expected = "1\n00:00:01,000 --> 00:00:01,000\nRounding\n\n";
       expect(stringifySRT(cues)).toBe(expected);
    });
  });

  describe("parseSRT", () => {
      it("should round-trip correctly", () => {
          const original = "1\n00:00:01,500 --> 00:00:04,000\nHello World\n\n";
          const cues = parseSRT(original);
          const stringified = stringifySRT(cues);
          expect(stringified).toBe(original);
      });
  });
});
