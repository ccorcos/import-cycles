import assert from "assert"
import { describe, it } from "mocha"
import {
	checkIfImportExistAtRuntime,
	FileSource,
	parseSource,
} from "./import-cycles"

async function parseDependencies(
	entryPoint: string,
	files: Record<string, string>
): Promise<Record<string, string[]>> {
	const dependencies: Record<string, string[]> = {}
	const entryPointFile = files[entryPoint]
	const entryFileSource: FileSource = {
		filePath: entryPoint,
		source: entryPointFile,
	}
	const entryFileParsed = await parseSource(entryPointFile)
	const imports = entryFileParsed.imports
	for (let i = 0; i < imports.length; i++) {
		const parserImport = imports[i]
		const importFileSource: FileSource = {
			filePath: parserImport.libraryName,
			source: files[parserImport.libraryName],
		}
		if (
			await checkIfImportExistAtRuntime(
				importFileSource,
				parserImport,
				entryFileSource.source,
				entryFileParsed
			)
		) {
			if (dependencies[entryPoint]) {
				dependencies[entryPoint].push(parserImport.libraryName)
			} else {
				dependencies[entryPoint] = [parserImport.libraryName]
			}
		}
	}
	return dependencies
}

describe("parseDependencies", () => {
	it("Parses basic dependencies", async () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				export function a() {
					return b + 1
				}
			`,
			"./b": `
				export const b = 12
			`,
		}
		assert.deepEqual(await parseDependencies("./a", files), {
			["./a"]: ["./b"],
		})
	})

	it("Ignores type imports", async () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				export function a(b: b) {}
			`,
			"./b": `
				export type b = number
			`,
		}

		assert.deepEqual(await parseDependencies("./a", files), {})
	})

	it("Ignores classes used as types", async () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				import {c} from "./c"
				export function a(b: b) {}
				export function aa() {
					return new c
				}
			`,
			"./b": `
				export class b {}
			`,
			"./c": `
				export class c {}
			`,
		}

		assert.deepEqual(await parseDependencies("./a", files), {
			["./a"]: ["./c"],
		})
	})
})
