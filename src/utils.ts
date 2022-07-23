import Path from "path"
import { FileSource } from "./types"
import fs from "fs"

export function resolvePath(path: string): string {
	if (!path.startsWith("/")) {
		path = Path.resolve(path)
	}
	return path
}

export function getResolvedPaths(filesPaths: string[]) {
	return filesPaths.map((filePath) => resolvePath(filePath))
}

export function isATsFile(filePath: string): boolean {
	return filePath.endsWith(".ts") || filePath.endsWith(".tsx")
}

export function getSource(filePath: string): FileSource {
	return { filePath: filePath, source: fs.readFileSync(filePath, "utf8") }
}

export function checkIfContains(array: string[], element: string): boolean {
	for (let index = 0; index < array.length; index++) {
		const elementArray = array[index]
		if (elementArray === element) {
			return true
		}
	}
	return false
}

export function getAllKeys(map: Map<string, any>): string[] {
	const keys: string[] = []
	map.forEach((value, key) => {
		keys.push(key)
	})
	return keys
}

export function arrayContains(array: string[], element: string): boolean {
	for (let index = 0; index < array.length; index++) {
		const elementArray = array[index]
		if (elementArray === element) {
			return true
		}
	}
	return false
}

export function getResolvedPath(
	entryFileDirPath: string,
	libraryName: string
): string | null {
	let resolvedPath = resolvePath(`${entryFileDirPath}/${libraryName}`)
	if (!fs.existsSync(resolvedPath) || !isATsFile(resolvedPath)) {
		if (fs.existsSync(resolvedPath + ".ts")) {
			return `${resolvedPath}.ts`
		} else if (fs.existsSync(resolvedPath + ".tsx")) {
			return `${resolvedPath}.tsx`
		} else {
			return null // ignore this import
		}
	}
	return resolvedPath
}
