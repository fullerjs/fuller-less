"use strict";
var fs = require('fs');
var path = require('path');
var async = require('async');
var lesscss = require('less');

var FILE_ENCODING = 'utf-8';

var dependencies = {};
var verbose;
var fileTools;

var Less = function(fuller, plan) {
	if(!verbose) {
		verbose = fuller.verbose;
	}

	if(!fileTools) {
		fileTools = fuller.getTool('files');
	}

	this.tasks = plan.tasks;
	this.compress = !fuller.o.dev;

	this.src = fuller.pathes.src;
	this.dst = fuller.pathes.dst;
};

Less.prototype.buildDependenciesOne = function(cssFile, cb) {
	var lessFile = path.join(this.src, this.tasks[cssFile]);
	var parser = new lesscss.Parser({
		paths: [path.dirname(lessFile)],
		optimization: 0
	});

	parser.parse(fs.readFileSync(lessFile, FILE_ENCODING), function (err, tree) {
		if (err) {
			cb && cb(err);
		} else {
			var f, importFiles = parser.imports.files;

			fileTools.addDependence(dependencies, lessFile, cssFile);

			for(f in importFiles) {
				fileTools.addDependence(dependencies, f, cssFile);
			}

			cb && cb(null, 'ok');
		}
	});
};

Less.prototype.buildDependencies = function(cb) {
	var self = this, queue = {}, floor;

	var build = function(src) {
		return function(cb) {
				self.buildDependenciesOne(src, cb);
		};
	};

	for(floor in this.tasks) {
		queue[floor] = build(floor);
	}

	async.series(queue, function(err, result) {
		if(err) {
			cb && cb(err);
		} else {
			cb && cb(null, result);
		}

	});
};

Less.prototype.buildOneTask = function(floor, bricks, cbEach) {
	var self = this;
	return function(cb) {
			verbose.log("Building".green, path.join(self.dst, floor));
			self.buildOne(
				path.join(self.src, bricks),
				path.join(self.dst, floor),
				function(err, dst) {
					cb(err, dst);
					cbEach && cbEach(err, dst);
				}
			);
	};
};

Less.prototype.buildOne = function(src, dst, cb) {
	var self = this;
	var parser = new lesscss.Parser({
		paths: [path.dirname(src)],
		optimization: 0
	});

	parser.parse(fs.readFileSync(src, FILE_ENCODING), function (err, tree) {
		if (err) {
			cb && cb(err);
		} else {
			fileTools.writeForce(dst, tree.toCSS({compress: self.compress}), cb);
		}
	});
};

Less.prototype.build = function(cbEach, cbDone) {
	var queue = {}, floor;

	for(floor in this.tasks) {
		queue[floor] = this.buildOneTask(floor, this.tasks[floor], cbEach);
	}

	async.series(queue, function(err, result) {
		cbDone && cbDone(err, result);
	});
};

Less.prototype.watch = function(cb) {
	var self = this;

	async.waterfall([
		function(cb) {
			self.buildDependencies(cb);
		},

		function(result, cb) {
			fileTools.watchFiles( self.src, dependencies, function(filename){
				var f, filesToBuild = dependencies[filename];
				var queue = {};

				verbose.log("Changed ".red, filename);

				for(f in filesToBuild) {
					queue[f] = self.buildOneTask(filesToBuild[f], self.tasks[filesToBuild[f]]);
				}

				async.series(queue, cb);

			});
		}
	], cb);

};


module.exports = Less;
