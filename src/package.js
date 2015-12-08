var semver = require( "semver" );
var when = require( "when" );
var lift = require( "when/node" ).lift;
var path = require( "path" );
var _ = require( "lodash" );
var archiver = require( "archiver" );
var zlib = require( "zlib" );
var tar = require( "tar-fs" );
var git = require( "./git.js" );
var debug = require( "debug" )( "nonstop:package" );
var sysInfo = require( "./sysInfo.js" )();
var glob = require( "globulesce" );
var fs = require( "fs-extra" );
var readdir = lift( fs.readdir );

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
	if( filter.build === "release" ) {
		filter.build = "";
	}
	var list = _.where( packages, filter );
	return list.sort( function( a, b ) {
		return semver.rcompare( a.version, b.version );
	} );
}

function getInstalledVersions( filter, installed, ignored, noError ) {
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
				return filtered;
			} else {
				return undefined;
			}
		} );
}

function getInstalledVersion( filter, installed, ignored, noError ) {
	return getInstalledVersions( filter, installed, ignored, noError )
		.then( function( versions ) {
			return versions ? versions[ 0 ] : undefined;
		} );
}

function getPackageInfo( projectName, config, repoInfo ) {
	var owner;
	var branch;
	var commit;
	var slug;
	var repoPath;
	var projectPath;
	var repoPromise;

	if( _.isString( repoInfo ) ) {
		repoPromise = git.repo( repoInfo )
			.then( function( info ) {
				owner = info.owner;
				branch = info.branch;
				commit = info.commit;
				slug = info.slug;
				projectPath = path.resolve( info.path, config.path );
				repoPath = repoInfo;
				return projectPath;
			} );
	} else {
		owner = repoInfo.owner;
		branch = repoInfo.branch;
		commit = repoInfo.commit;
		slug = repoInfo.slug;
		projectPath = path.resolve( repoInfo.path, config.path );
		repoPath = repoInfo.path;
		repoPromise = when( projectPath );
	}
	var versionPromise = config.versionFile ? when.try( git.getCurrentVersion, repoPromise, config.versionFile ) : when.try( git.getCurrentVersion, repoPromise );
	var buildPromise = config.versionFile ? when.try( git.getCommitsSinceCurrentVersion, repoPromise, config.versionFile ) : when.try( git.getBuildNumber, repoPromise );
	return when.try( function( version, build ) {
		if( !version || !build ) {
			debug( "No versions found for project \"" + projectName + "\" at \"" + projectPath + "\". Using \"0.0.0\"." );
			version = "0.0.0";
			build = 0;
		}
		var packageName = _.filter( [ projectName, owner, branch, slug, version, build, sysInfo.platform, sysInfo.osName, sysInfo.osVersion, sysInfo.arch ] ).join( "~" );
		var packagePath = path.resolve( "./packages", packageName + ".tar.gz" );
		var info = {
			path: projectPath,
			name: packageName,
			output: packagePath,
			build: build,
			branch: branch,
			commit: commit,
			slug: slug,
			owner: owner,
			version: version,
			pattern: config.pack ? config.pack.pattern : undefined,
		};
		return info;
	}, versionPromise, buildPromise );
}

function getPackageVersion( file ) {
	var parts = file.split( "~" );
	if( /[a-fA-F0-9]{8}/.test( parts[ 3 ] ) ) {
		return parts[ 5 ] ? [ parts[ 4 ], parts[ 5 ] ].join( "-" ) : parts[ 4 ];
	} else {
		return parts[ 4 ] ? [ parts[ 3 ], parts[ 4 ] ].join( "-" ) : parts[ 3 ];
	}
}

