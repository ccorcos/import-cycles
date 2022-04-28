## Usage

```ts
import { detectImportCycles,analyzeImportCycles } from "future-name-of-the-package";
const importCycles = await detectImportCycles([
    __dirname + "/../../examples/multiple-cycles/entry.ts",
    __dirname + "/../../examples/multiple-cycles/entry2.ts",
  ]);
analyzeImportCycles(importCycles);
```

And here's the output:

```
Files that have cycles: 2 

File: C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts contains 3 cycles

 ====

C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file4.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file2.ts

 -----

C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file4.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts

 -----

C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts

 ====

File: C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry2.ts contains 1 cycles

 ====

C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\file2.ts -> C:\Users\Quentin\Desktop\imports-cycles\examples\multiple-cycles\entry2.ts

 ====
```