import assert from "assert"
import { describe, it } from "mocha"
import { parseSource } from "../parser"

interface formattedImport {
	default?: boolean
	named?: string[]
	path: string
	type?: boolean
	star?: boolean
}
const parseImports = async (source: string) => {
	const parsedSource = await parseSource(source)
	const formattedImports: formattedImport[] = []
	parsedSource.imports.forEach((parsedImport: any) => {
		const formattedImport: formattedImport = { path: parsedImport.libraryName }
		if (parsedImport.defaultAlias) {
			formattedImport.default = true
		}
		if (source.substring(parsedImport.start, parsedImport.end).includes("*")) {
			formattedImport.star = true
		} else {
			if (
				source.substring(parsedImport.start, parsedImport.end).includes("type")
			) {
				formattedImport.type = true
			}
			if (parsedImport.specifiers?.length > 0) {
				formattedImport.named = parsedImport.specifiers.map(
					(specifier: any) => {
						return specifier.specifier
					}
				)
			}
		}
		if (parsedImport.type) formattedImport.type = true

		formattedImports.push(formattedImport)
	})
	return formattedImports
}

describe("parseImports", () => {
	it("works", async () => {
		const imports = await parseImports(`
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
