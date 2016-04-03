module.exports = {
    sassIn: [
        'client/src/sass/*.scss',
        'client/src/sass/pym/**/*.scss'
    ],
    sassOut: 'pym/static/assets/css/',

    srcIn: 'client/src/app/**/*.ts',
    srcOut: 'pym/static/app',
    srcIgnore: [],
    srcSystemConfig: 'client/src/app/config.js',

    html: 'client/src/**/*.html',
    json: 'client/src/**/*.json',
    templates: 'client/src/**/*.html',
    tests: 'client/test/e2e/**/*.spec.js'
};
