var gulp         = require('gulp');
var sass         = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var browserSync = require('browser-sync');
//var sassdoc      = require('sassdoc');

var rc = require('../rc');
var paths = require('../paths');


gulp.task(
    'sass', function () {
        "use strict";
        return gulp
        // Find all `.scss` files from src
            .src(paths.sassIn)
            // Build sourcemaps
            .pipe(sourcemaps.init())
            // Run Sass on those files
            .pipe(sass(rc.sassOptions).on('error', sass.logError))
            // Set vendor prefixes
            .pipe(autoprefixer(rc.autoprefixerOptions))
            // Path for sourcemaps relative to gulp.dest
            .pipe(sourcemaps.write('.'))
            // Write the resulting CSS in the output folder
            .pipe(gulp.dest(paths.sassOut))
            .pipe(browserSync.reload(rc.browserSyncOptions));
/*
            // Documentation
            .pipe(sassdoc(sassdocOptions))
            // Release the pressure back and trigger flowing mode (drain)
            // See: http://sassdoc.com/gulp/#drain-event
            .resume();
*/
    }
);
