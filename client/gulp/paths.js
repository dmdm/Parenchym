module.exports = {
    sassIn: [
        'client/src/sass/*.scss',
        'client/src/sass/pym/**/*.scss'
    ],
    sassOut: 'pym/static/assets/css/',

    srcIn: 'client/src/app/**/*.js',
    srcOut: 'pym/static/app',
    srcIgnore: ['client/src/app/app-material-start/**/*.js'],

    html: 'client/src/**/*.html',
    json: 'client/src/**/*.json',
    templates: 'client/src/**/*.html',
    tests: 'client/test/e2e/**/*.spec.js'
};

