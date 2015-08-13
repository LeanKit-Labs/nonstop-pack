var semver = require( 'semver' );
var when = require( 'when' );
var lift = require( 'when/node' ).lift;
var pipeline = require( 'when/pipeline' );
var path = require( 'path' );
var fs = require( 'fs' );
var mkdirp = require( 'mkdirp' );
var _ = require( 'lodash' );
var archiver = require( 'archiver' );
var zlib = require( 'zlib' );
var tar = require( 'tar-fs' );
var rimraf = require( 'rimraf' );
var git = require( './git.js' );
var debug = require( 'debug' )( 'nonstop:package' );
var sysInfo = require( './sysInfo.js' )();
var glob = require( 'globulesce' );
var fs = require( 'fs' );
var mv = require( 'mv' );
var readdir = lift( fs.readdir );
var stat = lift( fs.stat );

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
	return readdir( installed )
		.then( function( files ) {
			var promises = _.map( files, function( file ) {
				var relative = path.resolve( installed, file );
				return { path: relative, stat: fs.statSync( relative ) };
			} );
			var directories = when.filter( promises, function( file ) {
				return file.stat.isDirectory();
			} );
			return when.reduce( directories, function( x, y ) {
				return x.concat( y.path );
			}, [] );
		} )
		.then( function( directories ) {
			var versions = _.map( directories, function( dir ) {
				var version = path.basename( dir );
				if( !_.contains( ignored, version ) ) {
					return version;
				}
			} );
			var filtered = _.filter( versions, function( version ) {
				return filter.test( version );
			} );
			filtered.sort( function( a, b ) {
				return semver.rcompare( a, b );
			} );
			if( filtered.length ) {
				return filtered[ 0 ];
			} else {
				return undefined;
			}
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
				projectPath = path.resolve( info.path, config.path );
				repoPath = repoInfo;
				return projectPath;
			} );
	} else {
		owner = repoInfo.owner;
		branch = repoInfo.branch;
		commit = repoInfo.commit;
		projectPath = path.resolve( repoInfo.path, config.path );
		repoPath = repoInfo.path;
		repoPromise = when( projectPath );
	}
	var versionPromise = config.versionFile ? when.try( git.getVersionsFor, config.versionFile, repoPromise ) : when.try( git.getVersions, repoPromise );
	return when.try( function( versions ) {
		var last;
		if( versions && versions.length ) {
			last = versions[ versions.length - 1 ];
		} else {
			debug( 'No versions found for project "' + projectName + '" at ' + projectPath + '. Using \'0.0.0\'.' );
			last = last || { version: '0.0.0', build: 0 };
		}
		var packageName = [ projectName, owner, branch, last.version, last.build, sysInfo.platform, sysInfo.osName, sysInfo.osVersion, sysInfo.arch ].join( '~' );
		var packagePath = path.resolve( './packages', packageName + '.tar.gz' );
		var info = {
			path: projectPath,
			name: packageName,
			output: packagePath,
			build: last.build,
			branch: branch,
			commit: commit,
			owner: owner,
			version: last.version,
			pattern: config.pack ? config.pack.pattern : undefined,
		};
		return info;
	}, versionPromise );
}

function getPackageVersion( file ) {
	var parts = file.split( '~' );
	return parts[ 4 ] ? [ parts[ 3 ], parts[ 4 ] ].join( '-' ) : parts[ 3 ];
}

function pack( pattern, workingPath, target ) {
	pattern = pattern || '';
	return when.promise( function( resolve, reject ) {
		mkdirp.sync( path.dirname( target ) );
		var archivedFiles = [];
		var patterns = _.isArray( pattern ) ? pattern : pattern.split( ',' );
		return glob( workingPath, patterns, [ '.git' ] )
			.then( function( files ) {
				if( _.isEmpty( files ) ) {
					reject( new Error( 'No files matched the pattern "' + pattern + '" in path "' + workingPath + '". No package was generated.' ) );
				} else {
					var output = fs.createWriteStream( target );
					var archive = archiver( 'tar', { gzip: true, gzipOptions: { level: 9 } } );

					output.on( 'close', function() {
						resolve( archivedFiles );
					} );
					archive.on( 'error', function( err ) {
						reject( err );
					} );
					archive.pipe( output );

					_.map( files, function( file ) {
						archivedFiles.push( file );
						archive.file( file, { name: path.relative( workingPath, file ) } );
					} );
					archive.finalize();
				}
			} )
			.then( null, function( err ) {
				reject( err );
			} );
	} );
}

function parsePackage( root, packageName, directory ) {
	var parts = packageName.split( '~' );
	var relative = [ parts[ 0 ], parts[ 1 ], parts[ 2 ] ].join( '-' );
	return {
		directory: path.resolve( root, relative ),
		path: directory,
		fullPath: path.resolve( directory || root, packageName ),
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
	var file = path.basename( packageFile );
	var dir = path.dirname( packageFile );
	var info = parsePackage( root, file, dir );
	if( cb ) {
		cb( null, info );
	} else {
		return info;
	}
}

function scanPackages( root ) {
	return glob( root, '**/*.tar.gz' )
		.then( function( files ) {
			var stuff = _.map( files, function( file ) {
				return processPackage( root, file );
			} );
			return stuff;
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
		if( fs.existsSync( artifact ) ) {
			mkdirp.sync( target );
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
		} else {
			reject( new Error( 'The artifact file "' + artifact + '" could not be found.' ) );
		}
	} );
}

function uploadPackage( root, tmp, packageName, packages ) {
	var info = addPackage( root, packages, packageName );
	var destination = path.resolve( info.directory, packageName );
	mkdirp.sync( info.directory );
	var move = lift( mv );
	return move( tmp, destination, { clobber: true } );
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
