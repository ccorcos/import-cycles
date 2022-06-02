import assert from "assert"
import { describe, it } from "mocha"
import * as path from "path"
import { detectImportCycles } from "./import-cycles"
import fs from "fs";
function examplePath(subPath: string) {
	return path.join(__dirname, "../examples", subPath)
}

describe("Multiple cycle", async function () {
	const importCycles = await detectImportCycles([
		examplePath("multiple-cycles/entry.ts"),
		examplePath("multiple-cycles/entry2.ts"),
	])
	it("should have 2 files that have cycles", async function () {
		assert.equal(importCycles.length, 2)
	})
	it("entry.ts should have 3 cycles", async function () {
		assert.equal(importCycles[0].cycle.length, 3)
	})
	it("entry2.ts should have 1 cycles", async function () {
		assert.equal(importCycles[1].cycle.length, 1)
	})
})

function getTempFolderPath():string{
	return path.join(__dirname, "../temp")
}

function setupTempFolder(folderPath:string){
	if(fs.existsSync(folderPath)){
		fs.rmdirSync(folderPath, {recursive: true})
	}
	fs.mkdirSync(folderPath)
}

function createFiles(files:Record<string,string>){
	const folderPath = getTempFolderPath()
	setupTempFolder(folderPath)
	for(const fileName in files){
		const filePath = path.join(folderPath, fileName)
		fs.writeFileSync(filePath, files[fileName])
	}
}

describe("Files without cycles", async function () {
	const test1Files: Record<string, string> = {
		"entry.ts": `
		import { a } from './file2';
		import fs from "fs"; // only to be sure that it do not detect node internal modules
	`,
	"file2.ts": `
		import fs from "fs"; // only to be sure that it do not detect node internal modules

		export function a(){}
	`
	}
	createFiles(test1Files)
	it("should have 0 cycles", async function () {
		const importCycles = await detectImportCycles([
			getTempFolderPath() + "/entry.ts",
		])
		assert.equal(importCycles.length, 0)
	})
})

describe("Types cycle", async function () {
	it("should have 0 cycles", async function () {
		const importCycles = await detectImportCycles([
			examplePath("types-cycles/no-cycles/entry.ts"),
		])
		assert.equal(importCycles.length, 0)
	})

	it("should have 1 cycle due to a class declaration", async function () {
		const importCycles = await detectImportCycles([
			examplePath("types-cycles/class-cycle/entry.ts"),
		])
		assert.equal(importCycles.length, 1)
		assert.equal(importCycles[0].cycle.length, 1)
	})

	it("should have 1 cycle due to a class declaration", async function () {
		const importCycles = await detectImportCycles([
			examplePath("types-cycles/nested-class-cycle/entry.ts"),
		])
		assert.equal(importCycles.length, 1)
		assert.equal(importCycles[0].cycle.length, 1)
	})

	it("should have 1 cycle due to a class extension", async function () {
		const importCycles = await detectImportCycles([
			examplePath("types-cycles/extended-class-cycle/entry.ts"),
		])
		assert.equal(importCycles.length, 1)
		assert.equal(importCycles[0].cycle.length, 1)
	})
})
