"use strict";
var fs = require("fs");
var path = require("path");
var less = require("less");

var FILE_ENCODING = "utf-8";

var Less = function(fuller, options) {
	fuller.bind(this);

	this.Stream = fuller.streams.Capacitor;
	this.compress = !options.dev;
	this.src = options.src;
	this.dst = options.dst;
	this.watch = options.watch;
};

Less.prototype.compile = function(lessString, master, cb) {
	var self = this;

	less.render(lessString, {
		paths: [this.src],
		compress: this.compress
	}, function(err, output) {
		if (err) {
			console.log(err);
			cb(err);
		} else {
			if(self.watch) {
				self.addDependencies(output.imports, master);
			}
			cb(null, output.css);
		}
	});
};

Less.prototype.build = function(stream, master) {
	var self = this,
		next = new this.Stream(true, function(result, cb) {
			self.compile(result, master, cb);
		});

	if(typeof stream === "string") {
		var src = path.join(this.src, stream);
		this.addDependence(src, master);
		return fs.createReadStream(src, {encoding: FILE_ENCODING}).pipe(next);
	} else {
		return stream.pipe(next);
	}
};


module.exports = Less;
