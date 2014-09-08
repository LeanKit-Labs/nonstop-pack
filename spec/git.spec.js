require( 'should' );
var path = require( 'path' );
var git = require( '../src/git.js' );

describe( '', function() {
	var repoInfo;

	before( function( done ) {
		git.repo( './' )
			.then( function( info ) {
				repoInfo = info;
				done();
			} )
			.then( null, function( err ) {
				console.log( 'boo', err );
				done();
			} );
	} );

	it( 'should retrieve necessary repository data from environment', function() {
		repoInfo.owner.should.equal( '' );
		repoInfo.repository.should.equal( 'continua-pack' );
		repoInfo.branch.should.equal ( 'master' );
		repoInfo.path.should.equal( path.resolve( './' ) );
		repoInfo.commit.should.equal( '' );
	} );
} );