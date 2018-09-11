const {promisify} = require( 'util' );
const fse = require( 'fs-extra' );
const path = require( 'path' );
const chalk = require( 'chalk' );
const globP = promisify( require( 'glob' ) );
const ejs = require( 'ejs-blocks' );
const renderFileP = promisify( ejs );
const merge = require( 'deepmerge' );
const pathExists = require( 'path-exists' );
const Purgecss = require( 'purgecss' );
const purgeHtml = require( 'purge-from-html' );
const penthouse = require( 'penthouse' );

const config = require( '../nanosite.config' );

console.log( chalk.red( 'YO !!LOADED LOCAL INSTANCE' ) );

function resetBlocks ( options ) {
    // reset each view block so values are not compounded across renders
    if ( options.blocks ) {
        Object.keys( options.blocks ).forEach( blk => {
            options.blocks[blk].replace( '' )
        } );
    }
}

module.exports = ( userConfig = {} ) => {
    const options = merge( config, userConfig );
    const {
        paths: {distDir, viewsDir, assetsDir, assetsDistDir, excludeDirs, excludeInFilename},
        purgecss: purgecssConfig,
        criticalCSS
    } = options;

    console.log( chalk.blue( 'Building static site...' ) );
    console.log( 'Current dir:', chalk.blue( viewsDir ) );

    // clear destination folder
    console.log( chalk.green( '-> Cleaning destination folder' ) );

    fse.emptyDirSync( distDir );

    // copy assets folder
    if ( pathExists.sync( assetsDir ) ) {
        console.log( chalk.green( '-> Copying assets' ) );
        fse.copySync( assetsDir, assetsDistDir );
    }

    fse.copySync( '_requests', assetsDistDir );

    // read page templates
    glob = '**';
    glob += excludeDirs.length ? `/!(${excludeDirs.join( '|' )})` : '/**';
    glob += excludeInFilename.length ? `/!(${excludeInFilename.join( '|' )})` : '/';
    glob += '*.{ejs,html}';

    return globP( glob, {cwd: viewsDir} )

    // render required view templates
        .then( files => {
            const compileP = [];

            files.forEach( file => {
                const fileData = path.parse( file );
                const destPath = path.join( distDir, fileData.dir );
                const filePath = path.join( destPath, `${fileData.name}.html` );

                // reset ejs blocks on each pass to prevent duplicate rendered blocks across template files
                resetBlocks( options );

                // create destination directory
                compileP.push(
                    renderFileP( path.join( viewsDir, file ), options )
                        .then( content => {
                            // save the html file
                            console.log( `Write:`, chalk.green( `-> ${filePath}` ) );
                            return fse.mkdirs( destPath ).then( () => fse.writeFile( filePath, content ) );
                        } )
                        .catch( err => {
                            console.log( `!Failed to write file`, chalk.red( `-> ${filePath}` ) );
                            console.error( chalk.red( err ) );
                            console.error( chalk.bold.red( '\n\r*** Process terminate ***' ) );
                            process.exit( 1 );
                        } )
                );
            } );

            return Promise.all( compileP ).then( files => {
                console.log( chalk.bold.blue( `Total Files: (${files.length})\n\r` ) );
                return files;
            } );
        } )

        // purge unused CSS by extracting styles from rendered views
        /*.then( () => {
            const {content, css, whitelist, whitelistPatterns} = purgecssConfig;
            const contentPaths = path.join( distDir, content );
            const cssPaths = path.join( distDir, css );

            console.log( chalk.blue( 'Purging unused CSS...' ) );
            console.log( 'Content path:', chalk.blue( contentPaths ) );
            console.log( 'CSS path:', chalk.blue( cssPaths ) );

            return Promise.all( [
                globP( contentPaths ),
                globP( cssPaths )
            ] ).then( ( [content, css] ) => {
                const purgecss = new Purgecss( {
                    content,
                    css,
                    whitelist,
                    whitelistPatterns,
                    extractors: [
                        {
                            extractor: class PurgeFromJs {
                                static extract ( content ) {
                                    return content.match( /[A-Za-z0-9_-]+/g ) || []
                                }
                            },
                            extensions: ['js']
                        },
                        {
                            extractor: purgeHtml,
                            extensions: ['html']
                        }
                    ]
                } );

                purgecss.purge().forEach( item => {
                    console.log( `Write:`, chalk.green( `-> ${item.file}` ) );
                    fse.writeFile( item.file, item.css );
                } );
                return this;
            } );

        } )*/

        // generate critical CSS
        .then( () => {
            const filemap = criticalCSS.filemap;
            console.log( chalk.blue( 'Generating critical CSS ...' ) );
            console.log( 'Filemap:', chalk.blue( JSON.stringify( filemap ) ) );

            Object.entries( filemap ).map( ( [viewPath, cssFile] ) => {
                // todo - clean logic
                const cssGlob = (Array.isArray( cssFile ) && cssFile.length > 1)
                    ? `{${cssFile.join( ',' )}}`
                    : cssFile.toString();

                // todo - clean logic
                const viewEntry = path.join( distDir, viewPath ) + '.html';
                const cssEntry = path.join( distDir, 'css', cssGlob ) + '.css';

                console.log( 'Penthouse:', viewEntry, cssEntry );
                const views = globP( viewEntry );
                const cssList = globP( cssEntry );

                Promise.all( [views, cssList] )
                    .then( ( [views, cssList] ) => {
                        let cssString = cssList.map( cssFile => fse.readFileSync( cssFile ) ).join( '' );

                        // const ROOT = '/Users/troywatt/Sites/upi/UPI/Ultradent/UPI.Webstore.Frontend/UPI.Webstore.Frontend';
                        const ROOT = 'http://localhost:3005';

                        const penthouseResults = views.map( filePath => {
                            // const url = `file://${path.join( ROOT, filePath )}`;
                            const url = ROOT + filePath.replace( 'package/build', '' );
                            console.log( 'Load html:', url );
                            return penthouse( {
                                url: url,
                                cssString,
                                ...criticalCSS.penthouse
                            } ).catch( err => {
                                console.log( chalk.red( `[Penthouse] ${err}` ) )
                            } );
                        } );

                        Promise.all( penthouseResults ).then( results => {
                            const concatCriticalCSS = results.reduce( ( acc, next ) => acc += next, '' );
                            const criticalCSSFilePath = path.join( distDir,
                                'css',
                                `${cssFile}.critical.css` );
                            console.log( `Write:`, chalk.green( `-> ${criticalCSSFilePath}` ) );
                            fse.writeFileSync( criticalCSSFilePath, concatCriticalCSS );
                        } );
                    } )
                    .catch( err => {
                        console.log( chalk.red( '[CriticalCSS]', err ) );
                    } );
            } )

            // penthouse( {
            //     ...criticalCSS.penthouse,
            //     url: 'http://localhost:3005/account/change-password',
            //     css: './src/global.min.css'
            //
            // } ).then( criticalCSS => {
            //     fs.writeFileSync( 'dist/critical.css', criticalCSS );
            // } );
        } )

        .catch( err => console.error( chalk.red( `[NanogenError] ${err}` ) ) );
};

