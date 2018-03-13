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

const config = require( '../nanosite.config' );

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
        purgecss: purgecssConfig
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
        .then( files => {
            const compileP = [];

            files.forEach( file => {
                const fileData = path.parse( file );
                const destPath = path.join( distDir, fileData.dir );
                const filePath = path.join( destPath, `${fileData.name}.html` );
                const fileName = `${fileData.dir.replace( '/', '-' )}-${fileData.name}.html`;

                // create destination directory

                resetBlocks( options );

                compileP.push(
                    renderFileP( path.join( viewsDir, file ), options )
                        .then( content => {
                            // save the html file
                            // todo -> write to temp dir until entire process succeeds to prevent destructive errors
                            console.log( `Write:`, chalk.green( `-> ${path.join( distDir, fileName )}` ) );

                            fse.writeFile( path.join( distDir, fileName ),
                                content
                                    .replace( /src="\/js/gi, 'src="js' )
                                    .replace( /\/css/gi, 'css' )
                                    .replace( /'\/ecommerce/gi, '\'ecommerce' )
                            );
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

        .then( () => {
            const {content, css, whitelist, whitelistPatterns} = purgecssConfig;
            console.log( chalk.blue( 'Running purgecss...' ) );
            console.log( 'Content path:', chalk.blue( path.join( distDir, '**/*.{html,js}' ) ) );
            console.log( 'CSS path: ', chalk.blue( path.join( distDir, 'css/*.css' ) ) );
            console.log( 'purgecssConfig: ', chalk.blue( JSON.stringify( purgecssConfig ) ) );

            return Promise.all( [
                globP( path.join( distDir, content ) ),
                globP( path.join( distDir, css ) )
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

        } )

        .catch( err => console.error( chalk.red( `[NanogenError] ${err}` ) ) );
};

