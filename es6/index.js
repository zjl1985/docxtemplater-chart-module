"use strict";

const templates = require("./chartTemplates");
const DocUtils = require("docxtemplater").DocUtils;
const DOMParser = require("xmldom").DOMParser;

function isNaN(number) {
    return !(number === number);
}

const ChartManager = require("./chartManager");
const moduleName = "open-xml-templating/docxtemplater-chart-module";

function getInnerDocx({ part }) {
    return part;
}

class ChartModule {
    constructor(options) {
        this.name = "ChartModule";
        this.options = options || {};
        this.chartManagers = {};
        if (this.options.centered == null) { this.options.centered = false; }
        this.chartNumber = 1;
    }
    optionsTransformer(options, docxtemplater) {
        const relsFiles = docxtemplater.zip.file(/\.xml\.rels/)
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
            return { type, value: placeHolderContent.substr(2), module, centered: true };
        }
        if (placeHolderContent.substring(0, 1) === "$") {
            return { type, value: placeHolderContent.substr(1), module, centered: false };
        }
        return null;
    }
    postparse(parsed) {
        let expandTo;
        let getInner;
        expandTo = this.options.centered ? "w:p" : "w:t";
        getInner = getInnerDocx;
        return DocUtils.traits.expandToOne(parsed, { moduleName, getInner, expandTo });
    }
    render(part, options) {
        this.chartManagers[options.filePath] = this.chartManagers[options.filePath] || new ChartManager(this.zip, options.filePath, this.xmlDocuments, this.fileType);
        const chartManager = this.chartManagers[options.filePath];
        if (!part.type === "placeholder" || part.module !== moduleName) {
            return null;
        }
        try {
            const tagValue = options.scopeManager.getValue(part.value);
            if (!tagValue) {
                console.error('tagValue is empty');
                throw new Error("tagValue is empty");
            }
            // const imgBuffer = this.options.getImage(tagValue, part.value);

            const chartXML = templates.getChartTestXml();
            const rId = chartManager.addImageRels(this.getNextImageName(), chartXML);
            return this.getRenderedPart(part, rId);
            // return { value: '<w:rPr><w:rFonts w:hint="eastAsia"/></w:rPr><w:t>' + tagValue + '</w:t>' };
        } catch (e) {
            console.error(this.fileTypeConfig.tagTextXml);
            return { value: this.fileTypeConfig.tagTextXml };
        }
    }
    getRenderedPart(part, rId) {
        if (isNaN(rId)) {
            console.error('rId is NaN, abortin');

            throw new Error("rId is NaN, aborting");
        }

        let newText;
        newText = this.getRenderedPartDocx(rId);
        return { value: newText };
    }
    getRenderedPartDocx(rId) {
        // return centered ? templates.getChartXmlCentered(rId, size) : templates.getChartXml(rId, size);
        return templates.getChartXml(rId);
    }
    getNextImageName() {
        const name = `chart_${this.chartNumber}.xml`;
        this.chartNumber++;
        return name;
    }
}

module.exports = ChartModule;