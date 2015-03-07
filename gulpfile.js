'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var gutil  = require('gulp-util');
var stripDebug = require('gulp-strip-debug');
var sourcemaps = require('gulp-sourcemaps');
var minifyCSS = require('gulp-minify-css');

var SRC = 'client/src/';
var DST = 'client/build/';

gulp.task('default', function() {
    console.log('No default task yet');
});

// ===[ Parenchym ]=======

/**
 * app
 */
gulp.task('app', function() {
    var _src = SRC + 'app/',
        _dst = DST + 'app/';

    return gulp.src([
                _src + 'plugins.js',
                _src + 'pym.js',
                _src + 'app.js',
                _src + 'boot-ng.js',
            ])
        .pipe(sourcemaps.init())
            .pipe(concat('app.js'))
        .pipe(sourcemaps.write())
        .pipe(stripDebug())
        // This will output the non-minified version
        .pipe(gulp.dest(_dst))
        // This will minify and rename to foo.min.js
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(_dst))
        .on('error', gutil.log);
});



// ===[ My forks of vendor packages ]=======

/**
 * flexy-layout
 */
gulp.task('flexy-layout', ['flexy-layout-js', 'flexy-layout-css']);

gulp.task('flexy-layout-watch', function () {
    var _src = SRC + 'app/flexy-layout/src/';
    gulp.watch(_src + '*.js', ['flexy-layout-js']);
    gulp.watch(_src + '*.css', ['flexy-layout-css']);
});

gulp.task('flexy-layout-js', function() {
    var _src = SRC + 'app/flexy-layout/src/',
        // DST inside package
        _dst1 = SRC + 'app/flexy-layout/',
        // DST for Pym
        _dst2 = DST + 'app/flexy-layout/';

    return gulp.src(_src + '*.js')
        .pipe(sourcemaps.init())
            .pipe(concat('flexy-layout.js'))
        .pipe(sourcemaps.write())
        .pipe(stripDebug())
        // This will output the non-minified version
        .pipe(gulp.dest(_dst1))
        .pipe(gulp.dest(_dst2))
        // This will minify and rename to foo.min.js
        .pipe(uglify())
        .pipe(rename({ extname: '.min.js' }))
        .pipe(gulp.dest(_dst1))
        .pipe(gulp.dest(_dst2))
        .on('error', gutil.log);
});

gulp.task('flexy-layout-css', function() {
    var _src = SRC + 'app/flexy-layout/src/',
        // DST inside package
        _dst1 = SRC + 'app/flexy-layout/',
        // DST for Pym
        _dst2 = DST + 'app/flexy-layout/';

    return gulp.src(_src + '*.css')
        .pipe(sourcemaps.init())
            .pipe(concat('flexy-layout.css'))
        .pipe(sourcemaps.write())
        // This will output the non-minified version
        .pipe(gulp.dest(_dst1))
        .pipe(gulp.dest(_dst2))
        // This will minify and rename to foo.min.js
        .pipe(minifyCSS())
        .pipe(rename({ extname: '.min.css' }))
        .pipe(gulp.dest(_dst1))
        .pipe(gulp.dest(_dst2))
        .on('error', gutil.log);

});

