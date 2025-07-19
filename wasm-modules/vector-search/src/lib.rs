use wasm_bindgen::prelude::*;
use web_sys::console;

#[cfg(feature = "simd")]
use packed_simd::f32x4;

// Macro for logging in development
macro_rules! log {
    ($($t:tt)*) => {
        #[cfg(debug_assertions)]
        console::log_1(&format!($($t)*).into());
    };
}

#[wasm_bindgen]
pub struct VectorSearch {
    dimensions: usize,
}

#[wasm_bindgen]
impl VectorSearch {
    #[wasm_bindgen(constructor)]
    pub fn new(dimensions: usize) -> Self {
        log!("VectorSearch initialized with {} dimensions", dimensions);
        Self { dimensions }
    }

    /// Calculate cosine similarity between two vectors
    #[wasm_bindgen(js_name = "cosineSimilarity")]
    pub fn cosine_similarity(&self, vec1: &[f64], vec2: &[f64]) -> f64 {
        if vec1.len() != vec2.len() || vec1.len() != self.dimensions {
            panic!("Vector dimensions mismatch");
        }

        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        for i in 0..vec1.len() {
            dot_product += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        let magnitude = (norm1.sqrt()) * (norm2.sqrt());
        if magnitude == 0.0 {
            0.0
        } else {
            dot_product / magnitude
        }
    }

    /// Calculate cosine similarity with SIMD optimization (for f32 vectors)
    #[wasm_bindgen(js_name = "cosineSimilaritySIMD")]
    pub fn cosine_similarity_simd(&self, vec1: &[f32], vec2: &[f32]) -> f32 {
        #[cfg(feature = "simd")]
        {
            if vec1.len() != vec2.len() || vec1.len() != self.dimensions {
                panic!("Vector dimensions mismatch");
            }

            let mut dot_product = 0.0f32;
            let mut norm1 = 0.0f32;
            let mut norm2 = 0.0f32;

            // Process 4 elements at a time using SIMD
            let chunks = vec1.len() / 4;
            for i in 0..chunks {
                let idx = i * 4;
                let a = f32x4::from_slice_unaligned(&vec1[idx..idx + 4]);
                let b = f32x4::from_slice_unaligned(&vec2[idx..idx + 4]);

                dot_product += (a * b).sum();
                norm1 += (a * a).sum();
                norm2 += (b * b).sum();
            }

            // Handle remaining elements
            for i in (chunks * 4)..vec1.len() {
                dot_product += vec1[i] * vec2[i];
                norm1 += vec1[i] * vec1[i];
                norm2 += vec2[i] * vec2[i];
            }

            let magnitude = norm1.sqrt() * norm2.sqrt();
            if magnitude == 0.0 {
                0.0
            } else {
                dot_product / magnitude
            }
        }

        #[cfg(not(feature = "simd"))]
        {
            self.cosine_similarity_f32(vec1, vec2)
        }
    }

    /// Calculate euclidean distance between two vectors
    #[wasm_bindgen(js_name = "euclideanDistance")]
    pub fn euclidean_distance(&self, vec1: &[f64], vec2: &[f64]) -> f64 {
        if vec1.len() != vec2.len() || vec1.len() != self.dimensions {
            panic!("Vector dimensions mismatch");
        }

        let mut sum = 0.0;
        for i in 0..vec1.len() {
            let diff = vec1[i] - vec2[i];
            sum += diff * diff;
        }

        sum.sqrt()
    }

    /// Calculate dot product of two vectors
    #[wasm_bindgen(js_name = "dotProduct")]
    pub fn dot_product(&self, vec1: &[f64], vec2: &[f64]) -> f64 {
        if vec1.len() != vec2.len() || vec1.len() != self.dimensions {
            panic!("Vector dimensions mismatch");
        }

        let mut product = 0.0;
        for i in 0..vec1.len() {
            product += vec1[i] * vec2[i];
        }

        product
    }

    /// Normalize a vector
    #[wasm_bindgen(js_name = "normalizeVector")]
    pub fn normalize_vector(&self, vec: &mut [f64]) {
        if vec.len() != self.dimensions {
            panic!("Vector dimension mismatch");
        }

        let mut magnitude = 0.0;
        for val in vec.iter() {
            magnitude += val * val;
        }
        magnitude = magnitude.sqrt();

        if magnitude > 0.0 {
            for val in vec.iter_mut() {
                *val /= magnitude;
            }
        }
    }

    /// Batch calculate similarities for multiple vectors
    #[wasm_bindgen(js_name = "batchCosineSimilarity")]
    pub fn batch_cosine_similarity(
        &self,
        query: &[f64],
        vectors: &[f64],
        count: usize,
    ) -> Vec<f64> {
        if query.len() != self.dimensions {
            panic!("Query vector dimension mismatch");
        }

        if vectors.len() != count * self.dimensions {
            panic!("Vectors array size mismatch");
        }

        let mut similarities = Vec::with_capacity(count);

        for i in 0..count {
            let start = i * self.dimensions;
            let end = start + self.dimensions;
            let vec = &vectors[start..end];
            similarities.push(self.cosine_similarity(query, vec));
        }

        similarities
    }

    /// Find top K most similar vectors
    #[wasm_bindgen(js_name = "findTopK")]
    pub fn find_top_k(
        &self,
        query: &[f64],
        vectors: &[f64],
        count: usize,
        k: usize,
    ) -> Vec<usize> {
        let similarities = self.batch_cosine_similarity(query, vectors, count);

        // Create indices paired with similarities
        let mut indexed_similarities: Vec<(usize, f64)> = similarities
            .into_iter()
            .enumerate()
            .collect();

        // Sort by similarity (descending)
        indexed_similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        // Return top K indices
        indexed_similarities
            .into_iter()
            .take(k)
            .map(|(idx, _)| idx)
            .collect()
    }

    // Internal helper for f32 cosine similarity without SIMD
    fn cosine_similarity_f32(&self, vec1: &[f32], vec2: &[f32]) -> f32 {
        let mut dot_product = 0.0;
        let mut norm1 = 0.0;
        let mut norm2 = 0.0;

        for i in 0..vec1.len() {
            dot_product += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        let magnitude = norm1.sqrt() * norm2.sqrt();
        if magnitude == 0.0 {
            0.0
        } else {
            dot_product / magnitude
        }
    }
}

/// Performance benchmarking utilities
#[wasm_bindgen]
pub struct VectorBenchmark;

#[wasm_bindgen]
impl VectorBenchmark {
    /// Benchmark vector operations
    #[wasm_bindgen(js_name = "benchmarkOperations")]
    pub fn benchmark_operations(dimensions: usize, iterations: usize) -> String {
        let search = VectorSearch::new(dimensions);
        
        // Generate test vectors
        let vec1: Vec<f64> = (0..dimensions).map(|i| (i as f64).sin()).collect();
        let vec2: Vec<f64> = (0..dimensions).map(|i| (i as f64).cos()).collect();

        // Benchmark cosine similarity
        let start = js_sys::Date::now();
        for _ in 0..iterations {
            search.cosine_similarity(&vec1, &vec2);
        }
        let cosine_time = js_sys::Date::now() - start;

        // Benchmark euclidean distance
        let start = js_sys::Date::now();
        for _ in 0..iterations {
            search.euclidean_distance(&vec1, &vec2);
        }
        let euclidean_time = js_sys::Date::now() - start;

        // Benchmark dot product
        let start = js_sys::Date::now();
        for _ in 0..iterations {
            search.dot_product(&vec1, &vec2);
        }
        let dot_time = js_sys::Date::now() - start;

        format!(
            "Dimensions: {}, Iterations: {}\nCosine: {:.2}ms\nEuclidean: {:.2}ms\nDot Product: {:.2}ms",
            dimensions, iterations, cosine_time, euclidean_time, dot_time
        )
    }

    /// Benchmark SIMD operations
    #[wasm_bindgen(js_name = "benchmarkSIMD")]
    pub fn benchmark_simd(dimensions: usize, iterations: usize) -> String {
        let search = VectorSearch::new(dimensions);
        
        // Generate test vectors (f32 for SIMD)
        let vec1: Vec<f32> = (0..dimensions).map(|i| (i as f32).sin()).collect();
        let vec2: Vec<f32> = (0..dimensions).map(|i| (i as f32).cos()).collect();

        let start = js_sys::Date::now();
        for _ in 0..iterations {
            search.cosine_similarity_simd(&vec1, &vec2);
        }
        let simd_time = js_sys::Date::now() - start;

        // Compare with non-SIMD
        let vec1_f64: Vec<f64> = vec1.iter().map(|&x| x as f64).collect();
        let vec2_f64: Vec<f64> = vec2.iter().map(|&x| x as f64).collect();

        let start = js_sys::Date::now();
        for _ in 0..iterations {
            search.cosine_similarity(&vec1_f64, &vec2_f64);
        }
        let regular_time = js_sys::Date::now() - start;

        let speedup = regular_time / simd_time;

        format!(
            "SIMD: {:.2}ms, Regular: {:.2}ms, Speedup: {:.2}x",
            simd_time, regular_time, speedup
        )
    }
}

/// Memory utilities for direct buffer access
#[wasm_bindgen]
pub struct MemoryUtils;

#[wasm_bindgen]
impl MemoryUtils {
    /// Allocate memory for a vector
    #[wasm_bindgen(js_name = "allocateFloat64Array")]
    pub fn allocate_float64_array(size: usize) -> *mut f64 {
        let mut vec = vec![0.0f64; size];
        let ptr = vec.as_mut_ptr();
        std::mem::forget(vec);
        ptr
    }

    /// Free allocated memory
    #[wasm_bindgen(js_name = "freeFloat64Array")]
    pub fn free_float64_array(ptr: *mut f64, size: usize) {
        unsafe {
            Vec::from_raw_parts(ptr, size, size);
        }
    }

    /// Get memory buffer size
    #[wasm_bindgen(js_name = "getMemorySize")]
    pub fn get_memory_size() -> usize {
        wasm_bindgen::memory().buffer().byte_length() as usize
    }
}

// Initialize module
#[wasm_bindgen(start)]
pub fn init() {
    // Set panic hook for better error messages
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    log!("Vector Search WASM Module initialized");
}