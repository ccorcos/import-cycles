import fs from "fs"
import Path from "path"
import {
	Declaration,
	File as ParsedFile,
	Import as ParserImport,
	SymbolSpecifier,
	TypescriptParser,
} from "typescript-parser"

type Imports = string[]

type FileImports = { filePath: string; imports: Imports }

type Cycle = string[]

type FileCycles = { filePath: string; cycle: Cycle[] }

export type FileSource = { filePath: string; source: string }

function resolvePath(path: string): string {
	if (!path.startsWith("/")) {
		return Path.resolve(path)
	}
	return path
}
function getResolvedPaths(filesPaths: string[]) {
	return filesPaths.map((filePath) => resolvePath(filePath))
}

function getSource(filePath: string): FileSource {
	return { filePath: filePath, source: fs.readFileSync(filePath, "utf8") }
}

function getSources(filesPaths: string[]): FileSource[] {
	return filesPaths.map((filePath) => {
		return getSource(filePath)
	})
}

const parser = new TypescriptParser()

async function getFilesImports(files: FileSource[]): Promise<FileImports[]> {
	// get a list of all imports in all files
	const filesImports: FileImports[] = []

	for (let index = 0; index < files.length; index++) {
		const file = files[index]
		const imports = await getImports(file)
		const fileImports: FileImports = { filePath: file.filePath, imports }
		filesImports.push(fileImports)
	}
	return filesImports
}

async function checkImportCycles(
	entryFileImports: Imports,
	cyclePath: string[],
	fileCycles: FileCycles
): Promise<void> {
	for (let index = 0; index < entryFileImports.length; index++) {
		const entryFileImport = entryFileImports[index]
		if (cyclePath.includes(entryFileImport)) {
			return
		}
		const entryFileImportSource = getSource(entryFileImport)
		const imports = await getImports(entryFileImportSource)
		let cycleDetected = false
		for (let index = 0; index < imports.length; index++) {
			const element = imports[index]
			if (cyclePath.includes(element) || element === entryFileImport) {
				fileCycles.cycle.push([...cyclePath, entryFileImport, element])
				cycleDetected = true
			}
		}
		if (!cycleDetected) {
			cyclePath.push(entryFileImport)
			await checkImportCycles(imports, cyclePath, fileCycles)
		}
	}
}
async function getImportCycles(
	entryFilesImports: FileImports[]
): Promise<FileCycles[]> {
	const filesCycles: FileCycles[] = []
	for (let index = 0; index < entryFilesImports.length; index++) {
		const fileCycles: FileCycles = {
			filePath: entryFilesImports[index].filePath,
			cycle: [],
		}
		const file = entryFilesImports[index]
		const cyclePath: string[] = []
		cyclePath.push(file.filePath)
		await checkImportCycles(file.imports, cyclePath, fileCycles)
		if (fileCycles.cycle.length > 0) {
			filesCycles.push(fileCycles)
		}
	}
	return filesCycles
}


export function isATypeExport(declaration: any){
	return getDeclarationType(declaration) === "TypeAliasDeclaration" || getDeclarationType(declaration) === "InterfaceDeclaration";
}

export function isAClassExport(declaration: any){
	return getDeclarationType(declaration) === "ClassDeclaration";
}

function getAllExportedDeclaration(declarations: Declaration[]): Declaration[] {
	const exportedDeclarations: Declaration[] = []
	for (let index = 0; index < declarations.length; index++) {
		const declaration: any = declarations[index]
		if (
			declaration.isExported && 
			!isATypeExport(declaration)
		) {
			exportedDeclarations.push(declaration)
		}
	}
	return exportedDeclarations
}

function isAssign(source: string, variable: any, className: string): boolean {
	if (variable.start && variable.end) {
		const varData = source.substring(variable.start, variable.end).split("=")[1]
		if (varData.includes(className)) {
			return true
		}
	}
	return false
}

