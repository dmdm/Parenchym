var gulp = require('gulp');
var browserSync = require('browser-sync');

var paths = require('../paths');


function logInfo(event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
}

gulp.task(
    'watch', function () {
        gulp.watch(paths.sassIn, ['sass']).on('change', logInfo);
        gulp.watch(paths.srcIn, ['ts', 'systemConfig']).on('change', logInfo);
        gulp.watch(paths.srcSystemConfig, ['systemConfig']).on('change', logInfo);
    }
);
