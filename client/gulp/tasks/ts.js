var gulp      = require('gulp');
var ts        = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');
var paths     = require('../paths');


gulp.task(
    'ts', function () {
        var tsResult = tsProject.src()
            .pipe(ts(tsProject));
        return tsResult.js.pipe(gulp.dest(paths.srcOut));
    }
);
