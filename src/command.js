#!/usr/bin/env node
var chalk = require( 'chalk' );
var path = require( 'path' );
var fs = require( 'fs' );
var nanogen = require( './main' );
var program = require( 'commander' );
var pathExists = require( 'path-exists' );

console.log( chalk.magenta( `
 ___  ___  ___  ___  ___  ___  ___
|   )|   )|   )|   )|   )|___)|   )
|  / |__/||  / |__/ |__/ |__  |  /
                    __/
` ) );

let package = JSON.parse( fs.readFileSync( path.join( __dirname, '../package.json' ), 'utf8' ) );
let config = {};

program
    .version( package.version )
    .option( '-c, --config <config>', 'Path to JSON file to configure Nanogen build' )
    .parse( process.argv );

if ( program.config ) {
    // console.log( 'user options provided', program.config );
    const configPath = path.join( process.cwd(), program.config );

    if ( pathExists.sync( configPath ) ) {
        config = require( configPath );
    }
    else {
        console.log(
            chalk.bold.yellow( `WARN: Could not find specified config file "${ program.config }"\n\rUsing default configuration instead` )
        );
    }
}

nanogen( config )
    .then( files => {
        console.log( chalk.green( 'Done!' ) );
    } )
    .catch( err => {
        console.log( chalk.red( err ) );
        process.exit( 1 );
    } );
