import { getFilesImports } from "./parser"
import { FileCycles, Dependency, DependencyMap } from "./types"
import { resolvePath, getSource, getAllKeys, arrayContains } from "./utils"

function readDependency(
	fileCycle: FileCycles,
	currentDependency: Dependency,
	currentDependencyPath: string
) {
	if (currentDependency.cycleDetected.length) {
		for (
			let index = 0;
			index < currentDependency.cycleDetected.length;
			index++
		) {
			const cycle = currentDependency.cycleDetected[index]
			fileCycle.cycle.push([
				...currentDependency.dependents,
				currentDependencyPath,
				cycle,
			])
		}
		return
	}
	for (const [
		dependencyPath,
		dependency,
	] of currentDependency.dependencies.entries()) {
		if (dependency) {
			readDependency(fileCycle, dependency, dependencyPath)
		}
	}
}
export async function getImportCycles(
	dependencyMap: DependencyMap
): Promise<FileCycles[]> {
	const filesCycles: FileCycles[] = []
	dependencyMap.forEach((dependency, currentDependencyPath) => {
		const fileCycle: FileCycles = {
			filePath: resolvePath(currentDependencyPath),
			cycle: [],
		}
		readDependency(
			fileCycle,
			(dependency as unknown) as Dependency,
			currentDependencyPath
		)
		if (fileCycle.cycle.length > 0) {
			filesCycles.push(fileCycle)
		}
	})
	return filesCycles
}

async function getSubDependencyMap(entryPath: string): Promise<DependencyMap> {
	const entrySource = getSource(entryPath)
	const imports = await getFilesImports([entrySource])
	const importsArray = imports[0].imports
	const subDependencyMap: DependencyMap = new Map()
	for (let index = 0; index < importsArray.length; index++) {
		const element = importsArray[index]
		subDependencyMap.set(element, null)
	}
	return subDependencyMap
}

export async function fillDependencyMap(
	entryPaths: string[],
	dependencyMapPointer: DependencyMap,
	dependents: string[] = []
): Promise<void> {
	for (let index = 0; index < entryPaths.length; index++) {
		const entryPath = entryPaths[index]
		const subDependencyMap = await getSubDependencyMap(entryPath)
		const dependencies = getAllKeys(subDependencyMap)
		const currentDependency: Dependency = {
			dependencies: subDependencyMap,
			dependents,
			cycleDetected: [],
		}
		dependencyMapPointer.set(entryPath, currentDependency)
		if (dependencies.length) {
			for (let index = 0; index < dependencies.length; index++) {
				const dependency = dependencies[index]
				if (arrayContains(dependents, dependency)) {
					currentDependency.cycleDetected.push(dependency)
				}
			}
			dependencyMapPointer.set(entryPath, currentDependency)
			if (currentDependency.cycleDetected.length) {
				// remove all cycles from dependencies
				for (
					let index = 0;
					index < currentDependency.cycleDetected.length;
					index++
				) {
					const cycle = currentDependency.cycleDetected[index]
					const indexOfCycle = dependencies.indexOf(cycle)
					if (indexOfCycle !== -1) {
						dependencies.splice(indexOfCycle, 1)
					}
				}
			}
			const newDependents = [...dependents, ...entryPaths] as string[]
			await fillDependencyMap(
				dependencies,
				(dependencyMapPointer.get(entryPath)
					?.dependencies as unknown) as DependencyMap,
				newDependents
			)
		}
	}
}
