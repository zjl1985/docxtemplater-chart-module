"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ChartModule = require("../lib/index.js");

const OUT_DIR = path.join(__dirname, "..", "examples");
const OUT_FILE = path.join(OUT_DIR, "out-smoke.docx");

/**
 * Minimal valid docx zip containing a {$sales} placeholder in document.xml.
 */
function buildTemplateZip() {
	const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

	const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

	const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

	const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Sales chart: {$sales}</w:t>
      </w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;

	const zip = new PizZip();
	zip.file("[Content_Types].xml", contentTypes);
	zip.file("_rels/.rels", rels);
	zip.file("word/document.xml", document);
	zip.file("word/_rels/document.xml.rels", documentRels);
	return zip;
}

describe("docxtemplater-chart-module smoke", function () {
	it("inserts a data-driven bar chart for {$sales}", function () {
		const zip = buildTemplateZip();
		const doc = new Docxtemplater(zip, {
			modules: [new ChartModule()],
			paragraphLoop: true,
			linebreaks: true,
		});

		doc.render({
			sales: {
				title: "Quarterly sales",
				type: "bar",
				categories: ["Q1", "Q2", "Q3", "Q4"],
				series: [
					{ name: "East", data: [4.3, 2.5, 3.5, 4.5] },
					{ name: "West", data: [2.4, 4.4, 1.8, 2.8] },
				],
				width: 553,
				height: 323,
			},
		});

		const outZip = doc.getZip();
		const chartPath = "word/charts/chart_1.xml";
		const chartFile = outZip.file(chartPath);
		assert.ok(chartFile, `expected ${chartPath} in output zip`);
		const chartXml = chartFile.asText();

		assert.ok(chartXml.includes("<c:barChart>"), "expected barChart");
		assert.ok(chartXml.includes("<c:v>Q1</c:v>"), "expected category Q1");
		assert.ok(chartXml.includes("<c:v>East</c:v>"), "expected series East");
		assert.ok(chartXml.includes("<c:v>4.3</c:v>"), "expected series value 4.3");
		assert.ok(chartXml.includes("<c:v>2.8</c:v>"), "expected series value 2.8");
		assert.ok(chartXml.includes("Quarterly sales"), "expected title");

		const ct = outZip.file("[Content_Types].xml").asText();
		assert.ok(
			ct.includes("drawingml.chart+xml"),
			"Content_Types should register chart Override"
		);

		const docRels = outZip.file("word/_rels/document.xml.rels").asText();
		assert.ok(
			/relationships\/chart/.test(docRels),
			"document.xml.rels should contain chart Relationship"
		);
		assert.ok(
			/Target="charts\/chart_1\.xml"/.test(docRels),
			"rels Target should point at chart_1.xml"
		);

		const documentXml = outZip.file("word/document.xml").asText();
		assert.ok(
			documentXml.includes("drawingml/2006/chart"),
			"document should embed chart drawing"
		);

		if (!fs.existsSync(OUT_DIR)) {
			fs.mkdirSync(OUT_DIR, { recursive: true });
		}
		fs.writeFileSync(OUT_FILE, outZip.generate({ type: "nodebuffer" }));
		assert.ok(fs.existsSync(OUT_FILE), "smoke output should be written");
	});

	it("supports legacy { lines } shape as a line chart", function () {
		const zip = buildTemplateZip();
		const doc = new Docxtemplater(zip, {
			modules: [new ChartModule()],
		});

		doc.render({
			sales: {
				lines: [
					{
						name: "Temp",
						data: [
							{ x: "Mon", y: 10 },
							{ x: "Tue", y: 12 },
							{ x: "Wed", y: 9 },
						],
					},
				],
			},
		});

		const chartXml = doc.getZip().file("word/charts/chart_1.xml").asText();
		assert.ok(chartXml.includes("<c:lineChart>"), "expected lineChart");
		assert.ok(chartXml.includes("<c:v>Mon</c:v>"));
		assert.ok(chartXml.includes("<c:v>Temp</c:v>"));
		assert.ok(chartXml.includes("<c:v>12</c:v>"));
	});

	it("XML-escapes category and series names", function () {
		const zip = buildTemplateZip();
		const doc = new Docxtemplater(zip, {
			modules: [new ChartModule()],
		});

		doc.render({
			sales: {
				categories: ["A & B", "<C>"],
				series: [{ name: 'X "Y"', data: [1, 2] }],
			},
		});

		const chartXml = doc.getZip().file("word/charts/chart_1.xml").asText();
		assert.ok(chartXml.includes("A &amp; B"));
		assert.ok(chartXml.includes("&lt;C&gt;"));
		assert.ok(chartXml.includes("X &quot;Y&quot;"));
	});
});