function isReturned(returnStatement: string, linkedImportDeclarationName: string): boolean {
	const returnStatementData = returnStatement.split("return")[1]
	if (returnStatementData.includes(linkedImportDeclarationName)) {
		return true
	}
	return false
}

function getReturnStatements(functionSource: string) {
	// if the function isn't a void function then we have to check if the class is returned
	// use a reguex to get all the return statements data from function source until next semi-colon or \r or \n
	return  functionSource.match(
		/return[\s\S]*?;*?\r*?\n/g
	)
}

function getDeclarationType(declaration: any): string {
	return declaration.__proto__.constructor.name
}

function getResolvedPath(entryFileDirPath: string,libraryName:string): string | null {
	let resolvedPath = resolvePath(
		`${entryFileDirPath}/${libraryName}`
	)
	if (!fs.existsSync(resolvedPath)) {
		if (fs.existsSync(resolvedPath + ".ts")) {
			return `${resolvedPath}.ts`
		} else if (fs.existsSync(resolvedPath + ".tsx")) {
			return `${resolvedPath}.tsx`
		} else {
			return null  // ignore this import
		}
	}
	return resolvedPath
}

function checkDeclaration(linkedImportDeclaration: Declaration, entryFiledeclarations: Declaration[], source: string): boolean {
	
			// If this declaration is a class then we have to check how it's been used
			if (
				isAClassExport(linkedImportDeclaration)
			) {
				// check all declarated vars and all declarated vars inside functions
				for (
					let entryFileDecIndex = 0;
					entryFileDecIndex < entryFiledeclarations.length;
					entryFileDecIndex++
				) {
					const entryFileDec = entryFiledeclarations[entryFileDecIndex]
					if (getDeclarationType(entryFileDec) === "VariableDeclaration") {
						// For every variable we check if the given class is used on the right side of an assignment
						// So if the class is used statically or being instantiated
						if (
							isAssign(
								source,
								entryFileDec,
								linkedImportDeclaration.name
							)
						) {
							return true
						}
					}
					// If this is a function then we have to check for the function's variables
					// Doing like this it also ignore if a class is used as a type in function's arguments
					else if (
						getDeclarationType(entryFileDec) === "FunctionDeclaration"
					) {
						for (
							let funcDecIndex = 0;
							funcDecIndex < (entryFileDec as any).variables.length;
							funcDecIndex++
						) {
							const variable = (entryFileDec as any).variables[funcDecIndex]
							if (
								isAssign(
									source,
									variable,
									linkedImportDeclaration.name
								)
							) {
								return true
							}
						}
						
						const functionSource = source.substring(
							entryFileDec.start as number,
							entryFileDec.end
						)			
						const returnStatements = getReturnStatements(functionSource)
						if (returnStatements) {
							for (
								let returnStatementIndex = 0;
								returnStatementIndex < returnStatements.length;
								returnStatementIndex++
							) {
								const returnStatement = returnStatements[returnStatementIndex]
								if(isReturned(returnStatement, linkedImportDeclaration.name)){
									return true
								}
							}
						}
					}
				}
				return false
			} else {
				// If this is not a class Declaration nor a typeAlias then validate the import without much checking
				return true
			}
}

function checkSpecifiers(specifiers: SymbolSpecifier[], importDeclarations:Declaration[],entryFiledeclarations:Declaration[],source:string ): boolean {
	for (let index = 0; index < specifiers.length; index++) {
		const specifier = specifiers[index]
		// for the given specifier we search for his linked declaration inside the imported module
		const linkedImportDeclaration = importDeclarations.find(
			(declaration) => declaration.name === specifier.specifier
		)
		// If none exist then we skip this import
		if (linkedImportDeclaration && checkDeclaration(linkedImportDeclaration,entryFiledeclarations,source)) {
			return true
		}

	}
	return false
}

function getSpecifiers(parserImport:ParserImport): SymbolSpecifier[]{
	return (parserImport as any).specifiers as SymbolSpecifier[]
}

