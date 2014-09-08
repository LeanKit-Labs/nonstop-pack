var vinyl = require( 'vinyl-fs' );
var map = require( 'map-stream' );
var semver = require( 'semver' );
var when = require( 'when' );
var whenNode = require( 'when/node' );
var pipeline = require( 'when/pipeline' );
var path = require( 'path' );
var fs = require( 'fs' );
var mkdirp = require( 'mkdirp' );
var _ = require( 'lodash' );
var through = require( 'through2' );
var archiver = require( 'archiver' );
var zlib = require( 'zlib' );
var tar = require( 'tar-fs' );
var rimraf = require( 'rimraf' );
var debug = require( 'debug' )( 'package' );

function addPackage( root, packages, packageName ) {
	var info = parsePackage( root, packageName );
	packages.push( info );
	return info;
}

function createPackage( packageInfo ) {
	return pack( packageInfo.pattern, packageInfo.relative, packageInfo.path )
		.then( function() {
			return packageInfo;
		} );
}

function findPackage( packages, filter ) {
	if( filter.build === 'release' ) {
		filter.build = '';
	}
	var list = _.where( packages, filter );
	return list.sort( function( a, b ) {
		return semver.rcompare( a.version, b.version );
	} );
}

function getInstalledVersion( filter, installed, ignored, noError ) {
	var versions = [];
	return when.promise( function( resolve, reject ) {
		vinyl.src( '*', { cwd: installed } )
			.pipe( map( function( f, cb ) {
				if( !f._contents ) {
					var version = path.basename( f.path );
					if( !_.contains( ignored, version ) ) {
						versions.push( version );
					}
				}
				cb();
			} ) )
			.on( 'end', function() {
				versions = _.filter( versions, function( v ) {
					return filter.test( v );
				} );
				versions.sort( function( a, b ) {
					return semver.rcompare( a, b );
				} );
				if( versions.length ) {
					resolve( versions[ 0 ] );
				} else if( noError ) {
					resolve( undefined );
				} else {
					reject( undefined );
				}
			} );
	} );
}

function getPackageInfo( projectName, config, version, repoInfo ) {
	try {
	var owner = repoInfo.owner;
	var branch = repoInfo.branch;
	var commit = repoInfo.commit;
	var repoPath = repoInfo.path;
	console.log( server );
	return server
		.getBuildNumber( owner, projectName, branch, version, commit )
		.then( function( buildCount ) {
			var relativePath = path.join( repoPath, config.pack.path );
			var packageName = [ projectName, owner, branch, version, buildCount, sysInfo.platform, sysInfo.osName, sysInfo.osVersion, sysInfo.arch ].join( '~' );
			var packagePath = path.join( './packages', packageName + '.tar.gz' );
			return {
				relative: relativePath,
				name: packageName,
				path: packagePath,
				build: buildCount,
				branch: branch,
				commit: commit,
				owner: owner,
				version: version,
				pattern: config.pack.pattern,
			};
		 } );
	} catch( e ) { console.log( e.stack ); }
}

function getPackageVersion( file ) {
	var parts = file.split( '~' );
	return parts[ 4 ] ? [ parts[ 3 ], parts[ 4 ] ].join( '-' ) : parts[ 3 ];
}

function pack( pattern, workingPath, target ) {
	return when.promise( function( resolve, reject ) {
		var files = [];
		var patterns = _.isArray( pattern ) ? pattern : pattern.split( ',' );
		var output = fs.createWriteStream( target );
		var archive = archiver( 'tar', { gzip: true, gzipOptions: { level: 9 } } );

		output.on( 'close', function() {
			resolve();
		} );

		archive.on( 'error', function( err ) {
			reject( err );
		} );

		archive.pipe( output );

		var packWrap = through.obj( function( chunk, enc, callback ) {
			files.push( chunk.path );
			if( chunk._contents === null ) {
				callback();
			} else {
				archive.append( chunk._contents, { name: path.relative( workingPath, chunk.path ) } );
				callback();
			}
		}, function( cb ) {
			archive.finalize();
			cb( null );
		} );

		vinyl.src( patterns, { cwd: workingPath } )
			.on( 'finish', function() {
				if( files.length === 0 ) {
					reject( 'No files matched the pattern "' + pattern + '" in path "' + workingPath + '". No package was generated.' );
				}
			} )
			.pipe( packWrap );
	} );
}

function parsePackage( root, packageName ) {
	var parts = packageName.split( '~' );
	var relative = [ parts[ 0 ], parts[ 1 ], parts[ 2 ] ].join( '-' );
	return {
		directory: path.join( root, relative ),
		project: parts[ 0 ],
		owner: parts[ 1 ],
		branch: parts[ 2 ],
		version: [ parts[ 3 ], parts[ 4 ] ].join( '-' ),
		build: parts[ 4 ],
		platform: parts[ 5 ],
		osName: parts[ 6 ],
		osVersion: parts[ 7 ],
		architecture: parts[ 8 ].replace( '.tar.gz', '' ),
		relative: relative,
		file: packageName
	};
}

function processPackage( root, packageFile, cb ) {
	var file = path.basename( packageFile.path );
	var info = parsePackage( root, file );
	cb( null, info );
}

function scanPackages( root ) {
	var list = [];
	var add = processPackage.bind( null, root );
	return when.promise( function( resolve, reject ) {
		vinyl.src( '**/*.tar.gz', { cwd: root, read: false } )
			.pipe( map( add ) )
			.on( 'data', list.push.bind( list ) )
			.on( 'error', reject )
			.on( 'end', function() {
				resolve( list );
			} );
	} );
}

function termList( packages ) {
	return _.uniq( _.flatten( _.map( packages, function( record ) { 
			var list = _.pairs( _.omit( record, 'directory', 'relative', 'file' ) ).reverse();
			return _.map( list, function( pair ) { 
				var reversal = {};
				reversal[ pair[ 1 ] ] = pair[ 0 ]; 
				return reversal; 
			} ); 
		} ) ), 
		function( pair ) { return _.keys( pair )[ 0 ]; } 
	);
}

function unpack( artifact, target ) {
	var file = path.basename( artifact );
	var version = getPackageVersion( file );
	return when.promise( function( resolve, reject ) {
		fs.createReadStream( artifact )
			.pipe( zlib.createUnzip() )
			.pipe( tar.extract( target ) )
			.on( 'error', function ( err ) {
				rimraf( path.resolve( target ), function( err ) {
					if( err ) {
						console.log( 'Could not delete failed install at', target, err.stack );
					}
				} );
				reject( err );
			} )
			.on( 'finish', function() {
				resolve( version );
			} );
	} );
}

function uploadPackage( root, tmp, packageName, packages ) {
	var info = addPackage( root, packages, packageName );
	var destination = path.join( info.directory, packageName );
	mkdirp.sync( info.directory );
	return pipeline( [ 
		whenNode.lift( fs.rename ).bind( fs )( tmp, destination ),
		whenNode.lift( fs.unlink ).bind( fs )( tmp )
	] );
}

module.exports = {
	add: addPackage,
	copy: uploadPackage,
	create: createPackage,
	getInstalled: getInstalledVersion,
	getList: scanPackages,
	getPackageVersion: getPackageVersion,
	find: findPackage,
	pack: pack,
	unpack: unpack,
	parse: parsePackage,
	terms: termList
};