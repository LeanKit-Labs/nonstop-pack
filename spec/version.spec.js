require( 'should' );
var seq = require( 'when/sequence' );
var version = require( '../src/version.js' );

describe( 'should find correct version file', function() {
	var dotnetVersion, erlangVersion, nodeVersion;
	var getFile = function( relativePath ) { 
		return function() { 
			return version.getFile( relativePath ); 
		};
	};
	var getVersion = function( versionFile ) {
		return function() {
			return version.getVersion( versionFile );
		};
	};

	before( function( done ) {
		seq( [
				getFile( './spec/versioning/node/' ),
				getFile( './spec/versioning/erlang/' ),
				getFile( './spec/versioning/dotnet/' )
			] )
		.then( function( paths ) {
			seq( [
				getVersion( paths[ 0 ] ),
				getVersion( paths[ 1 ] ),
				getVersion( paths[ 2 ] )
			] )
			.then( function( versions ) {
				dotnetVersion = versions[ 2 ];
				erlangVersion = versions[ 1 ];
				nodeVersion = versions[ 0 ];
				done();
			} );
		} );
	} );

	it( 'should retrieve the correct dotnet version', function() {
		dotnetVersion.should.equal( '4.3.2' );
	} );

	it( 'should retrieve the correct erlang version', function() {
		erlangVersion.should.equal( '1.0.1' );
	} );

	it( 'should retrieve the correct node version', function() {
		nodeVersion.should.equal( '0.1.2' );
	} );
} );