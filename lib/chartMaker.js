"use strict";

const { escapeXml } = require("./docUtils");

const CAT_AX_ID = 185176872;
const VAL_AX_ID = 185181136;

function normalizeChartData(raw) {
	if (!raw || typeof raw !== "object") {
		throw new Error("Chart data must be an object");
	}

	// Legacy dderg shape: { lines: [{ name, data: [{x,y}] }] }
	if (Array.isArray(raw.lines)) {
		const lines = raw.lines;
		const categories = (lines[0] && lines[0].data ? lines[0].data : []).map((p) =>
			String(p.x)
		);
		const series = lines.map((line) => ({
			name: line.name != null ? String(line.name) : "Series",
			data: (line.data || []).map((p) => Number(p.y)),
		}));
		return {
			type: "line",
			title: raw.title,
			categories,
			series,
			width: raw.width,
			height: raw.height,
		};
	}

	const categories = Array.isArray(raw.categories)
		? raw.categories.map((c) => String(c))
		: [];
	const series = Array.isArray(raw.series)
		? raw.series.map((s, i) => ({
				name: s.name != null ? String(s.name) : `Series ${i + 1}`,
				data: (s.data || []).map((n) => Number(n)),
		  }))
		: [];

	return {
		type: raw.type === "line" ? "line" : "bar",
		title: raw.title,
		categories,
		series,
		width: raw.width,
		height: raw.height,
	};
}

function catPointsXml(categories) {
	return categories
		.map(
			(cat, i) =>
				`<c:pt idx="${i}"><c:v>${escapeXml(cat)}</c:v></c:pt>`
		)
		.join("");
}

function valPointsXml(data) {
	return data
		.map((n, i) => `<c:pt idx="${i}"><c:v>${Number(n)}</c:v></c:pt>`)
		.join("");
}

function seriesXml(series, categories, chartType) {
	return series
		.map((s, i) => {
			const accent = (i % 6) + 1;
			const marker =
				chartType === "line"
					? `<c:marker><c:symbol val="none"/></c:marker>`
					: `<c:invertIfNegative val="0"/>`;
			const fill =
				chartType === "line"
					? ""
					: `<c:spPr><a:solidFill><a:schemeClr val="accent${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`;
			return `<c:ser>
				<c:idx val="${i}"/>
				<c:order val="${i}"/>
				<c:tx><c:v>${escapeXml(s.name)}</c:v></c:tx>
				${fill}
				${marker}
				<c:cat>
					<c:strLit>
						<c:ptCount val="${categories.length}"/>
						${catPointsXml(categories)}
					</c:strLit>
				</c:cat>
				<c:val>
					<c:numLit>
						<c:formatCode>General</c:formatCode>
						<c:ptCount val="${s.data.length}"/>
						${valPointsXml(s.data)}
					</c:numLit>
				</c:val>
			</c:ser>`;
		})
		.join("");
}

function titleXml(title) {
	if (!title) {
		return `<c:autoTitleDeleted val="1"/>`;
	}
	return `<c:title>
		<c:tx>
			<c:rich>
				<a:bodyPr/>
				<a:lstStyle/>
				<a:p>
					<a:pPr><a:defRPr/></a:pPr>
					<a:r><a:t>${escapeXml(title)}</a:t></a:r>
				</a:p>
			</c:rich>
		</c:tx>
		<c:overlay val="0"/>
	</c:title>`;
}

function chartBodyXml(data) {
	const chartType = data.type === "line" ? "line" : "bar";
	const chartTag = chartType === "line" ? "c:lineChart" : "c:barChart";
	const header =
		chartType === "line"
			? `<c:grouping val="standard"/><c:varyColors val="0"/>`
			: `<c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>`;
	const footer =
		chartType === "line"
			? `<c:marker val="1"/><c:axId val="${CAT_AX_ID}"/><c:axId val="${VAL_AX_ID}"/>`
			: `<c:gapWidth val="150"/><c:overlap val="0"/><c:axId val="${CAT_AX_ID}"/><c:axId val="${VAL_AX_ID}"/>`;

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<c:lang val="en-US"/>
	<c:roundedCorners val="0"/>
	<c:chart>
		${titleXml(data.title)}
		<c:plotArea>
			<c:layout/>
			<${chartTag}>
				${header}
				${seriesXml(data.series, data.categories, chartType)}
				${footer}
			</${chartTag}>
			<c:catAx>
				<c:axId val="${CAT_AX_ID}"/>
				<c:scaling><c:orientation val="minMax"/></c:scaling>
				<c:delete val="0"/>
				<c:axPos val="b"/>
				<c:majorTickMark val="out"/>
				<c:minorTickMark val="none"/>
				<c:tickLblPos val="nextTo"/>
				<c:crossAx val="${VAL_AX_ID}"/>
				<c:crosses val="autoZero"/>
				<c:auto val="1"/>
				<c:lblAlgn val="ctr"/>
				<c:lblOffset val="100"/>
				<c:noMultiLvlLbl val="0"/>
			</c:catAx>
			<c:valAx>
				<c:axId val="${VAL_AX_ID}"/>
				<c:scaling><c:orientation val="minMax"/></c:scaling>
				<c:delete val="0"/>
				<c:axPos val="l"/>
				<c:majorGridlines/>
				<c:numFmt formatCode="General" sourceLinked="1"/>
				<c:majorTickMark val="out"/>
				<c:minorTickMark val="none"/>
				<c:tickLblPos val="nextTo"/>
				<c:crossAx val="${CAT_AX_ID}"/>
				<c:crosses val="autoZero"/>
				<c:crossBetween val="between"/>
			</c:valAx>
		</c:plotArea>
		<c:legend>
			<c:legendPos val="b"/>
			<c:overlay val="0"/>
		</c:legend>
		<c:plotVisOnly val="1"/>
		<c:dispBlanksAs val="gap"/>
		<c:showDLblsOverMax val="0"/>
	</c:chart>
</c:chartSpace>`.replace(/>\s+</g, "><").replace(/\n\t+/g, "");
}

function drawingXml(rId, sizeEmus, centered, chartId) {
	const cx = sizeEmus[0];
	const cy = sizeEmus[1];
	const id = chartId || 1;
	const drawing = `<w:drawing>
		<wp:inline distT="0" distB="0" distL="0" distR="0">
			<wp:extent cx="${cx}" cy="${cy}"/>
			<wp:effectExtent l="0" t="0" r="0" b="0"/>
			<wp:docPr id="${id}" name="Chart ${id}"/>
			<wp:cNvGraphicFramePr/>
			<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
				<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
					<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${rId}"/>
				</a:graphicData>
			</a:graphic>
		</wp:inline>
	</w:drawing>`.replace(/>\s+</g, "><").replace(/\n\t+/g, "");

	if (centered) {
		return `<w:p>
			<w:pPr><w:jc w:val="center"/></w:pPr>
			<w:r><w:rPr><w:noProof/></w:rPr>${drawing}</w:r>
		</w:p>`.replace(/>\s+</g, "><").replace(/\n\t+/g, "");
	}
	return `<w:rPr><w:noProof/></w:rPr>${drawing}`;
}

module.exports = {
	normalizeChartData,
	chartBodyXml,
	drawingXml,
};
