import assert from "assert"
import { describe, it } from "mocha"
import * as path from "path"
import { detectImportCycles } from "./import-cycles"
import fs from "fs"

function getTempFolderPath(): string {
	return path.join(__dirname, "../temp")
}

function setupTempFolder(folderPath: string) {
	if (fs.existsSync(folderPath)) {
		fs.rmSync(folderPath, { recursive: true })
	}
	fs.mkdirSync(folderPath)
}

function createFiles(subFolderName: string, files: Record<string, string>) {
	const folderPath = getTempFolderPath()
	const subFolderPath = path.join(folderPath, subFolderName)
	fs.mkdirSync(subFolderPath)
	for (const [fileName, content] of Object.entries(files)) {
		fs.writeFileSync(path.join(subFolderPath, fileName), content)
	}
}

function getEntryFilePath(
	subFolderName: string,
	entryName: string = "entry.ts"
): string {
	return path.join(getTempFolderPath(), subFolderName, entryName)
}
setupTempFolder(getTempFolderPath())

describe("Files without cycles", async function () {
	const test1Files: Record<string, string> = {
		"entry.ts": `
		import { a } from './file2';
		import fs from "fs"; // only to be sure that it do not detect node internal modules
	`,
		"file2.ts": `
		import fs from "fs"; // only to be sure that it do not detect node internal modules

		export function a(){}
	`,
	}
	const test1FilesFolder = "test1WithoutCycles"
	createFiles(test1FilesFolder, test1Files)
	it("should detect 0 cycles since there aren't ones", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test1FilesFolder),
		])
		assert.equal(importCycles.length, 0)
	})
	const test2Files: Record<string, string> = {
		"entry.ts": `
		import { numbers } from './file2';

		const myVar:numbers = [1,2,3]
		
	`,
		"file2.ts": `
		export type numbers = number[]
	`,
	}
	const test2FilesFolder = "test2WithoutCycles"
	createFiles(test2FilesFolder, test2Files)
	it("should detect 0 cycles since there aren't ones beside a type one that we should ignore", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test2FilesFolder),
		])
		assert.equal(importCycles.length, 0)
	})
})

describe("Class cycles", async function () {
	const test1Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export const myHuman = new Human(); // use the human class as a value
	`,
		"file2.ts": `
	import {myHuman} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test1FilesFolder = "test1ClassCycles"
	createFiles(test1FilesFolder, test1Files)
	it("should detect 1 cycles since Human class is used to create an object", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test1FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})

	const test2Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export const myHuman:Human = {name:"john", age:20} // use the human class as a type
	`,
		"file2.ts": `
	import {myHuman} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}

	const test2FilesFolder = "test2ClassCycles"
	createFiles(test2FilesFolder, test2Files)
	it("should detect 0 cycles since Human class is used as a type", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test2FilesFolder),
		])
		assert.equal(importCycles.length, 0)
	})

	const test3Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function createHuman(name:string, age:number):Human{
			return new Human(name, age) // use the human class as a value inside a function
		}
	`,
		"file2.ts": `
	import {createHuman} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test3FilesFolder = "test3ClassCycles"
	createFiles(test3FilesFolder, test3Files)
	it("should detect 1 cycles since Human class is used to create an object inside a function", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test3FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})

	const test4Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function hello(name:string):string{
			return "hello " + name
		}
		class SuperHuman extends Human{ // Human class is used as a class extention
			constructor(name:string, age:number){
				super(name, age)
			}
		}
	`,
		"file2.ts": `
	import {hello} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test4FilesFolder = "test4ClassCycles"
	createFiles(test4FilesFolder, test4Files)
	it("should detect 1 cycles since Human class is used as a class extension", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test4FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})

	const test5Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function hello(name:string):string{
			return "hello " + name
		}
		class SuperHuman{
			human:Human
			constructor(name:string, age:number){
				this.name = name
				this.age = age
				this.human = new Human(name, age)
			}
		}
	`,
		"file2.ts": `
	import {hello} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test5FilesFolder = "test5ClassCycles"
	createFiles(test5FilesFolder, test5Files)
	it("should detect 1 cycles since Human class is used as a value in a property inside a class constructor", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test5FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})

	const test6Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function hello(name:string):string{
			return "hello " + name
		}
		class SuperHuman{
			human:Human // Human class is used as a type
			constructor(name:string, age:number){
				this.name = name
				this.age = age
				this.human =  {name:name, age:age}
				const human:Human = {name:name, age:age} // Human class is used as a type
			}
		}
	`,
		"file2.ts": `
	import {hello} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test6FilesFolder = "test6ClassCycles"
	createFiles(test6FilesFolder, test6Files)
	it("should detect 0 cycles since Human class is used as a type multiple time inside a class constructor", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test6FilesFolder),
		])
		assert.equal(importCycles.length, 0)
	})

	const test7Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function hello(name:string):string{
			return "hello " + name
		}
		class SuperHuman{
			constructor(name:string, age:number){
				this.name = name
				this.age = age
				const human:Human = new Human(name, age) // Human class is used as a value
			}
		}
	`,
		"file2.ts": `
	import {hello} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test7FilesFolder = "test7ClassCycles"
	createFiles(test7FilesFolder, test7Files)
	it("should detect 1 cycle since Human class is used as a value in a var inside a class constructor", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test7FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})

	const test8Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		export function hello(name:string):string{
			return "hello " + name
		}
		class SuperHuman{
			constructor(name:string, age:number){
				this.name = name
				this.age = age
			}
			createNewHuman(){
				return new Human(this.name, this.age) // Human class is used as a value
			}
		}
	`,
		"file2.ts": `
	import {hello} from './entry' // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
	}
	const test8FilesFolder = "test8ClassCycles"
	createFiles(test8FilesFolder, test8Files)
	it("should detect 1 cycle since Human class is used as a value in a method inside a class constructor", async function () {
		const importCycles = await detectImportCycles([
			getEntryFilePath(test8FilesFolder),
		])
		assert.equal(importCycles.length, 1)
	})
})

describe("Multiple cycle in multiple files", async function () {
	const test1Files: Record<string, string> = {
		"entry.ts": `
		import { Human } from './file2';
		import { dogSound } from './file3';
		export const myHuman = new Human();
	`,
		"file2.ts": `
	import {myHuman} from './entry'  // an import cycle should be detected here, if import isn't ignored
	export class Human{
		name:string
		age:number
		constructor(name:string, age:number){
			this.name = name
			this.age = age
		}
	}
	`,
		"file3.ts": `
	import {myHuman} from './entry'  // an import cycle should be detected here, if import isn't ignored
	export const dogSound = "woof"
	`,
		"entry2.ts": `
	import { Human } from './file2';  // an import cycle should be detected here, if import isn't ignored
	export const myHuman = new Human();
`,
	}
	const test1FilesFolder = "test1MultipleCycles"
	createFiles(test1FilesFolder, test1Files)
	const importCycles = detectImportCycles([
		getEntryFilePath(test1FilesFolder),
		getEntryFilePath(test1FilesFolder, "entry2.ts"),
	])
	it("should have 2 files that have cycles", async function () {
		
		assert.equal((await importCycles).length, 2)
	})
	it("entry.ts should have 2 cycles", async function () {
		assert.equal((await importCycles)[0].cycle.length, 2)
	})
	it("entry2.ts should have 1 cycles", async function () {
		assert.equal((await importCycles)[1].cycle.length, 1)
	})
})
