"use strict";
var fs = require('fs');
var path = require('path');
var lesscss = require('less');

var FILE_ENCODING = 'utf-8';

var Less = function(fuller, options) {
	fuller.bind(this);

	this.Stream = fuller.streams.Capacitor;
	this.compress = !options.dev;
	this.src = options.src;
	this.dst = options.dst;
	this.watch = options.watch;
};

Less.prototype.addDependencies = function(importFiles, master) {
	for(var f in importFiles) {
		this.addDependence(f, master);
	}
};

Less.prototype.compile = function(lessString, master, cb) {
	var self = this;
	var parser = new lesscss.Parser({
		paths: [this.src]
	});

	parser.parse(lessString, function (err, tree) {
		if (err) {
			cb(err);
		} else {
			if(self.watch) {
				self.addDependencies(parser.imports.files, master);
			}
			cb(null, tree.toCSS({compress: self.compress}) );
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
