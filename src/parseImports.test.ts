import assert from "assert"
import { describe, it } from "mocha"

// TODO: implement this.
const parseImports: any = {}

describe("parseImports", () => {
	it("works", () => {
		const imports = parseImports(`
			import a from "a"
			import {b} from "b/b"
			import * as c from "./c"
			import {d, e} from "../d"
			import {f as g} from "g"
			import type {h} from "h"
			import i, {j} from "j"
		`)

		assert.deepEqual(imports, [
			{ default: true, path: "a" },
			{ named: ["b"], path: "b/b" },
			{ star: true, path: "./c" },
			{ named: ["d", "e"], path: "../d" },
			{ named: ["f"], path: "g" },
			{ type: true, named: ["h"], path: "h" },
			{ default: true, named: ["j"], path: "j" },
		])
	})
})
