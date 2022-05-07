- camelCase
- newlines at the end of the file

I want to see this logic broken up into smaller pieces that are independently tested:
- parseImports test.
- exportIsType test.
- exportIsClass test.
- classIsUsedAsValue test.
- parseDependencies test.
	- write some more tests for parseDependencies as well.
	- make sure to test out with nested files as such as well.
- importCycles test