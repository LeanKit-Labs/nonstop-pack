require( 'should' );
var _ = require( 'lodash' );
var package = require( '../src/package.js' );
var mkdirp = require( 'mkdirp' );
var rimraf = require( 'rimraf' );
var fs = require( 'fs' );
mkdirp( './packages' );

describe( 'when getting list of packages', function() {

	var list;
	before( function( done ) {
		package.getList( './spec/files' )
			.then( function( l ) {
				list = l;
				done();
			} )
			.then( null, function() {
				done();
			} );
	} );

	it( 'should have a complete list of files', function() {
		list.length.should.equal( 24 );
	} );

	describe( 'when finding packages based on operating system', function() {
		var osx = { osName: 'OSX', osVersion: '10.9.2' };
		var ubuntu = { osName: 'ubuntu' };
		var osxMatches, ubuntuMatches;

		before( function() {
			osxMatches = package.find( list, osx );
			ubuntuMatches = package.find( list, ubuntu );
		} );

		it( 'should return correct number of results', function() {
			osxMatches.length.should.equal( 18 );
			ubuntuMatches.length.should.equal( 6 );
		} );

		it( 'should return newest package first', function() {
			osxMatches[ 0 ].version.should.equal( '0.2.0-5' );
			ubuntuMatches[ 0 ].version.should.equal( '0.2.0-4' );
		} );
	} );

	describe( 'when getting term list from packages', function() {
		var terms;

		before( function() {
			terms = package.terms( list );
			_.remove( terms, function( item ) {
				return _.any( item, function( val ) {
					return val === 'path' || val === 'fullPath';
				} );
			} );
		} );

		it( 'should return correct list of terms', function() {
			terms.should.eql( [
				{ x64: 'architecture' },
				{ '10.9.2': 'osVersion' },
				{ OSX: 'osName' },
				{ darwin: 'platform' },
				{ '2': 'build' },
				{ '0.1.0-2': 'version' },
				{ branch2: 'branch' },
				{ owner1: 'owner' },
				{ proj1: 'project' },
				{ '1': 'build' },
				{ '0.2.0-1': 'version' },
				{ branch1: 'branch' },
				{ owner2: 'owner' },
				{ '14.04LTS': 'osVersion' },
				{ ubuntu: 'osName' },
				{ linux: 'platform' },
				{ '0.2.0-2': 'version' },
				{ '3': 'build' },
				{ '0.2.0-3': 'version' },
				{ '4': 'build' },
				{ '0.2.0-4': 'version' },
				{ '5': 'build' },
				{ '0.2.0-5': 'version' },
				{ '0.0.1-1': 'version' },
				{ '0.0.1-2': 'version' },
				{ '0.0.1-3': 'version' },
				{ '0.0.1-4': 'version' },
				{ '0.0.1-5': 'version' },
				{ '0.0.2-1': 'version' },
				{ '0.0.2-2': 'version' },
				{ '0.0.2-3': 'version' },
				{ '0.1.0-1': 'version' }
			] );
		} );
	} );

	describe( 'when getting term list from filtered packages', function() {
		var terms;
		var matches;

		before( function() {
			matches = package.find( list, { branch: 'branch2' } );
			terms = package.terms( matches );
			_.remove( terms, function( item ) {
				return _.any( item, function( val ) {
					return val === 'path' || val === 'fullPath';
				} );
			} );
		} );

		it( 'should return correct list of terms', function() {
			terms.should.eql( [
				{ x64: 'architecture' },
				{ '10.9.2': 'osVersion' },
				{ OSX: 'osName' },
				{ darwin: 'platform' },
				{ '2': 'build' },
				{ '0.1.0-2': 'version' },
				{ branch2: 'branch' },
				{ owner1: 'owner' },
				{ proj1: 'project' },
				{ '1': 'build' },
				{ '0.1.0-1': 'version' },
				{ '3': 'build' },
				{ '0.0.2-3': 'version' },
				{ '0.0.2-2': 'version' },
				{ '0.0.2-1': 'version' }
			] );
		} );
	} );

	describe( 'when finding packages based on project-owner-branch', function() {

		var project1 = { project: 'proj1', owner: 'owner1', branch: 'branch1' };
		var	matches;

		before( function() {
			matches = package.find( list, project1 );
		} );

		it( 'should return correct number of results', function() {
			matches.length.should.equal( 10 );
		} );

		it( 'should return newest package first', function() {
			matches[ 0 ].version.should.equal( '0.1.0-2' );
		} );
	} );

	describe( 'when adding a new file', function() {

		var newPackage = 'proj1~owner2~branch1~0.2.1~1~darwin~OSX~10.9.2~x64.tar.gz';
		var project1 = { project: 'proj1', owner: 'owner2', branch: 'branch1', osName: 'OSX' };
		var matches;

		before( function() {
			package.add( './spec/files', list, newPackage );
			matches = package.find( list, project1 );
		} );

		it( 'should include new package in results', function() {
			matches.length.should.equal( 6 );
			matches[ 0 ].version.should.equal( '0.2.1-1' );
		} );
	} );

	describe( 'when getting information for new package', function() {
		var info;
		before( function( done ) {
			package.getInfo( 'test', { 
				path: './', 
				pack: { 
					pattern: './src/**/*,./node_modules/**/*'
				} }, './' )
			.then( function( result ) {
				info = result;
				done();
			} );
		} );

		it( 'should retrieve correct information', function() {
			// omit file list and values that change due to commits in the repo
			_.omit( info, 'files', 'build', 'commit', 'output', 'version', 'name' ).should.eql( 
				{
					branch: 'master',
					owner: 'arobson',
					pattern: './src/**/*,./node_modules/**/*',
					path: '/git/labs/nonstop/nonstop-pack/'
				} );
		} );

		describe( 'when creating package from info', function() {			
			before( function( done ) {
				this.timeout( 10000 );
				package.create( info )
					.then( function() {
						done();
					} )
					.then( null, function( err ) {
						console.log( err.stack );
						done();
					} );
			} );

			it( 'should have created package', function() {
				fs.existsSync( info.output ).should.be.true; // jshint ignore:line
			} );

			after( function( done ) {
				rimraf( './packages', function() {
					done();
				} );
			} );
		} );
	} );

	describe( 'when getting information for new package using versionFile', function() {
		var info, version;
		before( function( done ) {
			var text = fs.readFileSync( './package.json' );
			var json = JSON.parse( text );
			version = json.version.split( '-' )[ 0 ];

			package.getInfo( 'test', { 
				path: './', 
				versionFile: './package.json',
				pack: { 
					pattern: './src/**/*,./node_modules/**/*'
				} }, './' )
			.then( function( result ) {
				info = result;
				done();
			} );
		} );

		it( 'should retrieve correct information', function() {
			// omit file list and values that change due to commits in the repo
			_.omit( info, 'files', 'build', 'commit', 'output', 'name' ).should.eql( 
				{
					branch: 'master',
					owner: 'arobson',
					version: version,
					pattern: './src/**/*,./node_modules/**/*',
					path: '/git/labs/nonstop/nonstop-pack/'
				} );
		} );
	} );
} );