export async function checkIfImportExistAtRuntime(importFileSource:FileSource,parserImport:ParserImport,entrySource:string,entryFileParsed:ParsedFile):Promise<boolean>{
	// extract data from the sources of this file
	const parsedSource = await parseSource(importFileSource.source)
	// Get all usefull declarations from the file ( ignoring TypeAliasDeclaration )
	const importDeclarations = getAllExportedDeclaration(
		parsedSource.declarations
	)

	const specifiers = getSpecifiers(parserImport)
	// for every specifier of the currently analysed import
	// We will check how there are used, example if a class is used as a type
	if(checkSpecifiers(specifiers, importDeclarations,entryFileParsed.declarations,entrySource)){
		return true
	}
	else{
		return false
	}
}

async function validateImport(entryFileDirPath:string,entryFileParsed:ParsedFile,index:number,entrySource:string): Promise<boolean>{

	const parserImport = entryFileParsed.imports[index]
	// check if Path point to a file format we support
	const resolvedPath = getResolvedPath(entryFileDirPath, parserImport.libraryName)
	if(!resolvedPath){
		return false
	}
	const importFileSource = getSource(resolvedPath)
	if(await checkIfImportExistAtRuntime(importFileSource,parserImport,entrySource,entryFileParsed)){
		return true
	}
	return false
}

async function validateImports(
	entryFileSource: FileSource,
	entryFileParsed: ParsedFile
): Promise<ParserImport[]> {
	const entryFileNormalizedPath = Path.normalize(entryFileSource.filePath);
	const entryFileDirPath = entryFileNormalizedPath.substring(
		0,
		entryFileNormalizedPath.lastIndexOf(Path.sep)
	)
	const validatedImports = []
	for (let index = 0; index < entryFileParsed.imports.length; index++) {
		if(await validateImport(entryFileDirPath,entryFileParsed,index,entryFileSource.source)){
			validatedImports.push(entryFileParsed.imports[index])
		}
	}
	return validatedImports
}

export async function parseSource(source:string):Promise<ParsedFile>{
	return await parser.parseSource(source)
}

export async function getImports(file: FileSource): Promise<Imports> {
	const parsedSource = await parseSource(file.source)
	const importsRaw = await validateImports(file, parsedSource)
	const imports: Imports = []

	for (let index = 0; index < importsRaw.length; index++) {
		const importRaw = importsRaw[index]
		const path = Path.dirname(file.filePath)
		const fullPath = Path.join(path, importRaw.libraryName)
		if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))
			imports.push(fullPath)

		const tsPath = fullPath + ".ts"
		if (fs.existsSync(tsPath)) imports.push(tsPath)
		const tsxPath = fullPath + ".tsx"
		if (fs.existsSync(tsxPath)) imports.push(tsxPath)
	}

	return imports
}

export async function detectImportCycles(entryPaths: string[]) {
	const filesPathsResolved = getResolvedPaths(entryPaths)

	// get a list of sources from filesPaths
	const sources = getSources(filesPathsResolved)
	const imports = await getFilesImports(sources)
	// get a list of all import cycles
	const cycles = await getImportCycles(imports)
	// return the list of cycles
	return cycles
}

export function analyzeImportCycles(fileCycles: FileCycles[]): void {
	console.log(`Files that have cycles: ${fileCycles.length} \n`)
	fileCycles.forEach((fileCycle) => {
		console.log(
			`File: ${fileCycle.filePath} contains ${fileCycle.cycle.length} cycles`
		)
		console.log(`\n ==== \n`)
		for (let index = 0; index < fileCycle.cycle.length; index++) {
			const cycle = fileCycle.cycle[index]
			console.log(`${cycle.join(" -> ")}`)
			if (index < fileCycle.cycle.length - 1) {
				console.log(`\n ----- \n`)
			}
		}
		console.log(`\n ==== \n`)
	})
}

if (process.env.VSCODE_DEBUG) {
	async function debug_test() {
		analyzeImportCycles(
			await detectImportCycles([
				__dirname + "/../examples/types-cycles/nested-class-cycle/entry.ts",
			])
		)
	}
	debug_test()
}