function pack( pattern, workingPath, target ) {
	pattern = pattern || "";
	return when.promise( function( resolve, reject ) {
		fs.mkdirpSync( path.dirname( target ) );
		var archivedFiles = [];
		var patterns = _.isArray( pattern ) ? pattern : pattern.split( "," );
		return glob( workingPath, patterns, [ ".git" ] )
			.then( function( files ) {
				if( _.isEmpty( files ) ) {
					reject( new Error( "No files matched the pattern \"" + pattern + "\" in path \"" + workingPath + "\". No package was generated." ) );
				} else {
					var output = fs.createWriteStream( target );
					var archive = archiver( "tar", { gzip: true, gzipOptions: { level: 9 } } );

					output.on( "close", function() {
						resolve( archivedFiles );
					} );
					archive.on( "error", function( err ) {
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
	var parts = packageName.split( "~" );
	var relative = [ parts[ 0 ], parts[ 1 ], parts[ 2 ] ].join( "-" );
	var base = path.resolve( root, relative );
	var slug;
	var offset = 0;
	if( /[a-fA-F0-9]{8}/.test( parts[ 3 ] ) ) {
		slug = parts[ 3 ];
		offset = 1;
	}
	return {
		directory: directory || base,
		path: directory,
		fullPath: path.resolve( directory || base, packageName ),
		project: parts[ 0 ],
		owner: parts[ 1 ],
		branch: parts[ 2 ],
		slug: slug,
		simpleVersion: parts[ 3 + offset ],
		version: _.filter( [ parts[ 3 + offset ], parts[ 4 + offset ] ] ).join( "-" ),
		build: parts[ 4 + offset ],
		platform: parts[ 5 + offset ],
		osName: parts[ 6 + offset ],
		osVersion: parts[ 7 + offset ],
		architecture: parts[ 8 + offset ].replace( ".tar.gz", "" ),
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
	return glob( root, "**/*.tar.gz" )
		.then( function( files ) {
			var stuff = _.map( files, function( file ) {
				return processPackage( root, file );
			} );
			return stuff;
		} );
}

function termList( packages ) {
	return _.uniq( _.flatten( _.map( packages, function( record ) {
			var list = _.pairs( _.omit( record, "directory", "relative", "file" ) ).reverse();
			return _.filter( _.map( list, function( pair ) {
				var reversal = {};
				if( pair[ 1 ] !== undefined ) {
					reversal[ pair[ 1 ] ] = pair[ 0 ];
					return reversal;
				}
			} ) );
		} ) ),
		function( pair ) { return _.keys( pair )[ 0 ]; }
	);
}

function unpack( artifact, target ) {
	var file = path.basename( artifact );
	var version = getPackageVersion( file );
	var info = parsePackage( "", file );
	return when.promise( function( resolve, reject ) {
		if( fs.existsSync( artifact ) ) {
			fs.mkdirpSync( target );
			fs.createReadStream( artifact )
				.pipe( zlib.createUnzip() )
				.pipe( tar.extract( target ) )
				.on( "error", function ( err ) {
					fs.remove( path.resolve( target ), function( err ) {
						if( err ) {
							console.log( "Could not delete failed install at", target, err.stack );
						}
					} );
					reject( err );
				} )
				.on( "finish", function() {
					fs.writeFile( path.join( target, "./.nonstop-info.json" ), JSON.stringify( info ) );
					resolve( version );
				} );
		} else {
			reject( new Error( "The artifact file \"" + artifact + "\" could not be found." ) );
		}
	} );
}

function promotePackage( root, info, packages ) {
	var packageInfo = _.clone( info );
	packageInfo.file = packageInfo.file.replace( /([0-9][.][0-9][.][0-9])[~][0-9]{1,3}/, "$1~" );
	packageInfo.fullPath = packageInfo.fullPath.replace( /([0-9][.][0-9][.][0-9])[~][0-9]{1,3}/, "$1~" );
	packageInfo.version = info.version.split( "-" )[ 0 ];
	packageInfo.build = "";
	addPackage( root, packages, packageInfo.file );
	var copy = lift( fs.copy );
	return copy( info.fullPath, packageInfo.fullPath )
		.then( function() {
			return packageInfo;
		} );
}

function uploadPackage( root, tmp, packageName, packages ) {
	var info = parsePackage( root, packageName );
	var destination = path.resolve( info.directory, packageName );
	fs.mkdirpSync( info.directory );
	var move = lift( fs.move );
	return move( tmp, destination, { clobber: true } )
		.then( function( data ) {
			addPackage( root, packages, packageName );
			return data;
		} );
}

module.exports = {
	add: addPackage,
	copy: uploadPackage,
	create: createPackage,
	find: findPackage,
	getInfo: getPackageInfo,
	getInstalled: getInstalledVersion,
	getInstalledVersions: getInstalledVersions,
	getList: scanPackages,
	getPackageVersion: getPackageVersion,
	pack: pack,
	parse: parsePackage,
	promote: promotePackage,
	terms: termList,
	unpack: unpack
};
