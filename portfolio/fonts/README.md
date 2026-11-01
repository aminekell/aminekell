# Local typefaces

These fonts are served with the portfolio. The page makes no request to Google Fonts or another font CDN. All `@font-face` declarations use `font-display: swap`.

| Asset | Bytes | Distribution |
| --- | ---: | --- |
| `dm-sans-latin-variable.woff2` | 31,052 | DM Sans, variable weight 400–700, optical size fixed at 14 |
| `IBMPlexMono-Regular-Latin1.woff2` | 17,544 | IBM Plex Mono Regular, official Latin 1 subset |
| `IBMPlexMono-Regular-Pi.woff2` | 13,780 | IBM Plex Mono Regular, official symbols subset |
| `IBMPlexMono-Medium-Latin1.woff2` | 17,868 | IBM Plex Mono Medium, official Latin 1 subset |
| `IBMPlexMono-Medium-Pi.woff2` | 13,968 | IBM Plex Mono Medium, official symbols subset |

Total font payload: **94,212 bytes**. The browser selects symbol subsets through `unicode-range` and only fetches faces it uses. Intermediate DM Sans weights such as 450 and 650 remain true variable instances. IBM Plex Mono uses its supplied 400 and 500 faces; unsupported glyphs use the CSS fallback stack.

## Sources and licenses

DM Sans comes from the official [Google Fonts distribution](https://github.com/google/fonts/tree/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/dmsans), revision `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec`. Its original variable TTF is `DMSans[opsz,wght].ttf`. Copyright 2014 The DM Sans Project Authors. The bundled [DM-Sans-OFL.txt](DM-Sans-OFL.txt) is the unchanged upstream SIL Open Font License 1.1. DM Sans declares no reserved font name in that license.

The DM Sans file was subset and converted locally with FontTools 4.68.0 and Brotli 1.2.1. The retained Unicode ranges are U+0000–024F, U+1E00–1EFF, U+2000–26FF, U+FEFF, and U+FFFD, restricted to glyphs present in the source. Layout features are retained. The source was subset first, then its optical-size axis was pinned to 14 and its weight axis restricted to 400–700 using `fontTools.varLib.instancer.instantiateVariableFont`. The final container is WOFF2. This subset remains distributed under the same OFL.

IBM Plex Mono files come directly from [IBM's official Plex repository](https://github.com/IBM/plex/tree/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-mono/fonts/split/woff2), revision `71f558992315a12ca1f06a2215d57962a1992162`. They are unmodified upstream WOFF2 files. Copyright 2017 IBM Corp., with reserved font name “Plex.” The bundled [IBM-Plex-Mono-OFL.txt](IBM-Plex-Mono-OFL.txt) is the unchanged upstream license.

`SOURCES.json` records the precise download URLs, final byte counts, variable axes, and SHA-256 digests. The raw TTF and conversion tools are development-only and are not required to run the site.
