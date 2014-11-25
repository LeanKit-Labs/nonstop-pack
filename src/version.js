var _ = require( 'lodash' );
var when = require( 'when' );
var glob = require( 'globulesce' );
var path = require( 'path' );
var fs = require( 'fs' );

function parseErlangVersion( content ) {
	var regex = /[{]\W?vsn[,]\W?\"([0-9.]+)\"/;
	var matches = regex.exec( content );
	return matches[ 1 ] ? matches[ 1 ] : undefined;
}

function parseNodeVersion( content ) {
	var json = JSON.parse( content );
	return json.version.split( '-' )[ 0 ];
}

function parseDotNetVersion( content ) {
	var regex = /^\[assembly:\W?[aA]ssemblyVersion(Attribute)?\W?\(\W?\"([0-9.]*)\"\W*$/m;
	var matches = regex.exec( content );
	return matches[ 2 ] ? matches[ 2 ] : undefined;
}

var parsers = {
	'.src': parseErlangVersion,
	'.json': parseNodeVersion,
	'.cs': parseDotNetVersion
};

var searchPaths = [ 
	'{.,**}/package.json',
	'{.,**}/*.app.src',
	'{.,**}/AssemblyInfo.cs'
];

function getVersionFile( projectPath ) {
	var resolvedPath = path.resolve( projectPath );
	return when.promise( function( resolve, reject ) {
		glob( resolvedPath, searchPaths )
			.then( function( x ) {
				if( _.isEmpty( x ) ) {
					reject( new Error( 'None of the supported version specifiers could be found in ' + resolvedPath ) );
				} else {
					var file = x[ 0 ];
					try {						
						resolve( file );
					} catch ( err ) {
						reject( new Error( 'Failed to parse a version from the file ' + f + ' with error: ' + err ) );
					}
				}
			} );			
	} );
}

function getVersion( filePath, content ) {
	if( !content ) {
		content = fs.readFileSync( filePath );
	}
	var ext = path.extname( filePath );
	return parsers[ ext ]( content );
}

module.exports = {
	getFile: getVersionFile,
	getVersion: getVersion
};