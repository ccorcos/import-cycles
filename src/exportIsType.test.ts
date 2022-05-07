import assert from "assert"
import { describe, it } from "mocha"

// TODO: implement this.
const exportIsType: any = {}

describe("exportIsType", () => {
	it("works", () => {
		assert.equal(exportIsType("x", "export type x = number"), true)
		assert.equal(exportIsType("x", "export interface x {}"), true)
		assert.equal(exportIsType("x", "export const x = 1"), false)
		assert.equal(exportIsType("x", "export class x {}"), false)
	})
})
