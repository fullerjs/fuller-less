'use strict';
let less = require('less');

module.exports = function(f, mat, options, next) {
  mat.getContent(function(content) {
    less.render(content.toString(), {
      paths: [ mat.src.dirname ],
      compress: !options.dev
    }, function(err, output) {
      let path = mat.dst().path;
      if (err) {
        next({
          message: err.message,
          file: err.filename === 'input' ? path : err.filename,
          line: err.line,
          column: err.column,
          extract: err.extract.join('\n')
        });
      } else {
        f.addDependencies(output.imports, mat.id);
        next(null, mat.setContent(output.css));
      }
    });
  });
};
