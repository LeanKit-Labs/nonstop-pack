var _ = require( 'lodash' ),
	gulp = require( 'gulp' ),
	mocha = require( 'gulp-mocha' ),
	through = require( 'through2' ),
	builtPatterns = [];

function buildRegex( templates, prefix ) {
	builtPatterns = templates.map( function( template ) {

		var patt = template.replace( "$PREFIX$", prefix );
		console.log( patt );
		return new RegExp( patt, "gm" );
	} );
}

function prefix( opt ) {
	var options = _.extend( {
		patterns: [
			"(React.DOM.img\\((?:.|[\\n\\r])*src:\\s*['\"](?!$PREFIX$))(\\/.*)(['\"])",
			"(<img.*src=['\"](?!$PREFIX$))(\\/.*)(['\"].*>)",
			"(<link.*href=['\"](?!$PREFIX$))(\\/.*)(['\"].*>)",
			"(<script.*src=['\"](?!$PREFIX$))(\\/.*)(['\"].*>)",
			"(url.*\\(.*['\"](?!$PREFIX$))(\\/.*)(['\"]\\))"
		]
	}, opt );

	buildRegex( options.patterns, options.prefix );

	function prefixAllTheThings( file, enc, cb ) {
		var contents = String( file._contents );

		builtPatterns.forEach( function( pattern ) {
			contents = contents.replace(
				pattern,
				"$1" + options.prefix + "$2$3"
			);
		} );

		file._contents = new Buffer( contents );
		cb( null, file );
		//this.emit( 'data', file );
	}

	return through.obj( prefixAllTheThings, function( cb ) { cb( null ); } );
}

gulp.task( 'lol', function() {
	return gulp.src( [ './src/*.js' ] )
		.pipe( prefix( { prefix: '/lol' } ) )
		.pipe( gulp.dest( './lol' ) )
		.on( 'end', function() { console.log( 'NO WAY!' ); } )
		.on( 'error', function( e ) { console.log( 'As predicted: ', e.stack ); } );
} );

gulp.task( 'test', function() {
	return gulp.src( [ './spec/**.spec.js' ], { read: false } )
		.pipe( mocha( { reporter: 'spec' } ) )
		.on( 'end', process.exit.bind( process, 0 ) )
		.on( 'error', process.exit.bind( process, 1 ) );
} );

gulp.task( 'continuous-test', function() {
	return gulp.src( [ './spec/**.spec.js' ], { read: false } )
		.pipe( mocha( { reporter: 'spec' } ) );
} );

gulp.task( 'watch', function() {
	gulp.watch( [ './src/**', './spec/**' ], [ 'continuous-test' ] );
} );

gulp.task( 'default', [ 'continuous-test', 'watch' ], function() {
} );