var _ = require( 'lodash' );
var when = require( 'when' );
var pipe = require( 'when/pipeline' );
var exec = require( './command.js' );
var version = require( './version.js' );
var syspath = require( 'path' );

function getBranch( path ) {
	return exec( 'git rev-parse --abbrev-ref HEAD', path )
		.then( function( branch ) {
			return branch.trim();
		} );
}

function getCommit( path ) {
	return exec( 'git rev-parse HEAD', path )
		.then( function( commit ) {
			return commit.trim();
		} );
}

function getFileAtSha( sha, filePath, path ) {
	return exec( 'git show ' + sha + ':' + filePath + ' | cat', path );
}

function getOwner( path ) {
	var regex = /(https:\/\/|git@|git:\/\/)[^:\/]*[:\/]([^\/]*).*/;
	return exec( 'git remote show origin -n | grep \'Fetch URL: .*\'', path )
		.then( function( line ) {
			return regex.exec( line )[ 2 ];
		} );
}

function getRepository( path ) {
	var regex = /(https:\/\/|git@|git:\/\/)[^:\/]*[:\/][^\/]*\/(.*)/;
	return exec( 'git remote show origin -n | grep \'Fetch URL: .*\'', path )
		.then( function( line ) {
			return regex.exec( line )[ 2 ];
		} );
}

function getRevisionListFor( filePath, path ) {
	return exec( 'git log ' + filePath + ' | grep \'commit [^\\n]*\' | sed \'s_commit[ ]\\([^\\n]*\\)_\\1_\'', path )
		.then( function( lines ) {
			return _.where( lines.split( '\n' ), function( x ) { return x.length && /^[0-9a-zA-Z]*$/.test( x ); } );
		} );
}

function getVersionHistory( path ) {
	var deferred = when.defer();
	version.getFile( path )
		.then( function( file ) {
			getVersionHistoryFor( file, path )
				.then( function( list ) {
					deferred.resolve( list );
				} );
		} );
	return deferred.promise;
}

function getVersionHistoryFor( filePath, path ) {
	var versionHash = {};
	var deferred = when.defer();
	getRevisionListFor( filePath, path )
		.then( function( commits ) {
			when.all( _.map( commits.reverse(), function( sha ) {
				return getFileAtSha( sha, filePath, path )
					.then( function( content ) {
						return { content: content, sha: sha };
					} );
			} ) )
			.then( function( contents ) {
				return _.map( contents, function( file ) {
					var ver = version.getVersion( filePath, file.content );
					return { sha: file.sha, version: ver };
				} );
			} )
			.then( function( versions ) {
				var results = _.map( versions, function( v ) {
					var index = versionHash[ v.version ];
					if( index ) {
						index ++;
					} else {
						index = 1;
					}
					versionHash[ v.version ] = index;
					return { sha: v.sha, version: v.version, build: index };
				} );
				deferred.resolve( results );
				return results;
			} );
		} );
	return deferred.promise;
}

function createInfo( path, branch, commit, owner, repo ) {
	return {
		branch: branch,
		commit: commit,
		owner: owner,
		path: syspath.resolve( path ),
		repository: repo
	};
}

function readRepository( path ) {
	return when.try( createInfo, path, getBranch( path ), getCommit( path ), getOwner( path ), getRepository( path ) );
}

module.exports = {
	commitsFor: getRevisionListFor,
	getVersion: getFileAtSha,
	getVersions: getVersionHistory,
	getVersionsFor: getVersionHistoryFor,
	repo: readRepository
};