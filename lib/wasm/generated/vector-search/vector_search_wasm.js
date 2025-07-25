// Stub for vector search WASM module
// eslint-disable-next-line import/no-anonymous-default-export
export default {
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
