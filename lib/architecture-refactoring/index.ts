/**
 * Architecture Refactoring Assessment System
 * Main entry point for the analysis engine
 */

export * from "./types";
export * from "./core/analysis-engine";
export * from "./core/plugin-manager";
export * from "./core/configuration";
export * from "./core/error-handler";
export * from "./core/performance-monitor";

// Analyzers
export * from "./analyzers/code-quality-analyzer";
export * from "./analyzers/dead-code-detector";
export * from "./analyzers/redundancy-detector";
export * from "./analyzers/performance-analyzer";
export * from "./analyzers/architecture-analyzer";
export * from "./analyzers/dependency-analyzer";
export * from "./analyzers/database-analyzer";

// Services
export * from "./services/ast-parser";
export * from "./services/typescript-service";
export * from "./services/file-system";
export * from "./services/cache-service";
export * from "./services/logger";

// Reporters
export * from "./reporters/report-generator";

// Utils
export * from "./utils/complexity-calculator";
