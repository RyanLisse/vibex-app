/**
 * Architecture Refactoring Assessment System
 * Main entry point for the analysis engine
 */

export * from "./analyzers/architecture-analyzer";
// Analyzers
export * from "./analyzers/code-quality-analyzer";
export * from "./analyzers/database-analyzer";
export * from "./analyzers/dead-code-detector";
export * from "./analyzers/dependency-analyzer";
export * from "./analyzers/performance-analyzer";
export * from "./analyzers/redundancy-detector";
export * from "./core/analysis-engine";
export * from "./core/configuration";
export * from "./core/error-handler";
export * from "./core/performance-monitor";
export * from "./core/plugin-manager";
// Reporters
export * from "./reporters/report-generator";

// Services
export * from "./services/ast-parser";
export * from "./services/cache-service";
export * from "./services/file-system";
export * from "./services/logger";
export * from "./services/typescript-service";
export * from "./types";

// Utils
export * from "./utils/complexity-calculator";
