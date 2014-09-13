var _ = require( 'lodash' );
var os = require( 'os' );
var ip = getIP();
var config = require( './config.js' );

function getIP() {
	var names = [ 'eth0', 'eth1', 'eth2', 'eth3', 'eth4', 'en0', 'en1', 'en2', 'en3', 'en4', 'Ethernet', 'Ethernet 1', 'Ethernet 2', 'Ethernet 3', 'Ethernet 4' ];
	var interfaces = os.networkInterfaces();
	var index = _.findIndex( names, function( name ) {
			var interface = interfaces[ name ];
			return interface != undefined && interface.length > 0; //jshint ignore:line
		} );
	var primary = interfaces[ names[ index ] ];
	var IPv4 = _.find( primary, function( address ) {
					return address.family == 'IPv4';
				} );
	return IPv4.address;
}

function getInfo() {
	return {
		name: os.hostname(),
		os: os.type(),
		platform: os.platform(),
		arch: os.arch(),
		version: os.release(),
		osName: ( config.os ? config.os.name : undefined ) || 'any',
		osVersion: ( config.os ? config.os.version : undefined ) || 'any'
	};
}

module.exports = getInfo;