import assert from "assert"
import { describe, it } from "mocha"
import { checkIfImportExistAtRuntime, FileSource, parseSource } from "./import-cycles";

async function classIsUsedAsValue(classSource: string,entrySource:string): Promise<boolean> {
	const entryFileSource:FileSource = {
		filePath: "x",
		source: entrySource,
	}
	const sourceFileParsed = await parseSource(entrySource);
	const imports = sourceFileParsed.imports;
	for (let i = 0; i < imports.length; i++) {
		const parserImport = imports[i];
		const importFileSource:FileSource = {
			filePath: parserImport.libraryName,
			source: classSource,
		}
		if(await checkIfImportExistAtRuntime(importFileSource,parserImport,entryFileSource.source,sourceFileParsed)){
			return true
		}
	}
	return false
}

describe("classIsUsedAsValue", () => {
	const prefix = `import {x} from "x"\n`

	it("Used as a type",async () => {
		assert.equal(await classIsUsedAsValue("export class x{}", prefix + "type a = [x]"), false)
	})

	it("Used as a generic type",async () => {
		assert.equal(
			await classIsUsedAsValue("export class x{}", prefix + "type a<b extends x> = [b]"),
			false
		)
	})

	it("Used as a class extension",async () => {
		assert.equal(await classIsUsedAsValue("export class x{}", prefix + "class a extends x {}"), true)
	})

	it("Constructed with new",async () => {
		assert.equal(await classIsUsedAsValue("export class x{}", prefix + "const a = new x()"), true)
	})

	it("Instanceof comparison",async () => {
		assert.equal(
			await classIsUsedAsValue("export class x{}", prefix + "const a = b instanceof x"),
			true
		)
	})

	it("Assign value",async () => {
		assert.equal(await classIsUsedAsValue("export class x{}", prefix + "const a = x"), true)
	})

	it("Accessing property",async () => {
		assert.equal(
			await classIsUsedAsValue("export class x{}", prefix + "const a = x.prototype"),
			true
		)
	})
})
