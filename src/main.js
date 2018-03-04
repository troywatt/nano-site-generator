const fse = require( 'fs-extra' );
const path = require( 'path' );
const chalk = require( 'chalk' );
const assign = Object.assign;
const {promisify} = require( 'util' );
const globP = promisify( require( 'glob' ) );
const ejs = require( 'ejs-blocks' );
const renderFileP = promisify( ejs );
const config = require( '../nanosite.config' );

// todo -> make configurable
const {paths} = config;

module.exports = function () {
    console.log( chalk.blue( 'Building static site...' ) );

    // clear destination folder
    console.log( '-> Cleaning destination folder' );
    fse.emptyDirSync( paths.dist );

    // copy assets folder
    console.log( '-> Copying assets' );
    fse.copy( `${paths.src}/assets`, `${paths.dist}/assets` );

    // read page templates
    return globP( '**/*.{ejs,html}', {cwd: `${paths.src}/pages`} )
        .then( files => {
            files.forEach( file => {
                const fileData = path.parse( file );
                const destPath = path.join( paths.dist, fileData.dir );

                // create destination directory
                fse.mkdirs( destPath )
                    // render page
                    .then( () => renderFileP( `${paths.src}/pages/${file}`, assign( {}, config ) ) )
                    .then( content => {
                        // save the html file
                        console.log( `compile`, chalk.green( `-> ${fileData.dir}/${fileData.name}` ) );
                        fse.writeFile( `${paths.dist}/${fileData.dir}/${fileData.name}.html`, content );
                    } )
                    .catch( err => console.error( chalk.red( err ) ) );
            } );
        } )
        .catch( err => console.error( chalk.red( err ) ) );
};

