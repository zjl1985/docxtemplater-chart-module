"use strict";

const DocUtils = require("docxtemplater").DocUtils;
const ChartManager = require("./chartManager");
const LocalDocUtils = require("./docUtils");
const { normalizeChartData, chartBodyXml, drawingXml } = require("./chartMaker");

const moduleName = "open-xml-templating/docxtemplater-chart-module";

function getInnerDocx({ part }) {
	return part;
}

class ChartModule {
	constructor(options) {
		this.name = "ChartModule";
		this.requiredAPIVersion = "3.0.0";
		this.options = options || {};
		this.chartManagers = {};
		if (this.options.centered == null) {
			this.options.centered = false;
		}
		this.chartNumber = 1;
	}

	optionsTransformer(options, docxtemplater) {
		const relsFiles = docxtemplater.zip
			.file(/\.xml\.rels/)
			.concat(docxtemplater.zip.file(/\[Content_Types\].xml/))
			.map((file) => file.name);
		this.fileTypeConfig = docxtemplater.fileTypeConfig;
		this.fileType = docxtemplater.fileType;
		this.zip = docxtemplater.zip;
		options.xmlFileNames = options.xmlFileNames.concat(relsFiles);
		return options;
	}

	set(options) {
		if (options.zip) {
			this.zip = options.zip;
		}
		if (options.xmlDocuments) {
			this.xmlDocuments = options.xmlDocuments;
		}
	}

	parse(placeHolderContent) {
		const module = moduleName;
		const type = "placeholder";
		if (placeHolderContent.substring(0, 2) === "$$") {
			return {
				type,
				value: placeHolderContent.substr(2),
				module,
				centered: true,
			};
		}
		if (placeHolderContent.substring(0, 1) === "$") {
			return {
				type,
				value: placeHolderContent.substr(1),
				module,
				centered: false,
			};
		}
		return null;
	}

	postparse(parsed) {
		const expandTo = this.options.centered ? "w:p" : "w:t";
		return DocUtils.traits.expandToOne(parsed, {
			moduleName,
			getInner: getInnerDocx,
			expandTo,
		});
	}

	render(part, options) {
		if (part.type !== "placeholder" || part.module !== moduleName) {
			return null;
		}
		if (this.fileType === "pptx") {
			throw new Error(
				"docxtemplater-chart-module v4 currently supports docx only (pptx not implemented)"
			);
		}

		this.chartManagers[options.filePath] =
			this.chartManagers[options.filePath] ||
			new ChartManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
		const chartManager = this.chartManagers[options.filePath];

		const tagValue = options.scopeManager.getValue(part.value, { part });
		if (!tagValue) {
			return { value: this.fileTypeConfig.tagTextXml };
		}

		const data = normalizeChartData(tagValue);
		const chartXml = chartBodyXml(data);
		const rId = chartManager.addChartRels(this.getNextChartName(), chartXml);

		const widthPx = data.width || 553;
		const heightPx = data.height || 323;
		const sizeEmus = [
			LocalDocUtils.convertPixelsToEmus(widthPx),
			LocalDocUtils.convertPixelsToEmus(heightPx),
		];
		const centered = this.options.centered || part.centered;
		return {
			value: drawingXml(rId, sizeEmus, centered, this.chartNumber - 1),
		};
	}

	getNextChartName() {
		const name = `chart_${this.chartNumber}.xml`;
		this.chartNumber++;
		return name;
	}
}

module.exports = ChartModule;
