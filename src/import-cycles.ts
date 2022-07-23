import { fillDependencyMap, getImportCycles } from "./analysis"
import { DependencyMap, FileCycles } from "./types"
import { getResolvedPaths } from "./utils"

export async function detectImportCycles(entryPaths: string[]) {
	const filesPathsResolved = getResolvedPaths(entryPaths)
	const dependencyMap: DependencyMap = new Map()
	await fillDependencyMap(filesPathsResolved, dependencyMap)
	// get a list of all import cycles
	const cycles = await getImportCycles(dependencyMap)
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
			console.log(`${cycle.join("\n")}`)
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
				__dirname + "/../examples/test1ClassCycles/entry.ts",
			])
		)
	}
	debug_test()
}
