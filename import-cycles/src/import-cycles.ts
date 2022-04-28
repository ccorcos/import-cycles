import { TypescriptParser } from "typescript-parser";
import fs from "fs";
import Path from "path";

type Imports = string[];

type FileImports = { filePath: string; imports: Imports };

type Cycle = string[];

type FileCycles = { filePath: string; cycle: Cycle[] };

type FileSource = { filePath: string; source: string };

function resolvePath(path: string): string {
  if (!path.startsWith("/")) {
    return Path.resolve(path);
  }
  return path;
}
function getResolvedPaths(filesPaths: string[]) {
  return filesPaths.map((filePath) => resolvePath(filePath));
}

function getSource(filePath: string): FileSource {
  return { filePath: filePath, source: fs.readFileSync(filePath, "utf8") };
}

function getSources(filesPaths: string[]): FileSource[] {
  return filesPaths.map((filePath) => {
    return getSource(filePath);
  });
}

const parser = new TypescriptParser();

async function getFilesImports(files: FileSource[]): Promise<FileImports[]> {
  // get a list of all imports in all files
  const filesImports: FileImports[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const imports = await getImports(file);
    const fileImports: FileImports = { filePath: file.filePath, imports };
    filesImports.push(fileImports);
  }
  return filesImports;
}

async function checkImportCycles(
  entryFileImports: Imports,
  cyclePath: string[],
  fileCycles: FileCycles
): Promise<void> {
  for (let index = 0; index < entryFileImports.length; index++) {
    const entryFileImport = entryFileImports[index];
    if (cyclePath.includes(entryFileImport)) {
      return;
    }
    const entryFileImportSource = getSource(entryFileImport);
    const imports = await getImports(entryFileImportSource);
    let cycleDetected = false;
    for (let index = 0; index < imports.length; index++) {
      const element = imports[index];
      if (cyclePath.includes(element) || element === entryFileImport) {
        fileCycles.cycle.push([...cyclePath, entryFileImport, element]);
        cycleDetected = true;
      }
    }
    if (!cycleDetected) {
      cyclePath.push(entryFileImport);
      await checkImportCycles(imports, cyclePath, fileCycles);
    }
  }
}
async function getImportCycles(
  entryFilesImports: FileImports[]
): Promise<FileCycles[]> {
  const filesCycles: FileCycles[] = [];
  for (let index = 0; index < entryFilesImports.length; index++) {
    const fileCycles: FileCycles = {
      filePath: entryFilesImports[index].filePath,
      cycle: [],
    };
    const file = entryFilesImports[index];
    const cyclePath: string[] = [];
    cyclePath.push(file.filePath);
    await checkImportCycles(file.imports, cyclePath, fileCycles);
    if (fileCycles.cycle.length > 0) {
      filesCycles.push(fileCycles);
    }
  }
  return filesCycles;
}

async function getImports(file: FileSource): Promise<Imports> {
  const parsedSource = await parser.parseSource(file.source);
  const importsRaw = parsedSource.imports;
  const imports: Imports = [];

  for (let index = 0; index < importsRaw.length; index++) {
    const importRaw = importsRaw[index];
    const path = Path.dirname(file.filePath);
    const fullPath = Path.join(path, importRaw.libraryName);
    if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))
      imports.push(fullPath);

    const tsPath = fullPath + ".ts";
    if (fs.existsSync(tsPath)) imports.push(tsPath);
    const tsxPath = fullPath + ".tsx";
    if (fs.existsSync(tsxPath)) imports.push(tsxPath);
  }

  return imports;
}

export async function detectImportCycles(entryPaths: string[]) {
  const filesPathsResolved = getResolvedPaths(entryPaths);

  // get a list of sources from filesPaths
  const sources = getSources(filesPathsResolved);
  const imports = await getFilesImports(sources);
  // get a list of all import cycles
  const cycles = await getImportCycles(imports);
  // return the list of cycles
  return cycles;
}

export function analyzeImportCycles(fileCycles: FileCycles[]): void {
  console.log(`Files that have cycles: ${fileCycles.length} \n`);
  fileCycles.forEach((fileCycle) => {
    console.log(
      `File: ${fileCycle.filePath} contains ${fileCycle.cycle.length} cycles`
    );
    console.log(`\n ==== \n`);
    for (let index = 0; index < fileCycle.cycle.length; index++) {
      const cycle = fileCycle.cycle[index];
      console.log(`${cycle.join(" -> ")}`);
      if (index < fileCycle.cycle.length - 1) {
        console.log(`\n ----- \n`);
      }
    }
    console.log(`\n ==== \n`);
  });
}

if (process.env.VSCODE_DEBUG) {
  async function debug_test() {
    analyzeImportCycles(
      await detectImportCycles([
        __dirname + "/../examples/multiple-cycles/entry.ts",
        __dirname + "/../examples/multiple-cycles/entry2.ts",
      ])
    );
  }
  debug_test();
}
