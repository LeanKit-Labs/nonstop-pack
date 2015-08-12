require( 'should' );
var path = require( 'path' );
var git = require( '../src/git.js' );

describe( 'when getting basic information', function() {
	var repoInfo;

	before( function( done ) {
		git.repo( './' )
			.then( function( info ) {
				repoInfo = info;
				done();
			} );
	} );

	it( 'should retrieve necessary repository data from environment', function() {
		repoInfo.owner.should.equal( 'arobson' );
		repoInfo.repository.should.equal( 'nonstop-pack' );
		repoInfo.branch.should.equal ( 'master' );
		repoInfo.path.should.equal( path.resolve( './' ) );
		repoInfo.commit.length.should.equal( 40 );
	} );
} );

describe( 'when getting branch from drone', function() {
	var repoInfo;

	before( function() {
		process.env.DRONE = true;
		process.env.DRONE_BRANCH = 'testing';
		return git.repo( './' )
			.then( function( info ) {
				repoInfo = info;
			} );
	} );

	it( 'should retrieve expected repository data from environment', function() {
		repoInfo.owner.should.equal( 'arobson' );
		repoInfo.repository.should.equal( 'nonstop-pack' );
		repoInfo.branch.should.equal ( 'testing' );
		repoInfo.path.should.equal( path.resolve( './' ) );
		repoInfo.commit.length.should.equal( 40 );
	} );

	after( function() {
		delete process.env.DRONE;
		delete process.env.DRONE_BRANCH;
	} );
} );

describe( 'when looking up version history', function() {
	var versionHistory;

	before( function( done ) {
		git.getVersionsFor( './package.json', './' )
			.then( function( list ) {
				versionHistory = list;
				done();
			} );
	} );

	it( 'should have at least one version entry', function() {
		versionHistory[ 0 ].should.eql( {
			sha: '75b73a17ef82f451511a377ecf2149d81ce2fc17',
 			version: '0.1.0',
 			build: 1
 		} );
	} );
} );
