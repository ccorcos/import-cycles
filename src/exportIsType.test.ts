import assert from "assert"
import { describe, it } from "mocha"
import { isATypeExport, parseSource } from "./import-cycles"

describe("exportIsType", () => {
	it("type", async () => {
		const declaration = (await parseSource("export type x = number")).declarations[0]
		assert.equal(isATypeExport(declaration), true)
	})
	it("interface", async () => {
		const declaration = (await parseSource("export interface x {}")).declarations[0]
		assert.equal(isATypeExport(declaration), true)
	})
	it("class", async () => {
		const declaration = (await parseSource("export class x {}")).declarations[0]
		assert.equal(isATypeExport(declaration), false)
	})
	it("var", async () => {
		const declaration = (await parseSource("export const x = 1")).declarations[0]
		assert.equal(isATypeExport(declaration), false)
	})
})
