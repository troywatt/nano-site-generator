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
        siteOrigin: 'http://localhost:3005',
        filemap: {
            // '/shell': 'global.min',
            '/account/password-*': 'my-account'
            // '/account/returns-*': ['returns', 'my-account']
        },
        penthouse: {
            // strict: true,
            keepLargerMediaQueries: true,
            dimensions: [
                {width: 320, height: 568},
                {width: 752, height: 640},
                {width: 1024, height: 640},
                {width: 1280, height: 768}
            ]
        }
    }
};