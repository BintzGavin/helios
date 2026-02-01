import { describe, it, expect } from "vitest";
import { stringifySRT, parseSRT, parseCaptions, SubtitleCue } from "./caption-parser";

describe("caption-parser", () => {
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
       const expected = "1\n00:01:01,001 --> 01:01:01,999\nPrecision\n\n";
       expect(stringifySRT(cues)).toBe(expected);
    });

    it("should handle millisecond rounding overflow correctly", () => {
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

  describe("parseCaptions", () => {
      it("should detect and parse SRT", () => {
          const srt = "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n";
          const cues = parseCaptions(srt);
          expect(cues).toHaveLength(1);
          expect(cues[0].text).toBe("Hello");
      });

      it("should detect and parse WebVTT", () => {
          const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n";
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(1);
          expect(cues[0].text).toBe("Hello");
      });
  });

  describe("parseWebVTT", () => {
      it("should parse simple WebVTT", () => {
          const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
Hello World
`;
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(1);
          expect(cues[0].startTime).toBe(1);
          expect(cues[0].endTime).toBe(2);
          expect(cues[0].text).toBe("Hello World");
      });

      it("should handle timestamps without hours", () => {
          const vtt = `WEBVTT

00:01.000 --> 00:02.000
No Hours
`;
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(1);
          expect(cues[0].startTime).toBe(1);
          expect(cues[0].endTime).toBe(2);
      });

      it("should handle mixed dot and comma timestamps", () => {
          const vtt = `WEBVTT

00:00:01,000 --> 00:00:02.000
Mixed
`;
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(1);
          expect(cues[0].startTime).toBe(1);
          expect(cues[0].endTime).toBe(2);
      });

      it("should ignore metadata headers", () => {
           const vtt = `WEBVTT
Region: id=fred width=40% lines=3 regionanchor=0%,100% viewportanchor=10%,90% scroll=up
Style:
::cue {
  background-image: linear-gradient(to bottom, dimgray, lightgray);
  color: papayawhip;
}

00:00:01.000 --> 00:00:02.000
Ignore Header
`;
           const cues = parseCaptions(vtt);
           expect(cues).toHaveLength(1);
           expect(cues[0].text).toBe("Ignore Header");
      });

      it("should ignore comments (NOTE)", () => {
          const vtt = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:02.000
Real Cue

NOTE
Another comment
that spans multiple lines

00:00:03.000 --> 00:00:04.000
Another Cue
`;
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(2);
          expect(cues[0].text).toBe("Real Cue");
          expect(cues[1].text).toBe("Another Cue");
      });

      it("should handle cues with identifiers", () => {
          const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
Cue with ID
`;
          const cues = parseCaptions(vtt);
          expect(cues).toHaveLength(1);
          expect(cues[0].text).toBe("Cue with ID");
      });
  });
});
