### 4.0.0

- Revive for docxtemplater ^3.40 (tested on 3.71.x) + PizZip.
- Data-driven chart XML (no more hardcoded test chart).
- Support modern `{ categories, series }` and legacy `{ lines }` shapes.
- Chart types: bar (clustered column, default) and line.
- Tags: `{$name}` inline, `{$$name}` centered.
- Fix `part.type !== "placeholder"` operator-precedence bug.
- Switch to `@xmldom/xmldom`; drop babel / browserify build chain.
- Clean package.json (author zjl1985, correct repository URLs).

### 3.0.2

- Historical image-module-fork release (2017). Unmaintained until 4.0.0.
