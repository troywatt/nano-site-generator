#!/usr/bin/env node

var path = require( 'path' );
var fs = require( 'fs' );
var nanogen = require( './main' );
var program = require( 'commander' );

console.log( 'Nanogen [LOGO]' );

let config = null;

program
// todo -> read version from package.json
    .version( '0.0.4' )
    .option( '-c, --config <config>', 'Path to JSON file to configure Nanogen build' )
    .parse( process.argv );

if ( program.config ) {
    // console.log( 'user options provided', program.config );
    const configPath = path.join( process.cwd(), program.config );
    // todo -> use "exists" module on path before requireing
    config = require( configPath );
}

nanogen( config )
    .then( () => console.log( 'Done!' ) )
    .catch( err => {
        console.log( err );
        process.exit( 0 );
    } );
