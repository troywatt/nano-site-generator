module.exports = {
    settings: {
        'view engine': 'ejs'
    },
    purgecss: {
        content: '**/*.{html,js}',
        css: '**/*.css',
        whitelist: [],
        whitelistPatterns: [
            // todo -> look into these defaults to see if necessary
            /:hover/,
            /:active/,
            /:visited/,
            /:link/
        ]
    },
    paths: {
        srcDir: 'src',
        distDir: 'public',
        viewsDir: 'src/pages',
        assetsDir: 'src/assets',
        assetsDistDir: 'public/assets',
        excludeDirs: [],
        excludeInFilename: []
    },
    criticalCSS: {
        siteOrigin: null,
        filemap: {
            // example
            // '/shell': 'global.min',
        },
        penthouse: {
            // strict: true,
            keepLargerMediaQueries: true,
            renderWaitTime: 500,
            dimensions: [
                {width: 320, height: 568},
                {width: 752, height: 640},
                {width: 1024, height: 640},
                {width: 1280, height: 768}
            ]
        }
    }
};