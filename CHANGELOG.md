## 0.1.0

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