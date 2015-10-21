require( './setup' );
var _ = require( 'lodash' );
var package = require( '../src/package.js' );
var fs = require( 'fs-extra' );
var path = require( 'path' );
fs.mkdirpSync( './packages' );

describe( 'Package', function() {
	describe( 'when getting package version', function() {
		var result;
		before( function() {
			result = package.getPackageVersion( path.resolve( './proj1~owner2~branch1~0.2.0~5~darwin~OSX~10.9.2~x64.tar.gz' ) );
		} );

		it( 'should parse version correctly', function() {
			result.should.equal( '0.2.0-5' );
		} );
	} );

	describe( 'when getting package version', function() {
		var result;
		before( function() {
			result = package.getPackageVersion( path.resolve( './proj1~owner2~branch1~abcdef12~0.2.0~5~darwin~OSX~10.9.2~x64.tar.gz' ) );
		} );

		it( 'should parse version correctly', function() {
			result.should.equal( '0.2.0-5' );
		} );
	} );

	describe( 'when getting list of installed packages', function() {

		describe( 'with no installed packages', function() {
			it( 'should resolve to undefined', function() {
				return package.getInstalled( { project: 'proj1' }, './spec/installed/empty' )
					.should.eventually.equal( undefined );
			} );
		} );

		describe( 'with installed packages', function() {
			it( 'should return the latest version', function() {
				return package.getInstalled( /.*/, './spec/installed/projects/proj1-owner1-branch1' )
					.should.eventually.equal( '0.0.2-1' );
			} );

			it( 'should return a list', function() {
				return package.getInstalledVersions( /.*/, './spec/installed/projects/proj1-owner1-branch1' )
					.should.eventually.eql( [ '0.0.2-1', '0.0.1' ] );
			} );
		} );

		describe( 'with installed release', function() {
			it( 'should return the latest version', function() {
				return package.getInstalled( /.*/, './spec/installed/projects/proj2-owner2-branch2' )
					.should.eventually.equal( '0.1.0' );
			} );

			it( 'should return a list', function() {
				return package.getInstalledVersions( /.*/, './spec/installed/projects/proj2-owner2-branch2' )
					.should.eventually.eql( [ '0.1.0', '0.1.0-2', '0.1.0-1' ] );
			} );
		} );
	} );

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
						return val === 'path' || val === 'fullPath' || val === 'slug';
					} );
				} );
				terms.sort();
			} );

			it( 'should return correct list of terms', function() {
				terms.should.eql( [
					{ '0.0.1-5': 'version' },
					{ x64: 'architecture' },
					{ OSX: 'osName' },
					{ darwin: 'platform' },
					{ '1': 'build' },
					{ '0.0.1-1': 'version' },
					{ branch1: 'branch' },
					{ owner1: 'owner' },
					{ proj1: 'project' },
					{ '2': 'build' },
					{ '0.0.1-2': 'version' },
					{ '3': 'build' },
					{ '0.0.1-3': 'version' },
					{ '4': 'build' },
					{ '0.0.1-4': 'version' },
					{ '5': 'build' },
					{ '10.9.2': 'osVersion' },
					{ '0.0.2-1': 'version' },
					{ '0.0.2-2': 'version' },
					{ '0.0.2-3': 'version' },
					{ '14.04LTS': 'osVersion' },
					{ ubuntu: 'osName' },
					{ linux: 'platform' },
					{ '0.1.0-1': 'version' },
					{ '0.1.0-2': 'version' },
					{ branch2: 'branch' },
					{ '0.2.0-1': 'version' },
					{ owner2: 'owner' },
					{ '0.2.0-2': 'version' },
					{ '0.2.0-3': 'version' },
					{ '0.2.0-4': 'version' },
					{ '0.2.0-5': 'version' }
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
						return val === 'path' || val === 'fullPath' || val === 'slug';
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
	} );

	describe( 'when creating packages', function() {
		describe( 'with invalid path', function() {
			var error;
			before( function() {
				this.timeout( 5000 );
				return package.getInfo( 'test', {
					path: './',
					pack: {
						pattern: '/durp/**'
					} }, './farts' )
				.then( null, function( err ) {
					error = err;
				} );
			} );

			it( 'should report error', function() {
				error.toString().should.equal( 'Error: Cannot load repository information for invalid path "/git/labs/nonstop/nonstop-pack/farts"' );
			} );
		} );

		describe( 'with invalid package pattern', function() {
			var error, info;
			before( function() {
				this.timeout( 5000 );
				return package.getInfo( 'test', {
					path: './',
					pack: {
						pattern: '/durp/**'
					} }, './fauxgitaboudit' )
				.then( function( result ) {
					info = result;
				}, function( e ) { console.log( e.stack ); } );
			} );

			it( 'should retrieve correct information', function() {
				// omit file list and values that change due to commits in the repo
				_.omit( info, 'files', 'commit', 'slug', 'output', 'name' ).should.eql(
					{
						branch: 'master',
						owner: 'anonymous',
						pattern: '/durp/**',
						build: 5,
						version: '0.1.1',
						path: '/git/labs/nonstop/nonstop-pack/fauxgitaboudit'
					} );
			} );

			describe( 'when creating package from info', function() {
				before( function() {
					return package.create( info )
						.then( null, function( err ) {
							error = err;
						} );
				} );

				it( 'should report error', function() {
					error.toString().should.equal( 'Error: No files matched the pattern "/durp/**" in path "/git/labs/nonstop/nonstop-pack/fauxgitaboudit". No package was generated.' );
				} );

				it( 'should not have created package', function() {
					fs.existsSync( info.output ).should.be.false; // jshint ignore:line
				} );
			} );
		} );

		describe( 'with valid package information', function() {
			var info;
			var slug;
			before( function( done ) {
				package.getInfo( 'test', {
					path: './',
					pack: {
						pattern: '*'
					} }, './fauxgitaboudit' )
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
						owner: 'anonymous',
						pattern: '*',
						path: '/git/labs/nonstop/nonstop-pack/fauxgitaboudit',
						slug: info.slug
					} );
			} );

			describe( 'when creating package from info', function() {
				before( function() {
					this.timeout( 5000 );
					return package.create( info )
						.then( function() {
						} );
				} );

				it( 'should have created package', function() {
					fs.existsSync( info.output ).should.be.true; // jshint ignore:line
				} );

				it( 'should include sha in output', function() {
					var dir = path.dirname( info.output );
					var file = path.basename( info.output );
					package.parse( dir, file ).slug.should.equal( info.slug );
				} );

				after( function( done ) {
					fs.remove( './packages', function() {
						done();
					} );
				} );
			} );
		} );
	} );

	describe( 'when getting information for new package using versionFile', function() {
		var info, version;
		before( function() {
			var text = fs.readFileSync( './package.json' );
			var json = JSON.parse( text );
			version = json.version.split( '-' )[ 0 ];

			return package.getInfo( 'test', {
				path: './',
				versionFile: './package.json',
				pack: {
					pattern: './src/**/*,./node_modules/**/*'
				} }, './fauxgitaboudit' )
			.then( function( result ) {
				info = result;
			} );
		} );

		it( 'should retrieve correct information', function() {
			// omit file list and values that change due to commits in the repo
			_.omit( info, 'files', 'build', 'commit', 'slug', 'output', 'name', 'version' ).should.eql(
				{
					branch: 'master',
					owner: 'anonymous',
					pattern: './src/**/*,./node_modules/**/*',
					path: '/git/labs/nonstop/nonstop-pack/fauxgitaboudit'
				} );
		} );
	} );

	describe( 'when unpacking', function() {

		describe( 'with valid package', function() {
			var result;
			before( function() {
				return package.unpack(
					'./spec/files/proj1-owner1-branch2/proj1~owner1~branch2~0.0.2~1~darwin~OSX~10.9.2~x64.tar.gz',
					'./spec/installed/proj1-owner1-branch2/0.0.2-1' )
					.then( function( version ) {
						result = version;
					} );
			} );

			it( 'should unpack successfully', function() {
				fs.existsSync( './spec/installed/proj1-owner1-branch2/0.0.2-1' ).should.be.true;
			} );

			it( 'should write info file to extracted folder', function() {
				fs.existsSync( './spec/installed/proj1-owner1-branch2/0.0.2-1/.nonstop-info.json' ).should.be.true;
			} );

			it( 'should write info contents to info file', function() {
				JSON.parse( fs.readFileSync( './spec/installed/proj1-owner1-branch2/0.0.2-1/.nonstop-info.json' ).toString() )
					.should.eql( {
						architecture: 'x64',
						branch: 'branch2',
						build: '1',
						directory: '/git/labs/nonstop/nonstop-pack/proj1-owner1-branch2',
						file: 'proj1~owner1~branch2~0.0.2~1~darwin~OSX~10.9.2~x64.tar.gz',
						fullPath: '/git/labs/nonstop/nonstop-pack/proj1-owner1-branch2/proj1~owner1~branch2~0.0.2~1~darwin~OSX~10.9.2~x64.tar.gz',
						osName: 'OSX',
						osVersion: '10.9.2',
						owner: 'owner1',
						platform: 'darwin',
						project: 'proj1',
						relative: 'proj1-owner1-branch2',
						version: '0.0.2-1'

					} );
			} );

			it( 'should resolve with installed version', function() {
				result.should.equal( '0.0.2-1' );
			} );

			after( function( done ) {
				fs.remove( './spec/installed/proj1-owner1-branch2', function() {
					done();
				} );
			} );
		} );

		describe( 'with valid package includes slug', function() {
			var result;
			before( function() {
				return package.unpack(
					'./spec/files/proj1-owner1-branch2/proj1~owner1~branch2~a1b2c3d4~0.0.2~3~darwin~OSX~10.9.2~x64.tar.gz',
					'./spec/installed/proj1-owner1-branch2/0.0.2-3' )
					.then( function( version ) {
						result = version;
					} );
			} );

			it( 'should unpack successfully', function() {
				fs.existsSync( './spec/installed/proj1-owner1-branch2/0.0.2-3' ).should.be.true;
			} );

			it( 'should resolve with installed version', function() {
				result.should.equal( '0.0.2-3' );
			} );

			after( function( done ) {
				fs.remove( './spec/installed/proj1-owner1-branch2', function() {
					done();
				} );
			} );
		} );

		describe( 'with missing package', function() {
			var result;
			before( function() {
				return package.unpack(
					'./spec/files/proj1-owner1-branch1/proj1~owner1~branch2~0.0.2~1~darwin~OSX~10.9.2~x64.tar.gz',
					'./spec/installed/proj1-owner1-branch2/0.0.2-1' )
					.then( null, function( err ) {
						result = err;
					} );
			} );

			it( 'should resolve with installed version', function() {
				result.toString().should.equal( 'Error: The artifact file "./spec/files/proj1-owner1-branch1/proj1~owner1~branch2~0.0.2~1~darwin~OSX~10.9.2~x64.tar.gz" could not be found.' );
			} );
		} );
	} );

	describe( 'when copying uploaded file', function() {

		before( function( done ) {
			fs
				.createReadStream( './spec/files/proj1~owner1~branch2~0.1.0~2~darwin~OSX~10.9.2~x64.tar.gz' )
				.pipe( fs.createWriteStream( './spec/891345iaghakk92thagk.tar.gz' ) )
				.on( 'finish', function() {
					done();
				} );
		} );

		describe( 'with temp file', function() {
			var packages = [];
			before( function() {
				fs.mkdirpSync( './spec/uploads' );
				return package.copy(
					'./spec/uploads',
					'./spec/891345iaghakk92thagk.tar.gz',
					'test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz',
					packages
				);
			} );

			it( 'should copy file to the correct location', function() {
				fs.existsSync(
					path.resolve( './spec/uploads/test-arobson-master/test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz' )
				).should.be.true;
			} );

			it( 'should add valid package information to package list', function() {
				packages[ 0 ].should.eql( {
					architecture: 'x64',
					branch: 'master',
					build: '1',
					directory: path.resolve( './spec/uploads/test-arobson-master' ),
					file: 'test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz',
					fullPath: path.resolve( './spec/uploads/test-arobson-master/test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz' ),
					osName: 'any',
					osVersion: 'any',
					owner: 'arobson',
					path: undefined,
					platform: 'darwin',
					project: 'test',
					relative: 'test-arobson-master',
					slug: undefined,
					version: '0.1.0-1'
				} );
			} );

			describe( 'when promoting package', function() {
				before( function() {
					return package.promote( './spec/uploads', packages[ 0 ], packages );
				} );

				it( 'should copy original as release version', function() {
					fs.existsSync( './spec/uploads/test-arobson-master/test~arobson~master~0.1.0~~darwin~any~any~x64.tar.gz' ).should.be.true;
				} );

				it( 'should add valid package information to package list', function() {
					packages[ 1 ].should.eql( {
						architecture: 'x64',
						branch: 'master',
						build: '',
						directory: path.resolve( './spec/uploads/test-arobson-master' ),
						file: 'test~arobson~master~0.1.0~~darwin~any~any~x64.tar.gz',
						fullPath: path.resolve( './spec/uploads/test-arobson-master/test~arobson~master~0.1.0~~darwin~any~any~x64.tar.gz' ),
						osName: 'any',
						osVersion: 'any',
						owner: 'arobson',
						path: undefined,
						platform: 'darwin',
						project: 'test',
						relative: 'test-arobson-master',
						slug: undefined,
						version: '0.1.0'
					} );
				} );
			} );

			after( function( done ) {
				fs.remove( './spec/installed/proj1-owner1-branch2', function() {
					fs.remove( './spec/uploads/test-arobson-master', function() {
						done();
					} );
				} );
			} );
		} );
	} );
} );
