import assert from "assert"
import { describe, it } from "mocha"

// TODO: implement this.
const exportIsClass: any = {}

describe("exportIsClass", () => {
	it("works", () => {
		assert.equal(exportIsClass("x", "export type x = number"), false)
		assert.equal(exportIsClass("x", "export interface x {}"), false)
		assert.equal(exportIsClass("x", "export const x = 1"), false)
		assert.equal(exportIsClass("x", "export class x {}"), true)
	})
})
