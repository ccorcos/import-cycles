# Detect Cyclical Imports in TypeScript Repos

Cyclical imports are really annoying bugs. This library helps you parse imports, ignoring type imports that get compiled away by TypeScript, so we can try to debug where cyclical imports are creating runtime errors.

## Getting Started

```sh
npm install import-cycles
```

Then use it like this.

```ts
import {detectImportCycles, analyzeImportCycles} from "import-cycles"

const entryPaths = [
	__dirname + "/src/app/renderer/renderer.tsx",
	__dirname + "/src/app/main/main.ts"
]

const { deps, cycles, subcycles, terminated } = detectImportCycles(
	entryPaths,
	prettyPath
)
analyzeImportCycles(cycles)
```

And here's the output I see on a problematic project of mine:

```js
CYCLE: [
  'app/renderer/modules/TabbarState.ts',
  'app/renderer/modules/TabState.ts',
  'app/renderer/actions/docTabActions.ts',
  'app/renderer/modules/TabbarState.ts'
]
CYCLE: [
  'app/renderer/modules/TabState.ts',
  'app/renderer/actions/docTabActions.ts',
  'app/renderer/modules/TabbarState.ts',
  'app/renderer/modules/TabState.ts'
]
CYCLE: [
  'app/renderer/modules/DocTabState.ts',
  'app/renderer/editor/createEditor.ts',
  'app/renderer/editor/plugins/mention.tsx',
  'app/renderer/actions/linkActions.ts',
  'app/renderer/modules/DocTabState.ts'
]
CYCLE: [
  'app/renderer/editor/createEditor.ts',
  'app/renderer/editor/plugins/mention.tsx',
  'app/renderer/actions/linkActions.ts',
  'app/renderer/modules/DocTabState.ts',
  'app/renderer/editor/createEditor.ts'
]
... [ many more ] ...
CYCLE: [
  'app/renderer/modules/LoadDirEffectPlugin.ts',
  'app/renderer/modules/SidebarState.ts',
  'app/renderer/modules/LoadDirEffectPlugin.ts'
]
[
  [ 'app/renderer/modules/SidebarState.ts', 3 ],
  [ 'app/renderer/modules/LoadDirEffectPlugin.ts', 3 ],
  [ 'app/renderer/actions/docTabActions.ts', 22 ],
  [ 'app/renderer/actions/tabActions.ts', 24 ],
  [ 'app/renderer/modules/TabState.ts', 25 ],
  [ 'app/renderer/modules/TabbarState.ts', 28 ],
  [ 'app/renderer/modules/DocTabState.ts', 38 ],
  [ 'app/renderer/editor/createEditor.ts', 49 ],
  [ 'app/renderer/editor/plugins/mention.tsx', 49 ],
  [ 'app/renderer/actions/linkActions.ts', 49 ]
]
TOTAL NUMBER OF CYCLES:  42
```

It's up to you from here to try to deduce what's going on and how to fix it. If you have any ideas for analysis that would help, please open a Github Issue!

## Development

```sh
npm run build
npm version major
npm publish
```