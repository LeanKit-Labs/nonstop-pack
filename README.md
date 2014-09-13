# continua-pack
This library provides all functionality around the creation and handling of artifact packages for the continua CI/CD system.

It is unlikely that you would consume this library directly unless you are working on a package host, build agent, CLI or bootstrapper. There are already continua projects for each of these use cases.

## Packages

### Information
The following information describes a package:

 * project name
 * repository owner
 * branch
 * version
 * build number
 * OS family (darwin, linux, windows)
 * OS name (optional, default is `any`)
 * OS version (optional, default is `any`)
 * OS architecture (x86, x64)

### File format
Packages are tarballed and gzipped (.tar.gz), there are no other supported formats at this time.

### Name format
The information is combined in order delimited by `~`. While this does result in long names, it enables [continua-hub](https://github.com/LeanKit-Labs/continua-hub) to filter available packages by any of the information listed and means never having to guess what source produced a specific package.

Example:
```
projectName~owner~branch~version~build~osFamily~os~osVersion~architecture
```

## API

### add( root, packages, packageName )

	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

Adds a package by name to an array of packages by parsing the details from the package name and appending the package information to the `packages` array. Returns the information that was added to the array.

The relative property of the package data follows the format: `project-owner-branch`. This will cause all packages with the same project, owner and branch to be stored in a single folder

To get details on what information is provided by the package object, see the section on parse.

```javascript
// root - provides the base folder where all package subfolders will be created
// packages - an array of package information details
// packageName - the name of the package file

packages.parse( './packages', packageList, 'test~arobson~master~0.1.0~1~darwin~any~any~x64' );
```

### copy( root, temp, packageName, packages )

	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

Copy's a package from a temporary storage directory (i.e. after being uploaded) to the intended long-term path and then removes the temporary file. This also uses the add method to add the package details to the `packages` list. Returns a promise to indicate success of the copy and remove operations.

```javascript
// root - provides the base folder where all package subfolders will be created
// temp - the full path to the temporary location of the uploaded file
// packageName - the name of the package file
// packages - an array of package information details
packages.copy( 
		'./packages', 
		'./tmp/891345iaghakk92thagk.tar.gz', 
		packageList, 
		'test~arobson~master~0.1.0~1~darwin~any~any~x64' 
	).then( function() { 
		//on success 
	} );
```

### create( packageInfo )

	Intended for use in build agents/clis: 
		[continua-agent](https://github.com/LeanKit-Labs/continua-agent)
		[continua-cli](https://github.com/LeanKit-Labs/continua-cli).

Creates a new package from a package information data structure. (see getInfo for obtaining the information required to seed this function)

The result will be a tar.gz with the correct package name stored based on data in the packageInfo hash. Returns a promise indicating the success of the package creation. On success, the file paths included in the package are returned in an array.

```javascript
// packageInfo - a data structure containing the information necessary to create the package
var packageInfo = package.getInfo( 'test', config, './' );
package.create( packageInfo )
	.then( function( packedFiles ) {
		//on success 
	} );
```

### find( packages, filter )

	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

Given a set of desired pacakge attributes (in hash format), return a sorted list of packages that satisfy the filter. Packages are sorted by sematic version (version-build) starting with the newest.

```javascript
// packages - the array of package details
// filter - the hash of attribute values to match
var matches = package.find( packages, { owner: 'arobson', branch: 'master' } );
```

### getInfo( projectName, projectConfig, repositoryPath )

	Intended for use in build agents/clis: 
		[continua-agent](https://github.com/LeanKit-Labs/continua-agent)
		[continua-cli](https://github.com/LeanKit-Labs/continua-cli).

Determines key information about the package by examining the git repository and version file. Returns a promise that should resolve to the hash. The primary use for this data structure is to provide necessary data for package creation.

The format of the object is:

```javascript
{
	branch: 'master',
	owner: 'arobson',
	version: '0.1.0',
	build: 1,
	commit: '75b73a17ef82f451511a377ecf2149d81ce2fc17',
	name: 'test~arobson~master~0.1.0~1~darwin~any~any~x64',
	output: 'packages/test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz',
	pattern: './src/**/*,./node_modules/**/*'
}
```

```javascript
// projectName - the name of the project, ex: 'test'
// projectConfig - the build configuration for the project
// repositoryPath - the relative path for the repository
package.getInfo( 'test', config, './' )
	.then( function( info ) {
		// on success
	} );
```

### getInstalled( filter, installed, [ignored], [noError] )

	Intended for use with the [bootstrapper](https://github.com/LeanKit-Labs/continua).

Finds the most recent version installed within a relative path. The bootstrapper stores all installed versions under a common directory (./installed) and each version has its own directory. Returns the latest version installed on success.

```javascript
// filter - regular expression to evaluation versions with
// installed - the path which versions have been installed to
// ignored - (optional) - a list of versions to exclude
// noError - (optional) - a flag that causes the function to resolve to undefined in the event of an error

package.getInstalled( /.*/, './installed', [], true )
	.then( function( latestVersion ) {
		// on success
	} )
```

### getList( root )
	
	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

Scans a given directory structure starting at a relative path to build an array containing package information for all packages found. Returns a promise that resolves to the array on success.

```javascript
// root - the path to where all package subfolders are stored
package.getList( './packages' )
	.then( function( packages ) {

	} );
```

### pack

	Intended for use in build agents/clis: 
		[continua-agent](https://github.com/LeanKit-Labs/continua-agent)
		[continua-cli](https://github.com/LeanKit-Labs/continua-cli).

```javascript

```

### parse

	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

```javascript

```

### terms( packages )

	Intended for use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub).

Produce a unique set of valid filter key/value pairs based on the package information array. Returns a promise that resolves to the array of terms on success.

```javascript
// packages - the array of package information
package.terms( packages )
	.then( function( terms ) {
		// on success
	} );
```

### unpack( artifact, target )

	Intended for use with the [bootstrapper](https://github.com/LeanKit-Labs/continua).

Unpackages a package (.tar.gz) to a target directory. If the unpack fails, this will attempt to remove the target and any contents. Returns a promise that resolves to the unpacked version or an error if the unpack fails.

```javascript
// artifact - path including the package file
// target - path to unpack into
package.unpack( 
		'./packages/test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz',
		'./installed/test-arobson-master-0.1.0-1' )
	.then( function( version ) {
		// on success
	} );
```

## Dependencies
This would not have been possible without several great Node modules:

 * vinyl-fs <- this is __awesome__
 * through2
 * map-stream
 * archiver
 * tar-fs
 * when
 * lodash
 * semver
 * rimraf
 * mkdirp
 * debug

## Dependents
The following continua projects rely on this library:

 * [build library](https://github.com/LeanKit-Labs/continua-build)
 * [build cli](https://github.com/LeanKit-Labs/continua-cli)
 * [build agent](https://github.com/LeanKit-Labs/continua-agent)
 * [package host](https://github.com/LeanKit-Labs/continua-hub)
 * [bootstrapper](https://github.com/LeanKit-Labs/continua)