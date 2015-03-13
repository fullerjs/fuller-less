"use strict";
let less = require("less");
let through2 = require("through2");

let Less = function(fuller, options) {
	fuller.bind(this);

	this.compress = !options.dev;
	this.src = options.src;
	this.watch = options.watch;
};

Less.prototype.compile = function(lessString, master, cb) {
	let self = this;

	less.render(lessString, {
		paths: [this.src],
		compress: this.compress
	}, function(err, output) {
		if (err) {
			self.error({
				message: err.message,
				file: err.filename === "input" ? master : err.filename,
				line: err.line,
				column: err.column,
				extract: err.extract.join("\n")
			});
			cb();
		} else {
			if (self.watch) {
				self.addDependencies(output.imports, master);
			}
			cb(null, output.css);
		}
	});
};

Less.prototype.build = function(stream, master) {
	let self = this,
		buffer = [];

	return stream.pipe( through2(
		function(chunk, enc, cb) {
			buffer.push(chunk);
			cb();
		},
		function(cb) {
			let that = this;
			self.compile(buffer.join(""), master, function(err, result) {
				!err && that.push(result);
				cb();
			});
		}
	));
};


module.exports = Less;
