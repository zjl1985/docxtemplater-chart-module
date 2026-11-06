"use strict";

const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

function str2xml(str) {
	if (str.charCodeAt(0) === 0xfeff) {
		str = str.substr(1);
	}
	return new DOMParser().parseFromString(str, "text/xml");
}

function xml2str(xmlNode) {
	return new XMLSerializer().serializeToString(xmlNode);
}

function convertPixelsToEmus(pixel) {
	return Math.round(Number(pixel) * 9525);
}

function escapeXml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

module.exports = {
	str2xml,
	xml2str,
	convertPixelsToEmus,
	escapeXml,
};
