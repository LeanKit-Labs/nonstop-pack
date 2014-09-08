var when = require( 'when' );
var exec = require( './command.js' );

function getBranch( path ) {
	return exec( 'git rev-parse --abbrev-ref HEAD', path );
}

function getCommit( path ) {
	return exec( 'git rev-parse HEAD', path );
}

function getOwner( path ) {
	var regex = /(https:\/\/|git@|git:\/\/)[^:\/]*[:\/]([^\/]*).*/;
	return exec( 'git remote show origin | grep \'Fetch URL: .*\'', path )
		.then( function( line ) {
			return regex.exec( line )[ 2 ];
		} );
}

function getRepository( path ) {
	var regex = /(https:\/\/|git@|git:\/\/)[^:\/]*[:\/][^\/]*\/(.*)/;
	return exec( 'git remote show origin | grep \'Fetch URL: .*\'', path )
		.then( function( line ) {
			return regex.exec( line )[ 2 ];
		} );
}

function createInfo( path, branch, commit, owner, repo ) {
	return {
		branch: branch,
		commit: commit,
		owner: owner,
		path: path,
		repository: repo
	};
}

function readRepository( path ) {
	return when.try( createInfo, path, getBranch( path ), getCommit( path ), getOwner( path ), getRepository( path ) );
}

module.exports = {
	repo: readRepository
};