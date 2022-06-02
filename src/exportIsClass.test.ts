import assert from "assert"
import { describe, it } from "mocha"
import { isAClassExport, parseSource } from "./import-cycles"

describe("exportIsClass", () => {
	it("type", async () => {
		const declaration = (await parseSource("export type x = number"))
			.declarations[0]
		assert.equal(isAClassExport(declaration), false)
	})
	it("interface", async () => {
		const declaration = (await parseSource("export interface x {}"))
			.declarations[0]
		assert.equal(isAClassExport(declaration), false)
	})
	it("class", async () => {
		const declaration = (await parseSource("export class x {}")).declarations[0]
		assert.equal(isAClassExport(declaration), true)
	})
	it("var", async () => {
		const declaration = (await parseSource("export const x = 1"))
			.declarations[0]
		assert.equal(isAClassExport(declaration), false)
	})
})
