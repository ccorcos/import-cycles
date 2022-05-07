import assert from "assert"
import { describe, it } from "mocha"

// TODO: implement this.
const classIsUsedAsValue: any = {}

describe("classIsUsedAsValue", () => {
	const prefix = `import {x} from "x"\n`

	it("Used as a type", () => {
		assert.equal(classIsUsedAsValue("x", prefix + "type a = [x]"), false)
	})

	it("Used as a generic type", () => {
		assert.equal(
			classIsUsedAsValue("x", prefix + "type a<b extends x> = [b]"),
			false
		)
	})

	it("Used as a class extension", () => {
		assert.equal(classIsUsedAsValue("x", prefix + "class a extends x {}"), true)
	})

	it("Constructed with new", () => {
		assert.equal(classIsUsedAsValue("x", prefix + "const a = new x()"), true)
	})

	it("Instanceof comparison", () => {
		assert.equal(
			classIsUsedAsValue("x", prefix + "const a = b instanceof x"),
			true
		)
	})

	it("Assign value", () => {
		assert.equal(classIsUsedAsValue("x", prefix + "const a = x"), true)
	})

	it("Accessing property", () => {
		assert.equal(
			classIsUsedAsValue("x", prefix + "const a = x.prototype"),
			true
		)
	})
})
