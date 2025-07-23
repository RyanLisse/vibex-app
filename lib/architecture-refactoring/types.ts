/**
 * Core types for the Architecture Refactoring Assessment System
 */

export type AnalysisType =
  | 'code-quality'
  | 'dead-code'
  | 'redundancy'
  | 'performance'
  | 'architecture'
  | 'dependency'
  | 'database'
  | 'security';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type ImpactLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

export type RecommendationType =
  | 'refactor'
  | 'remove'
  | 'optimize'
  | 'consolidate'
  | 'modernize'
  | 'security-fix';

export interface AnalysisConfig {
  targetPaths: string[];
  excludePatterns: string[];
  analysisTypes: AnalysisType[];
  strictMode: boolean;
  performanceThresholds: PerformanceThresholds;
  concurrencyLimit?: number;
  outputFormat?: 'json' | 'html' | 'markdown';
}

export interface PerformanceThresholds {
  maxAnalysisTime: number; // milliseconds
  maxMemoryUsage: number; // bytes
  maxFileSize: number; // bytes
  concurrencyLimit: number;
}

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  analysisType: AnalysisType;
  severity: Severity;
  category: AnalysisCategory;
  file: string;
  line?: number;
  column?: number;
  message: string;
  recommendation: Recommendation;
  impact: ImpactAssessment;
  effort: EffortEstimate;
  metadata: Record<string, unknown>;
}

export type AnalysisCategory =
  | 'type-safety'
  | 'code-complexity'
  | 'dead-code'
  | 'duplication'
  | 'performance'
  | 'architecture'
  | 'security'
  | 'bundle-size'
  | 'database'
  | 'testing';

export interface Recommendation {
  type: RecommendationType;
  description: string;
  codeExample?: CodeExample;
  automatable: boolean;
  dependencies: string[];
  risks: Risk[];
}

export interface CodeExample {
  before: string;
  after: string;
  language: string;
  explanation?: string;
}

export interface Risk {
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface ImpactAssessment {
  performance: ImpactLevel;
  maintainability: ImpactLevel;
  security: ImpactLevel;
  bundleSize: number; // bytes
  estimatedBenefit: string;
}

export interface EffortEstimate {
  hours: number;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex';
  requiresExpertise: boolean;
  automationPossible: boolean;
}

export interface RefactoringReport {
  id: string;
  generatedAt: Date;
  summary: ReportSummary;
  categories: CategoryReport[];
  prioritizedRecommendations: PrioritizedRecommendation[];
  migrationPlan: MigrationPlan;
  architectureDiagrams: ArchitectureDiagram[];
  metrics: RefactoringMetrics;
}

export interface ReportSummary {
  totalIssues: number;
  criticalIssues: number;
  estimatedEffort: EffortEstimate;
  potentialBenefits: Benefit[];
  riskAssessment: RiskAssessment;
}

export interface Benefit {
  category: string;
  description: string;
  metric: string;
  expectedImprovement: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  area: string;
  level: 'low' | 'medium' | 'high';
  description: string;
}

export interface CategoryReport {
  category: AnalysisCategory;
  issueCount: number;
  criticalCount: number;
  recommendations: Recommendation[];
  estimatedEffort: EffortEstimate;
}

export interface PrioritizedRecommendation {
  priority: number;
  result: AnalysisResult;
  rationale: string;
  dependencies: string[];
  estimatedROI: number; // Return on Investment score
}

export interface MigrationPlan {
  phases: MigrationPhase[];
  totalDuration: number; // days
  requiredResources: Resource[];
  rollbackStrategy: string;
}

export interface MigrationPhase {
  name: string;
  description: string;
  tasks: string[];
  duration: number; // days
  dependencies: string[];
  risks: Risk[];
}

export interface Resource {
  type: 'developer' | 'qa' | 'devops' | 'architect';
  count: number;
  skillLevel: 'junior' | 'mid' | 'senior' | 'expert';
  duration: number; // days
}

export interface ArchitectureDiagram {
  name: string;
  type: 'current' | 'proposed' | 'comparison';
  format: 'mermaid' | 'svg' | 'png';
  content: string;
  description: string;
}

export interface RefactoringMetrics {
  codeQuality: QualityMetrics;
  performance: PerformanceMetrics;
  maintainability: MaintainabilityMetrics;
  security: SecurityMetrics;
}

export interface QualityMetrics {
  typeScriptCoverage: number; // percentage
  testCoverage: number; // percentage
  lintErrors: number;
  codeSmells: number;
  technicalDebt: number; // hours
}

export interface PerformanceMetrics {
  bundleSize: number; // bytes
  buildTime: number; // seconds
  startupTime: number; // milliseconds
  memoryUsage: number; // bytes
}

export interface MaintainabilityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  duplicationRatio: number; // percentage
  modularity: number; // 0-100 score
}

