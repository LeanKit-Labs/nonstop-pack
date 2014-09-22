# nonstop-pack
This library provides all functionality around the creation and handling of artifact packages for the nonstop CI/CD system.

It is unlikely that you would consume this library directly unless you are working on a package host, build agent, CLI or bootstrapper. There are already nonstop projects for each of these use cases.

## Packages

### Information
The following information describes a package:

 * project name
 * repository owner
 * branch
 * version
 * build number
 * OS platform (darwin, linux, win32)
 * OS name (optional, default is `any`)
 * OS version (optional, default is `any`)
 * OS architecture (x86, x64)

### File format
Packages are tarballed and gzipped (.tar.gz), there are no other supported formats at this time.

### Name format
The information is combined in order delimited by `~`. While this does result in long names, it enables [nonstop-hub](https://github.com/LeanKit-Labs/nonstop-hub) to filter available packages by any of the information listed and means never having to guess what source produced a specific package.

Example:
```
projectName~owner~branch~version~build~osFamily~os~osVersion~architecture
```

## Versioning
Continua's versioning strategy was designed to produce consistent results against a git repository's commit history. This also eliminates the need for a central coordinator to assign build numbers and results in a solution that will always produce the same build version given a specific commit.

Versioning is determined based on commit history and project version. Once the file containing the version is located, the version is read from this file at each commit. The build number is incremented for every commit in which the version does not change.

Because of this approach, the file which specifies the version for a project must always remain in the same location and have the same file name. Changing this will break Continua's ability to determine versions across your repository's history.

In the event that Continua is unable to locate the file specifying your project's version (this is probably only likely in .Net projects) - you can specify the file in the project section of the build file with the `versionFile` property.

In the event that no commit has ever been made to the repository, the version will fall back to '0.0.0' and build '0'.

## API

### add( root, packages, packageName )

> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

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

> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

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

> For use in build agents/clis: 
> * [continua-agent](https://github.com/LeanKit-Labs/continua-agent)
> * [continua-cli](https://github.com/LeanKit-Labs/continua-cli)

Creates a new package from a package information data structure. (see getInfo for obtaining the information required to seed this function)

The result will be a tar.gz with the correct package name stored based on data in the packageInfo hash. Returns a promise indicating the success of the package creation. On success, a packageInfo hash is returned with a `files` property containing an array of all files packaged.

```javascript
// packageInfo - a data structure containing the information necessary to create the package
var packageInfo = package.getInfo( 'test', config, './' );
package.create( packageInfo )
	.then( function( packageInfo ) {
		//on success 
	} );
```

### find( packages, filter )

> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

Given a set of desired pacakge attributes (in hash format), return a sorted list of packages that satisfy the filter. Packages are sorted by sematic version (version-build) starting with the newest.

```javascript
// packages - the array of package details
// filter - the hash of attribute values to match
var matches = package.find( packages, { owner: 'arobson', branch: 'master' } );
```

### getInfo( projectName, projectConfig, repositoryPath )

> For use in build agents/clis: 
> * [continua-agent](https://github.com/LeanKit-Labs/continua-agent)
> * [continua-cli](https://github.com/LeanKit-Labs/continua-cli)

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

> For use in bootstrappers (as in [continua](https://github.com/LeanKit-Labs/continua))

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
	
> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

Scans a given directory structure starting at a relative path to build an array containing package information for all packages found. Returns a promise that resolves to the array on success.

```javascript
// root - the path to where all package subfolders are stored
package.getList( './packages' )
	.then( function( packages ) {
		// on success
	} );
```

### pack( pattern, workingPath, target )

> For use in build agents/clis: 
> * [continua-agent](https://github.com/LeanKit-Labs/continua-agent)
> * [continua-cli](https://github.com/LeanKit-Labs/continua-cli)

This function is called by create and performs the actual packaging. Returns a promise that resolves to a list of the files included in the created archive.

	Note: this call will create the target directory if it does not already exist

```javascript
// pattern - an array or comma delimited list of globs used to identify files for inclusion
// workingPath - the relative working directory for all globs
// target - path (including name) to the archive to create
package.pack( pattern, workingPath, target )
	.then( function( files ) {
		// on success
	} );
```

### parse( root, packageName)

> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

This function parses a package name in order to determine the metadata about the package.

```javascript
// root - the path where archives are being stored
// packageName - the filename of the archive
var info = package.parse( './packages', 'test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz' );
```

### terms( packages )

> For use in package hosting (as in [continua-hub](https://github.com/LeanKit-Labs/continua-hub))

Produce a unique set of valid filter key/value pairs based on the package information array. Returns a promise that resolves to the array of terms on success.

```javascript
// packages - the array of package information
package.terms( packages )
	.then( function( terms ) {
		// on success
	} );
```

### unpack( artifact, target )

> For use in bootstrappers (as in [continua](https://github.com/LeanKit-Labs/continua))

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