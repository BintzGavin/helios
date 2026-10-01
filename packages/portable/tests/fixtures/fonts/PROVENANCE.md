# Test font provenance

Static Noto font fixtures used for reproducible shaping and multilingual rendering tests. Content-specific font assets are excluded from the deployed runtime package.

- [NotoSans-Regular.ttf](https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf) — SHA-256 `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5`.
- [NotoSansArabic-Regular.ttf](https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf) — SHA-256 `ceea25b464a656dc3b26849bab9356740401af62aedf1bfa8b7f0d9b75925b1b`.
- [NotoSansCJKsc-Regular.otf](https://github.com/notofonts/noto-cjk/blob/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf) — SHA-256 `2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b`.
- [NotoSansDevanagari-Regular.ttf](https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf) — SHA-256 `385e78e6359a9d88a0f243d53b1209d7548361ba2194e2b9ec779bcaa7e8949d`.

Redistributed under the accompanying SIL Open Font License files.

The neighboring `harfbuzz-oracles.json` was generated independently with the recorded uharfbuzz/HarfBuzz versions, using these exact font bytes, default OpenType features and buffer.guess_segment_properties(). It checks glyph order and placement, not full Unicode bidi or line-breaking conformance.
