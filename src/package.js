var vinyl = require( 'vinyl-fs' );
var map = require( 'map-stream' );
var semver = require( 'semver' );
var when = require( 'when' );
var lift = require( 'when/node' ).lift;
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
var git = require( './git.js' );
var debug = require( 'debug' )( 'package' );
var sysInfo = require( './sysInfo.js' )();

function addPackage( root, packages, packageName ) {
	var info = parsePackage( root, packageName );
	packages.push( info );
	return info;
}

function createPackage( packageInfo ) {
	return pack( packageInfo.pattern, packageInfo.path, packageInfo.output )
		.then( function( list ) {
			packageInfo.files = list;
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

function getPackageInfo( projectName, config, repoInfo ) {
	var owner;
	var branch;
	var commit;
	var repoPath;
	var projectPath;
	var repoPromise;

	if( _.isString( repoInfo ) ) {
		repoPromise = git.repo( repoInfo )
			.then( function( info ) {
				owner = info.owner;
				branch = info.branch;
				commit = info.commit;
				projectPath = path.join( info.path, config.path );
				repoPath = repoInfo;
				return projectPath;
			} );
	} else {
		owner = repoInfo.owner;
		branch = repoInfo.branch;
		commit = repoInfo.commit;
		projectPath = path.join( repoInfo.path, config.path );
		repoPath = repoInfo.path;
		repoPromise = when( projectPath );
	}
	var versionPromise = config.versionFile ? when.try( git.getVersionsFor, config.versionFile, repoPromise ) : when.try( git.getVersions, repoPromise );
	return when.try( function( versions ) {
		var last = versions[ versions.length - 1 ];
		last = last || { version: '0.0.0', build: 0 };
		var packageName = [ projectName, owner, branch, last.version, last.build, sysInfo.platform, sysInfo.osName, sysInfo.osVersion, sysInfo.arch ].join( '~' );
		var packagePath = path.join( './packages', packageName + '.tar.gz' );
		return {
			path: projectPath,
			name: packageName,
			output: packagePath,
			build: last.build,
			branch: branch,
			commit: commit,
			owner: owner,
			version: last.version,
			pattern: config.pack.pattern,
		};
	}, versionPromise );
}

function getPackageVersion( file ) {
	var parts = file.split( '~' );
	return parts[ 4 ] ? [ parts[ 3 ], parts[ 4 ] ].join( '-' ) : parts[ 3 ];
}

function pack( pattern, workingPath, target ) {
	return when.promise( function( resolve, reject ) {
		mkdirp.sync( path.dirname( target ) );
		var files = [];
		var patterns = _.isArray( pattern ) ? pattern : pattern.split( ',' );
		var output = fs.createWriteStream( target );
		var archive = archiver( 'tar', { gzip: true, gzipOptions: { level: 9 } } );

		output.on( 'close', function() {
			resolve( files );
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

function parsePackage( root, packageName, directory ) {
	var parts = packageName.split( '~' );
	var relative = [ parts[ 0 ], parts[ 1 ], parts[ 2 ] ].join( '-' );
	return {
		directory: path.join( root, relative ),
		path: directory,
		fullPath: path.join( directory || root, packageName ),
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
	var dir = path.dirname( packageFile.path );
	var info = parsePackage( root, file, dir );
	cb( null, info );
}

function scanPackages( root ) {
	var list = [];
	var add = processPackage.bind( null, root );
	return when.promise( function( resolve, reject ) {
		vinyl.src( '**/*.tar.gz', { cwd: root, read: false, dot: true } )
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
	var rename = lift( fs.rename );
	return rename( tmp, destination );
}

module.exports = {
	add: addPackage,
	copy: uploadPackage,
	create: createPackage,
	find: findPackage,
	getInfo: getPackageInfo,
	getInstalled: getInstalledVersion,
	getList: scanPackages,
	getPackageVersion: getPackageVersion,
	pack: pack,
	parse: parsePackage,
	terms: termList,
	unpack: unpack
};