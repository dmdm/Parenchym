var gulp      = require('gulp');
var paths     = require('../paths');


gulp.task(
    'systemConfig', function () {
        return gulp.src(paths.srcSystemConfig).pipe(gulp.dest(paths.srcOut));
    }
);
