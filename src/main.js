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

const {paths} = config;

module.exports = ( userConfig = {} ) => {
    const options = merge( config, userConfig );

    console.log( chalk.blue( 'Building static site...' ) );

    // clear destination folder
    console.log( '-> Cleaning destination folder' );
    fse.emptyDirSync( paths.dist );

    // copy assets folder
    console.log( '-> Copying assets' );
    // todo -> make assets/ configurable
    fse.copy( `${paths.src}/${paths.assets}`, `${paths.dist}/${paths.assets}` );

    // read page templates
    return globP( '**/*.{ejs,html}', {cwd: `${paths.src}/${paths.views}`} )
        .then( files => {
            const compileP = [];

            files.forEach( file => {
                const fileData = path.parse( file );
                const destPath = path.join( paths.dist, fileData.dir );

                // create destination directory
                compileP.push( fse.mkdirs( destPath )
                    // render page
                    .then( () => renderFileP( `${paths.src}/${paths.views}/${file}`, options ) )
                    .then( content => {
                        // save the html file
                        const filePath = `${paths.dist}/${fileData.dir}/${fileData.name}.html`;

                        // todo -> write to temp dir until entire process succeeds to prevent destructive errors
                        console.log( `write file:`, chalk.green( `-> ${filePath}` ) );
                        fse.writeFile( filePath, content );
                    } )
                    .catch( err => {
                        console.log( `!Failed to write file`,
                            chalk.red( `-> ${paths.dist}/${fileData.dir}/${fileData.name}.html` ) );
                        console.error( chalk.red( err ) );
                        console.error( chalk.red( 'Process terminate' ) );
                        process.exit( 1 );
                    } )
                );
            } );

            return Promise.all( compileP );
        } )
        .catch( err => console.error( chalk.red( err ) ) );
};

