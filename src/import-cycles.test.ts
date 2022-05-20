import assert from "assert"
import { describe, it } from "mocha"
import * as path from "path"
import { detectImportCycles } from "./import-cycles"

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

describe("No cycle", async function () {
	it("should have 0 cycles", async function () {
		const importCycles = await detectImportCycles([
			examplePath("no-cycles/entry.ts"),
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
