var when = require( 'when' );
var vinyl = require( 'vinyl-fs' );
var map = require( 'map-stream' );
var path = require( 'path' );
var fs = require( 'fs' );

var parsers = {
	'.src': parseErlangVersion,
	'.json': parseNodeVersion,
	'.cs': parseDotNetVersion
};

var searchPaths = [ 
	'./package.json', 
	'./src/package.json',
	'**/package.json',
	'./*.app.src',
	'./src/*.app.src',
	'**/*.app.src',
	'./AssemblyInfo.cs',
	'./src/AssemblyInfo.cs',
	'**/AssemblyInfo.cs'
];

function getVersionFile( projectPath ) {
	var resolvedPath = path.resolve( projectPath );
	return when.promise( function( resolve, reject ) {
		var hadFiles = false;
		vinyl.src( 
				searchPaths,
				{ cwd: resolvedPath }
			).pipe( map( function( f, cb ) {
				hadFiles = true;
				try {
					resolve( f.path );
				} catch( err ) {
					reject( new Error( 'Failed to parse a version from the file ' + f.path + ' with error: ' + err ) );
				}
				cb( null, f );
			} ) )
			.on( 'end', function() {
				if( !hadFiles ) {
					reject( new Error( 'None of the supported version specifiers could be found in ' + resolvedPath ) );
				}
			} )
			.on( 'error', function( e ) {
				reject( new Error( 'Failed to load a version file due to error: ' + e.stack ) );
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

module.exports = {
	getFile: getVersionFile,
	getVersion: getVersion
};