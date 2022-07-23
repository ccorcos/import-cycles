export type Imports = string[]

export type FileImports = { filePath: string; imports: Imports }

export type Cycle = string[]

export type FileCycles = { filePath: string; cycle: Cycle[] }

export type FileSource = { filePath: string; source: string }

export interface Dependency {
	dependencies: DependencyMap
	dependents: string[]
	cycleDetected: string[]
}
export type DependencyMap = Map<string, Dependency | null>
