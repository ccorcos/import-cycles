import test from "ava"
import { parseImportStatement } from "../src/index"

test(`import x from "a"`, (t) => {
	t.deepEqual(parseImportStatement(`import x from "a"`), {
		str: `import x from "a"`,
		type: false,
		star: false,
		default: true,
		named: [],
		path: "a",
	})
})

test(`import * as x from "a"`, (t) => {
	t.deepEqual(parseImportStatement(`import * as x from "a"`), {
		str: `import * as x from "a"`,
		type: false,
		star: true,
		default: false,
		named: [],
		path: "a",
	})
})

test(`import {x, y} from "a"`, (t) => {
	t.deepEqual(parseImportStatement(`import {x, y} from "a"`), {
		str: `import {x, y} from "a"`,
		type: false,
		star: false,
		default: false,
		named: ["x", "y"],
		path: "a",
	})
})

test(`import {x as y} from "a"`, (t) => {
	t.deepEqual(parseImportStatement(`import {x as y} from "a"`), {
		str: `import {x as y} from "a"`,
		type: false,
		star: false,
		default: false,
		named: ["x"],
		path: "a",
	})
})

test(`import type {x, y} from "./a"`, (t) => {
	t.deepEqual(parseImportStatement(`import type {x, y} from "./a"`), {
		str: `import type {x, y} from "./a"`,
		type: true,
		star: false,
		default: false,
		named: ["x", "y"],
		path: "./a",
	})
})

test(`import x, {y} from "a"`, (t) => {
	t.deepEqual(parseImportStatement(`import x, {y} from "a"`), {
		str: `import x, {y} from "a"`,
		type: false,
		star: false,
		default: true,
		named: ["y"],
		path: "a",
	})
})
