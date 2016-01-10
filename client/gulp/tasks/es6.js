var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var ngAnnotate = require('gulp-ng-annotate');

var paths = require('../paths');

var compiler = require('gulp-babel');
var compilerOptions = require('../babelOptions');
compilerOptions.ignore = paths.srcIgnore;

gulp.task('es6', function () {
  return gulp.src(paths.srcIn)
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(compiler(compilerOptions))
    .pipe(ngAnnotate({
      sourceMap: true,
      gulpWarnings: false
    }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest(paths.srcOut));
});
