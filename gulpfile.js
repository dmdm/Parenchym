'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var SRC = 'client/build/';
var DST = 'client/src/';

gulp.task('default', function() {
  return gulp.src('foo.js')
    // This will output the non-minified version
    .pipe(gulp.dest(DST))
    // This will minify and rename to foo.min.js
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(DST));
});

