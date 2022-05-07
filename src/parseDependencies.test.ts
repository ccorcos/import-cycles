import assert from "assert"
import { describe, it } from "mocha"

// TODO: implement this.
const parseDependencies: any = {}

describe("parseDependencies", () => {
	it("Parses basic dependencies", () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				export function a() {
					return b + 1
				}
			`,
			"./b": `
				export const b = 12
			`,
		}
		const readFile = (filePath: string) => files[filePath]
		assert.equal(parseDependencies("./a", readFile), {
			["./a"]: ["./b"],
		})
	})

	it("Ignores type imports", () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				export function a(b: b) {}
			`,
			"./b": `
				export type b = number
			`,
		}
		const readFile = (filePath: string) => files[filePath]

		assert.equal(parseDependencies("./a", readFile), {})
	})

	it("Ignores classes used as types", () => {
		const files: Record<string, string> = {
			"./a": `
				import {b} from "./b"
				import {c} from "./c"
				export function a(b: b) {}
				export function aa() {
					return new c
				}
			`,
			"./b": `
				export class b {}
			`,
			"./c": `
				export class c {}
			`,
		}
		const readFile = (filePath: string) => files[filePath]

		assert.equal(parseDependencies("./a", readFile), {
			["./a"]: ["./c"],
		})
	})
})
