## 0.2.*

### 0.2.0

 * Change how build numbers are calculated
   * Simplify the process previously used to fewer steps
   * Better leveraging of git's CLI features
   * Count all commits since the version was changed
 * Add a script to create a one-off git repository so that tests can run anywhere
 * Rework the git module API
 * Replace cp, mv and rimraf with fs-extra

## 0.1.*

### 0.1.9
Bug fix - Defer addition of file information to package list until after move operation has invoked callback.

### 0.1.8
Improve promote API by returning info to the promoted package.

### 0.1.7
Bug fix - promotion failed to change version specifier.

### 0.1.6
 * Add information file to unpackaged directory when unpacking project.

### 0.1.5
Add package promotion support.

### 0.1.4

 * Support retrieval of all installed versions
 * Add commit slug to package file

### 0.1.3

Bug fix - reading a file at sha should use relative path (affects version detection and build number).

### 0.1.2

Change upload from fs.rename to use `mv` module to support copying between volumes (for use with nonstop-index inside a Docker container with mounted volumes ... who knew?)

### 0.1.1

* Add support for detecting when packing is happening in Drone to get the branch name from the env
* Remove attempt to get IP from sysinfo module (never used)

### 0.1.0

### prerelease 14
 * Use `master` as default branch value and directory for default repository name
 * Fix defect causing only commits where versions changed to be included in commit history

### prerelease 13
Fall back to placeholder/default values when a git repository doesn't exist to collect build information from.

### prerelease 12
 * Rework promise chains for git and version modules
 * Fix issues in gulpfile when tests fail in continuous coverage mode
 * Add spec to cover bad project path use case

### prerelease 11
Fixing bugs with how pack behaved when pattern was undefined in the project.

### prerelease 10
 * add test coverage for `copy`, `unpack`, `getInstalled` and `getPackageVersion`
 * replace use of `path.join` with `path.resolve` - join removes relative path specification './' (a bad thing)
 * bug fixes in implementations of unpack and getInstalled

### prerelease 9
Swap out vinyl-fs in favor of globulesce. Removing dependencies on through2 and map-stream.

### prerelease 7
Fix bug in how file was being copied during upload.

### prerelease 6
Expand how package information is gathered to support complete path information for packages found by the CLI.

### prerelease 5
Fix issue where the `getList` call ignored packages with dotted folders in the name.

### prerelease 4
Project re-name and doc changes

### prerelease 3
Support the ability to specify the file where the versioning information for a project is kept.

### prerelease 2
Introduce a consistent version/build strategy based on commits in the (local) git repository. The intent is to provide a consistent, coordinator-free way to derive a build number, per version.

Also changed it so that a packageInfo object is returned instead of an array of files on package creation.
