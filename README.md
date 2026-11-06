# docxtemplater-chart-module

Insert OOXML charts into `.docx` files from JSON data, as a [docxtemplater](https://docxtemplater.com/) module.

> **v4 revive** — rewritten for docxtemplater 3.40+ / PizZip. Supports **bar** (clustered column) and **line** charts in Word documents. PPTX is not supported yet.

## Install

```bash
npm install docxtemplater-chart-module docxtemplater pizzip
```

## Usage

In your Word template, put a chart placeholder:

- `{$sales}` — inline chart
- `{$$sales}` — centered chart (paragraph)

```js
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ChartModule = require("docxtemplater-chart-module");

const content = fs.readFileSync("template.docx", "binary");
const zip = new PizZip(content);

const doc = new Docxtemplater(zip, {
  modules: [new ChartModule()],
});

doc.render({
  sales: {
    title: "Quarterly sales",
    type: "bar", // "bar" (default) or "line"
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "2024", data: [12, 18, 9, 15] },
      { name: "2025", data: [14, 20, 11, 17] },
    ],
    // optional size in pixels (converted to EMUs × 9525)
    width: 553,
    height: 323,
  },
});

fs.writeFileSync("out.docx", doc.getZip().generate({ type: "nodebuffer" }));
```

### Modern data shape

```js
{
  categories: string[],
  series: [{ name?: string, data: number[] }],
  type?: "bar" | "line",   // default: "bar"
  title?: string,
  width?: number,          // px
  height?: number          // px
}
```

### Legacy (dderg) line shape

Still accepted and treated as a line chart:

```js
{
  lines: [
    { name: "Series A", data: [{ x: "Jan", y: 10 }, { x: "Feb", y: 14 }] },
  ],
}
```

## How it works

The module:

1. Parses `{$name}` / `{$$name}` placeholders.
2. Builds a minimal OOXML chart (`word/charts/chart_N.xml`) from your data.
3. Registers the chart in `[Content_Types].xml` and `document.xml.rels`.
4. Embeds a drawing that references the chart relationship.

## Limitations

- **docx only** — PPTX is not implemented in v4.
- Chart types: **bar** (clustered column) and **line** only.
- No embedded Excel workbook behind the chart (literal values in the chart XML). Word opens and edits the chart; some advanced Excel-linked features will not apply.

## License

MIT — see [licence.md](./licence.md).
