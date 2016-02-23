module.exports = {
    sassOptions: {
        errLogToConsole: true,
        outputStyle: 'expanded'
    },
    autoprefixerOptions: {
        browsers: ['last 2 versions', '> 5%', 'Firefox ESR']
    },
    sassdocOptions: {
        dest: './doc/sassdoc'
    },
    browserSyncOptions: {
        stream: true
    }
};