export interface SecurityMetrics {
  vulnerabilities: number;
  criticalVulnerabilities: number;
  securityScore: number; // 0-100
  complianceIssues: number;
}

// Analysis Engine Interfaces
export interface AnalysisEngine {
  analyzeCodebase(config: AnalysisConfig): Promise<AnalysisResult[]>;
  generateReport(results: AnalysisResult[]): Promise<RefactoringReport>;
  validateRecommendations(recommendations: Recommendation[]): Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

// Plugin System
export interface AnalysisPlugin {
  name: string;
  version: string;
  analyze(context: AnalysisContext): Promise<PluginResult>;
  configure(config: PluginConfig): void;
  validate(input: unknown): ValidationResult;
}

export interface AnalysisContext {
  config: AnalysisConfig;
  fileSystem: FileSystemInterface;
  astParser: ASTParserInterface;
  typeChecker: TypeCheckerInterface;
  logger: LoggerInterface;
  cache: CacheInterface;
}

export interface PluginResult {
  pluginName: string;
  results: AnalysisResult[];
  errors: Error[];
  warnings: string[];
  metrics: Record<string, unknown>;
}

export interface PluginConfig {
  enabled: boolean;
  options: Record<string, unknown>;
}

// File System Interface
export interface FileSystemInterface {
  readFile(path: string): Promise<string>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStat>;
  exists(path: string): Promise<boolean>;
  glob(pattern: string): Promise<string[]>;
}

export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

// AST Parser Interface
export interface ASTParserInterface {
  parseFile(filePath: string, content: string): Promise<AST>;
  traverse(ast: AST, visitor: ASTVisitor): void;
  getNodeType(node: ASTNode): string;
}

export interface AST {
  root: ASTNode;
  filePath: string;
  language: string;
}

export interface ASTNode {
  type: string;
  start: Position;
  end: Position;
  children: ASTNode[];
  value?: unknown;
}

export interface Position {
  line: number;
  column: number;
}

export interface ASTVisitor {
  [nodeType: string]: (node: ASTNode, parent?: ASTNode) => void;
}

// TypeScript Type Checker Interface
export interface TypeCheckerInterface {
  getTypeAtLocation(node: ASTNode): TypeInfo;
  getSymbolAtLocation(node: ASTNode): SymbolInfo;
  getDiagnostics(filePath: string): Diagnostic[];
}

export interface TypeInfo {
  name: string;
  flags: number;
  isNullable: boolean;
  isOptional: boolean;
}

export interface SymbolInfo {
  name: string;
  kind: string;
  declarations: Declaration[];
}

export interface Declaration {
  filePath: string;
  line: number;
  column: number;
}

export interface Diagnostic {
  file: string;
  start: Position;
  end: Position;
  message: string;
  category: 'error' | 'warning' | 'suggestion';
  code: number;
}

// Logger Interface
export interface LoggerInterface {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void;
}

// Cache Interface
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Error Handling
export interface AnalysisError extends Error {
  code: string;
  context: ErrorContext;
  recoverable: boolean;
}

export interface ErrorContext {
  file?: string;
  line?: number;
  column?: number;
  analysisType?: AnalysisType;
  metadata?: Record<string, unknown>;
}

export interface RecoveryAction {
  type: 'continue' | 'skip' | 'retry' | 'abort';
  message: string;
  fallbackStrategy?: string;
  impactOnResults: string;
}

// Performance Monitoring
export interface PerformanceMonitor {
  startTimer(operation: string): Timer;
  recordMemoryUsage(checkpoint: string): MemorySnapshot;
  trackFileProcessing(file: string, duration: number): void;
  generatePerformanceReport(): PerformanceReport;
}

export interface Timer {
  stop(): number; // returns duration in milliseconds
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  timestamp: Date;
}

export interface PerformanceReport {
  totalDuration: number;
  fileProcessingTimes: Map<string, number>;
  memoryUsage: MemorySnapshot[];
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  operation: string;
  duration: number;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}