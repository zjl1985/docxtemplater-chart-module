"use strict";

const DocUtils = require("./docUtils");

const rels = {
	getPrefix(fileType) {
		return fileType === "docx" ? "word" : "ppt";
	},
	getFileTypeName(fileType) {
		return fileType === "docx" ? "document" : "presentation";
	},
	getRelsFileName(fileName) {
		return fileName.replace(/^.*?([a-zA-Z0-9]+)\.xml$/, "$1") + ".xml.rels";
	},
	getRelsFilePath(fileName, fileType) {
		const relsFileName = rels.getRelsFileName(fileName);
		const prefix = fileType === "pptx" ? "ppt/slides" : "word";
		return `${prefix}/_rels/${relsFileName}`;
	},
};

module.exports = class ChartManager {
	constructor(zip, fileName, xmlDocuments, fileType) {
		this.fileName = fileName;
		this.prefix = rels.getPrefix(fileType);
		this.zip = zip;
		this.xmlDocuments = xmlDocuments;
		this.fileTypeName = rels.getFileTypeName(fileType);
		this.mediaPrefix = fileType === "pptx" ? "../charts" : "charts";
		const relsFilePath = rels.getRelsFilePath(fileName, fileType);
		this.relsDoc =
			xmlDocuments[relsFilePath] ||
			this.createEmptyRelsDoc(xmlDocuments, relsFilePath);
	}

	createEmptyRelsDoc(xmlDocuments, relsFileName) {
		const mainRels = this.prefix + "/_rels/" + this.fileTypeName + ".xml.rels";
		const doc = xmlDocuments[mainRels];
		if (!doc) {
			const err = new Error("Could not copy from empty relsdoc");
			err.properties = {
				mainRels,
				relsFileName,
				files: Object.keys(this.zip.files),
			};
			throw err;
		}
		const relsDoc = DocUtils.str2xml(DocUtils.xml2str(doc));
		const relationships = relsDoc.getElementsByTagName("Relationships")[0];
		const relationshipChilds = relationships.getElementsByTagName("Relationship");
		// Collect first — live NodeList shrinks as we remove
		const toRemove = Array.prototype.slice.call(relationshipChilds);
		toRemove.forEach((child) => relationships.removeChild(child));
		xmlDocuments[relsFileName] = relsDoc;
		return relsDoc;
	}

	loadChartRels() {
		const iterable = this.relsDoc.getElementsByTagName("Relationship");
		return Array.prototype.reduce.call(
			iterable,
			function (max, relationship) {
				const id = relationship.getAttribute("Id");
				if (/^rId[0-9]+$/.test(id)) {
					return Math.max(max, parseInt(id.substr(3), 10));
				}
				return max;
			},
			0
		);
	}

	addOverrideRels(partName) {
		const contentTypeDoc = this.xmlDocuments["[Content_Types].xml"];
		const overrideTags = contentTypeDoc.getElementsByTagName("Override");
		const partNameRegistered = Array.prototype.some.call(overrideTags, function (tag) {
			return tag.getAttribute("PartName") === "/" + partName || tag.getAttribute("PartName") === partName;
		});
		if (partNameRegistered) {
			return;
		}
		const types = contentTypeDoc.getElementsByTagName("Types")[0];
		const newTag = contentTypeDoc.createElement("Override");
		newTag.setAttribute("PartName", "/" + partName);
		newTag.setAttribute(
			"ContentType",
			"application/vnd.openxmlformats-officedocument.drawingml.chart+xml"
		);
		types.appendChild(newTag);
	}

	/**
	 * Add a chart XML part and return its relationship id (numeric).
	 */
	addChartRels(chartName, chartXml, i) {
		if (i == null) {
			i = 0;
		}
		const realName = i === 0 ? chartName : chartName.replace(/\.xml$/, `(${i}).xml`);
		const chartPath = `${this.prefix}/charts/${realName}`;
		if (this.zip.files[chartPath] != null) {
			return this.addChartRels(chartName, chartXml, i + 1);
		}
		this.zip.file(chartPath, chartXml, { binary: false });
		this.addOverrideRels(chartPath);
		const relationships = this.relsDoc.getElementsByTagName("Relationships")[0];
		const newTag = this.relsDoc.createElement("Relationship");
		const maxRid = this.loadChartRels() + 1;
		newTag.setAttribute("Id", `rId${maxRid}`);
		newTag.setAttribute(
			"Type",
			"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"
		);
		newTag.setAttribute("Target", `${this.mediaPrefix}/${realName}`);
		relationships.appendChild(newTag);
		return maxRid;
	}
};
