const {promisify} = require( 'util' );
const fse = require( 'fs-extra' );
const path = require( 'path' );
const chalk = require( 'chalk' );
const globP = promisify( require( 'glob' ) );
const ejs = require( 'ejs-blocks' );
const renderFileP = promisify( ejs );
const merge = require( 'deepmerge' );
const pathExists = require( 'path-exists' );
const uncssP = promisify( require( 'uncss' ) );
const purifycssP = promisify( require( 'purify-css' ) );

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
    const {paths: {distDir, viewsDir, assetsDir, assetsDistDir, excludeDirs, excludeInFileName}} = options;

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
    glob += excludeInFileName.length ? `/!(${excludeInFileName.join( '|' )})` : '/';
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

        /* .then( () => {
             console.log( chalk.blue( 'Running purifycss...' ) );

             const content = ['build/!*.html', 'build/js/!*.js'];
             const css = ['build/css/global.min.css'];
             const options = {
                 output: 'build/css/global.pure.css',
                 minify: true
                 // rejected: true
             };

             return purifycssP( content, css, options ).then( output => {
                 // console.log( 'result:', result );
                 console.log( `Write:`, chalk.green( `-> build/css/global.uncss.css\n\r` ) );
                 fse.writeFile( 'build/css/global.pure.css', output );
                 return this;
             } )

         } )*/

        /*  .then( () => {
              console.log( chalk.blue( 'Running UnCSS...' ) );
              return uncssP( [
                  // `${distDir}/-home.html`
                  // `${distDir}/home-intl.html`,
                  // `${distDir}/!*.html`
                  `${distDir}/account-order-history-invoice-print.html`,
                  `${distDir}/checkout-cart.html`,
                  `${distDir}/registration-login.html`,
                  `${distDir}/checkout-payment.html`,
                  `${distDir}/checkout-confirmation.html`,
                  `${distDir}/products-product-configurator.html`,
                  `${distDir}/categories-home.html`,
                  `${distDir}/categories-category.html`
              ], {
                  htmlroot: 'build',
                  // htmlroot: 'build',
                  // csspath: '/Users/troywatt/Sites/upi/UPI/Ultradent/UPI.Webstore.Frontend/UPI.Webstore.Frontend/build/css/',
                  stylesheets: [
                      '/css/global.min.css'
                      // '/css/products.css'
                      // 'productConfigurator.css',
                      // 'lgp-portal.css',
                      // 'my-account.css',
                      // 'checkout.css'
                  ],
                  ignoreSheets: [/fonts.googleapis/]

              } )
                  .then( output => {
                      console.log( `Write:`, chalk.green( `-> build/css/global.uncss.css\n\r` ) );
                      fse.writeFile( 'build/css/global.min.css', output );
                  } )
                  .catch( err => {
                      console.error( chalk.red( err ) );
                      console.error( chalk.bold.red( '\n\r*** Process terminate ***\n\r' ) );
                      process.exit( 1 );
                  } )
          } )*/

        .catch( err => console.error( chalk.red( err ) ) );
};

