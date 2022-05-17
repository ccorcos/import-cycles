import assert from "assert"
import { describe, it } from "mocha"
import { isATypeExport, parseSource } from "./import-cycles"

describe("exportIsType", () => {
	it("detect exported type", async () => {
		const declaration = (await parseSource("export type x = number")).declarations[0]
		assert.equal(isATypeExport(declaration), true)
	})
	it("detect exported interface", async () => {
		const declaration = (await parseSource("export interface x {}")).declarations[0]
		console.log(declaration)
		assert.equal(isATypeExport(declaration), true)
	})
	it("detect exported class", async () => {
		const declaration = (await parseSource("export class x {}")).declarations[0]
		assert.equal(isATypeExport(declaration), false)
	})
	it("detect exported var", async () => {
		const declaration = (await parseSource("export const x = 1")).declarations[0]
		assert.equal(isATypeExport(declaration), false)
	})
})
