/*

	./node_modules/.bin/ts-node ./src/tools/parseImports.ts

*/

import * as fs from "fs"
import {
	countBy,
	flatten,
	isEqual,
	minBy,
	sortBy,
	uniq,
	uniqWith,
} from "lodash"
import * as path from "path"
import * as util from "util"

/*

Supported import syntaxes:
import x from "a"
import * as x from "a"
import {x, y} from "a"
import type {x, y} from "a"
import x, {y} from "a"

*/

type ImportStatement = {
	str: string
	type: boolean
	star: boolean
	default: boolean
	named: string[]
	path: string
}

type DependencyMap = { [filePath: string]: string[] }

type ImportChain = string[]

export function parseImportStatement(str: string): ImportStatement | undefined {
	const match = str.match(/^import ([^"]+)"([^"]+)"/m)
	if (!match) return

	// match examples:
	//
	// import x from "a"
	// -> [`import x from "a"`, `x from `, `a`]
	//
	// import * as x from "a"
	// -> [`import * as x from "a"`, `* as x from `, `a`]
	//
	// import {x, y} from "a"
	// -> [`import {x, y} from "a"`, `{x, y} from `, `a`]
	//
	// import {x as y} from "a"
	// -> [`import {x as y} from "a"`, `{x as y} from `, `a`]
	//
	// import type {x, y} from "a"
	// -> [`import {x, y} from "a"`, `type {x, y} from `, `a`]
	//
	// import x, {y} from "a"
	// -> [`import x, {y} from "a"`, `x, {y} from `, `a`]
	//

	let [importStatement, middlePart, importPath] = match

	// It's totally possible to match "import " from inside a comment
	// or some kind of string or something so we want to make sure the
	// middle part is correct.

	// middlePart examples:
	//
	// `x from `
	// `* as x from `
	// `{x, y} from `
	// `{x as y} from `
	// `type {x, y} from `
	// `x, {y} from `
	//
	if (!middlePart.endsWith("from ")) return

	// Get rid of the "from".
	middlePart = middlePart.slice(0, -"from ".length).trim()

	// Detect detect if it's a type import.
	const importType = middlePart.startsWith("type ")
	if (importType) middlePart = middlePart.slice("type ".length).trim()

	// Now we're looking at one of these:
	//
	// `x`
	// `* as x`
	// `{x as y}`
	// `{x, y}`
	// `x, {y}`
	//

	const importStar = middlePart.startsWith("* as ")
	const importDefault = Boolean(
		middlePart.match(/^[^ ]+$/) || middlePart.match(/^[^ ]+, \{/)
	)

	const importNamed: string[] = []

	const braceStart = middlePart.indexOf("{")
	const braceEnd = middlePart.indexOf("}")

	if (braceStart !== -1) {
		if (braceEnd === -1) throw new Error("Invalid middlePart: " + middlePart)
		importNamed.push(
			...middlePart
				.slice(braceStart + 1, braceEnd)
				.split(",")
				.map((expression) => expression.split(" as ")[0].trim())
		)
	}

	if (!importStar && !importDefault && importNamed.length === 0)
		throw new Error("Invalid import body: " + importStatement)

	const statement: ImportStatement = {
		str: importStatement,
		type: importType,
		star: importStar,
		default: importDefault,
		named: importNamed,
		path: importPath,
	}
	return statement
}

export function parseImportStatements(fileContents: string) {
	const importStatements: ImportStatement[] = []

	// Remove commented lines.
	fileContents = fileContents
		.split("\n")
		.filter((line) => !line.startsWith("//"))
		.join("\n")

	// Go character by character looking for imports.
	let i = 0
	while (i < fileContents.length) {
		const importStatement = parseImportStatement(fileContents.slice(i))
		if (!importStatement) {
			i++
			continue
		}
		importStatements.push(importStatement)
		i += importStatement.str.length
	}

	return importStatements
}

export function parseFileDependencies(filePath: string) {
	const fileContents = fs.readFileSync(filePath, "utf8")
	const importStatements = parseImportStatements(fileContents)

	const dependencies: string[] = []
	for (const importStatement of importStatements) {
		// Ignore type imports because they compile away.
		if (importStatement.type) continue

		// Ignore external package imports because they can't cause circular dependencies.
		if (!importStatement.path.startsWith(".")) continue

		// Resolve to an absolute path.
		const importPath = resolveImportPath(filePath, importStatement.path)

		// `import *` and `import <default>` will not import types and compile away.
		if (importStatement.star || importStatement.default) {
			dependencies.push(importPath)
			continue
		}

		// For named imports, we need to determine if those are actually types getting imported.
		const importFileContents = fs.readFileSync(importPath, "utf8")

		namedImportsLoop: for (const importName of importStatement.named) {
			// Ignore type exports.
			if (importFileContents.includes("export type " + importName + " "))
				continue
			if (importFileContents.includes("export type " + importName + "<"))
				continue
			if (importFileContents.includes("export interface " + importName + " "))
				continue
			if (importFileContents.includes("export interface " + importName + "<"))
				continue

			// If it's a class export, then we need to check if its used as a type or a value to
			// determine if the import will get compiled away.
			const isClassImport =
				importFileContents.includes("export class " + importName + " ") ||
				importFileContents.includes("export class " + importName + "<")
			if (!isClassImport) {
				dependencies.push(importPath)
				break namedImportsLoop
			}

			// Check if it's used as a value in the original file.
			const classIsUsedAsValue =
				fileContents.includes("instanceof " + importName) ||
				fileContents.includes("new " + importName)

			if (classIsUsedAsValue) {
				dependencies.push(importPath)
				break namedImportsLoop
			}

			// Let's warn if we're importing a class as a type without explicit `import type` syntax.
			console.warn(
				"Class used as type without `import type` declaration:",
				filePath,
				importName
			)
		}
	}

	return dependencies
}

function resolveImportPath(filePath: string, relativePath: string) {
	const importPath = path.resolve(path.parse(filePath).dir, relativePath)

	if (importPath.endsWith(".ts") || importPath.endsWith(".tsx"))
		return importPath

	// Resolve to a .ts or .tsx file.
	// TODO: may one day have to resolve to index.ts files too.
	const tsPath = importPath + ".ts"
	if (fs.existsSync(tsPath)) return tsPath
	const tsxPath = importPath + ".tsx"
	if (fs.existsSync(tsxPath)) return tsxPath

	throw new Error("Could not resolve: " + importPath)
}

function traverseFileImports(entryPaths: string[]) {
	const dependencyMap: DependencyMap = {}
	const queue: string[] = []

	queue.push(...entryPaths)

	while (queue.length) {
		const filePath = queue.pop()!
		if (filePath in dependencyMap) continue

		const dependencies = parseFileDependencies(filePath)
		dependencyMap[filePath] = dependencies
		queue.push(...dependencies)
	}

	return dependencyMap
}

type PrettyPath = (filePath: string) => string

function prettyDependencies(deps: DependencyMap, prettyPath: PrettyPath) {
	const prettyDeps: DependencyMap = {}
	for (const [key, value] of Object.entries(deps)) {
		prettyDeps[prettyPath(key)] = value.map(prettyPath)
	}
	return prettyDeps
}

function* traverseImportChain(
	dependencies: DependencyMap,
	chain: ImportChain
): IterableIterator<ImportChain> {
	if (chain.length === 0) throw new Error()

	const last = chain[chain.length - 1]
	const importPaths = dependencies[last]

	if (!importPaths) {
		yield chain
		return
	}

	for (const importPath of importPaths) {
		if (chain.includes(importPath)) {
			// If we've found a cycle, maybe a sub-cycle.
			yield [...chain, importPath]
			return
		}

		// Recursively expand the import chain.
		yield* traverseImportChain(dependencies, [...chain, importPath])
	}
}

function* iterateImportChains(deps: DependencyMap) {
	for (const filePath of Object.keys(deps)) {
		yield* traverseImportChain(deps, [filePath])
	}
}

function* iterateUniqueImportChains(deps: DependencyMap) {
	const seen = new Set<string>()

	for (const chain of iterateImportChains(deps)) {
		const key = chain.join("|")
		if (seen.has(key)) continue

		seen.add(key)
		yield chain
	}
}

function findCycles(deps: DependencyMap) {
	const cycles: ImportChain[] = []
	const subcycles: ImportChain[] = []
	const terminated: ImportChain[] = []

	for (const chain of iterateUniqueImportChains(deps)) {
		if (chain[0] === chain[chain.length - 1]) {
			// console.log("CYCLE:", chain)
			cycles.push(chain)
		} else if (chain.slice(0, -1).includes(chain[chain.length - 1])) {
			// console.log("SUBCYCLE:", chain)
			subcycles.push(chain)
		} else {
			// console.log("TERMINATED:", chain)
			terminated.push(chain)
		}
	}

	return { cycles, subcycles, terminated }
}

function log(obj: any) {
	util.inspect.defaultOptions.maxArrayLength = null
	console.log(util.inspect(obj, false, 999))
}

export function detectImportCycles(
	entryPaths: string[],
	prettyPath: PrettyPath
) {
	let deps = traverseFileImports(entryPaths)
	deps = prettyDependencies(deps, prettyPath)
	const { cycles, subcycles, terminated } = findCycles(deps)
	return { deps, cycles, subcycles, terminated }
}

export function analyzeImportCycles(cycles: ImportChain[]) {
	// Rank files based on how often they're involved in a cycle.
	const counts = countBy(flatten(cycles))
	const rankedCycleFiles = sortBy(Object.entries(counts), (x) => x[1])

	for (const cycle of cycles) {
		console.log("CYCLE:", cycle)
	}

	console.log(rankedCycleFiles)
	console.log("TOTAL NUMBER OF CYCLES: ", cycles.length)
}

// Not sure if this is exactly useful yet...
export function analyzeShortestChainsTilCycle(args: {
	entryPaths: string[]
	prettyPath: PrettyPath
	cycles: ImportChain[]
	subcycles: ImportChain[]
}) {
	const { cycles, subcycles, entryPaths, prettyPath } = args

	const cycleFiles = uniq(flatten(cycles))

	for (const entryPath of entryPaths) {
		const entryChains = subcycles.filter(
			(chain) => chain[0] === prettyPath(entryPath)
		)

		const entryChainsTilFirstCycleFile = entryChains.map((chain) => {
			const entryChainUpToCycleFiles = cycleFiles
				.map((cycleFile) => {
					const i = chain.indexOf(cycleFile)
					if (i === -1) return
					return chain.slice(0, i + 1)
				})
				.filter(isDefined)
			const entryChainTilFirstCycleFile = minBy(
				entryChainUpToCycleFiles,
				(chain) => chain.length
			)!
			return entryChainTilFirstCycleFile
		})

		const shortestChainsTilCycleFile: {
			[cycleFile: string]: ImportChain[]
		} = {}

		for (const cycleFile of cycleFiles) {
			const entryChainsToCycleFile = uniqWith(
				entryChainsTilFirstCycleFile.filter(
					(chain) => chain[chain.length - 1] === cycleFile
				),
				isEqual
			)

			const sorted = sortBy(entryChainsToCycleFile, (chain) => chain.length)

			const [first, ...rest] = sorted
			const shortestChains: ImportChain[] = []
			if (first) shortestChains.push(first)
			for (const chain of rest) {
				if (chain.length === first.length) {
					shortestChains.push(chain)
				} else {
					break
				}
			}
			shortestChainsTilCycleFile[cycleFile] = shortestChains
		}

		console.log("ShortestChainsTilCycle:")
		log(shortestChainsTilCycleFile)
	}
}

function isDefined<T>(obj: T | undefined): obj is T {
	if (obj === undefined) {
		return false
	} else {
		return true
	}
}
