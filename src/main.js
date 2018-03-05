const fse = require( 'fs-extra' );
const path = require( 'path' );
const chalk = require( 'chalk' );
const assign = Object.assign;
const {promisify} = require( 'util' );
const globP = promisify( require( 'glob' ) );
const ejs = require( 'ejs-blocks' );
const renderFileP = promisify( ejs );
const config = require( '../nanosite.config' );
const merge = require( 'deepmerge' );

module.exports = ( userConfig = {} ) => {
    const options = merge( config, userConfig );
    const {paths: {src, dist, views, assets}} = options;

    console.log( chalk.blue( 'Building static site...' ) );
    console.log( 'Current dir:', chalk.blue( path.join( src, views ) ) );

    // clear destination folder
    console.log( chalk.green( '-> Cleaning destination folder' ) );
    fse.emptyDirSync( dist );

    // copy assets folder
    console.log( chalk.green( '-> Copying assets' ) );
    fse.copy( path.join( src, assets ), path.join( dist, assets ) );

    // read page templates
    return globP( '**/*.{ejs,html}', {cwd: path.join( src, views )} )
        .then( files => {
            const compileP = [];

            files.forEach( file => {
                const fileData = path.parse( file );
                const destPath = path.join( dist, fileData.dir );
                const filePath = path.join( destPath, `${fileData.name}.html` );

                // create destination directory
                compileP.push(
                    fse.mkdirs( destPath )
                        // render page
                        .then( () => renderFileP( path.join( src, views, file ), options ) )
                        .then( content => {
                            // save the html file
                            // todo -> write to temp dir until entire process succeeds to prevent destructive errors
                            console.log( `Write:`, chalk.green( `-> ${filePath}` ) );
                            fse.writeFile( filePath, content );
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
                console.log( chalk.bold.blue( `Total Files: (${files.length})` ) );
                return files;
            } );
        } )
        .catch( err => console.error( chalk.red( err ) ) );
};

