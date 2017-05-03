"use strict";
/* eslint-disable no-console */

var fs = require("fs");
var protobuf = require("protobufjs");
let a = fs.readFileSync('111.png', 'base64');
console.log(a);
console.log(base64.decode(a));