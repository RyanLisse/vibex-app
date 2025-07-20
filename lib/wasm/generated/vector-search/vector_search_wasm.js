// Stub for vector search WASM module
const vectorSearchWasm = {
	memory: new WebAssembly.Memory({ initial: 1 }),
	search: () => {
		throw new Error("WASM module not built");
	},
	index: () => {
		throw new Error("WASM module not built");
	},
	delete: () => {
		throw new Error("WASM module not built");
	},
	getStats: () => {
		throw new Error("WASM module not built");
	},
};

export default vectorSearchWasm;
