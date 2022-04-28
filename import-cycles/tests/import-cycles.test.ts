import assert from "assert";
import { detectImportCycles } from "../src/import-cycles";
describe("Multiple cycle", async function () {
  const importCycles = await detectImportCycles([
    __dirname + "/../../examples/multiple-cycles/entry.ts",
    __dirname + "/../../examples/multiple-cycles/entry2.ts",
  ]);
  it("should have 2 files that have cycles", async function () {
    console.log(importCycles);
    assert.equal(importCycles.length, 2);
  });
  it("entry.ts should have x cycles", async function () {
    assert.equal(importCycles[0].cycle.length, 3);
  });
  it("entry2.ts should have x cycles", async function () {
    assert.equal(importCycles[1].cycle.length, 1);
  });
});

describe("No cycle", async function () {
  it("should have 0 cycles", async function () {
    const importCycles = await detectImportCycles([
      __dirname + "/../../examples/no-cycles/entry.ts",
    ]);
    assert.equal(importCycles.length, 0);
  });
});
