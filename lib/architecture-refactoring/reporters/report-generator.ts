/**
 * Report Generator
 * Generates comprehensive refactoring reports from analysis results
 */

import {
	AnalysisResult,
	RefactoringReport,
	ReportSummary,
	CategoryReport,
	PrioritizedRecommendation,
	MigrationPlan,
	ArchitectureDiagram,
	RefactoringMetrics,
	AnalysisCategory,
	Severity,
	Benefit,
	RiskAssessment,
	MigrationPhase,
	Resource,
} from "../types";
import { Logger } from "../services/logger";

export class ReportGenerator {
	private logger: Logger;

	constructor() {
		this.logger = new Logger("ReportGenerator");
	}

	/**
	 * Generate a comprehensive refactoring report
	 */
	async generate(
		results: AnalysisResult[],
		context: {
			performanceReport?: any;
			configuration?: any;
		}
	): Promise<RefactoringReport> {
		this.logger.info("Generating refactoring report", { resultsCount: results.length });

		const summary = this.generateSummary(results);
		const categories = this.categorizeResults(results);
		const prioritized = this.prioritizeRecommendations(results);
		const migrationPlan = this.generateMigrationPlan(results, prioritized);
		const diagrams = this.generateArchitectureDiagrams(results);
		const metrics = this.calculateMetrics(results);

		const report: RefactoringReport = {
			id: `report-${Date.now()}`,
			generatedAt: new Date(),
			summary,
			categories,
			prioritizedRecommendations: prioritized,
			migrationPlan,
			architectureDiagrams: diagrams,
			metrics,
		};

		this.logger.info("Report generated successfully", { reportId: report.id });
		return report;
	}

	/**
	 * Generate report summary
	 */
	private generateSummary(results: AnalysisResult[]): ReportSummary {
		const criticalIssues = results.filter((r) => r.severity === "critical").length;
		const totalEffort = this.calculateTotalEffort(results);
		const benefits = this.identifyBenefits(results);
		const riskAssessment = this.assessRisks(results);

		return {
			totalIssues: results.length,
			criticalIssues,
			estimatedEffort: totalEffort,
			potentialBenefits: benefits,
			riskAssessment,
		};
	}

	/**
	 * Categorize results by analysis category
	 */
	private categorizeResults(results: AnalysisResult[]): CategoryReport[] {
		const categoryMap = new Map<AnalysisCategory, AnalysisResult[]>();

		// Group by category
		for (const result of results) {
			const category = result.category;
			if (!categoryMap.has(category)) {
				categoryMap.set(category, []);
			}
			categoryMap.get(category)!.push(result);
		}

		// Create category reports
		const reports: CategoryReport[] = [];
		for (const [category, categoryResults] of categoryMap.entries()) {
			const criticalCount = categoryResults.filter((r) => r.severity === "critical").length;
			const recommendations = categoryResults.map((r) => r.recommendation);
			const estimatedEffort = this.calculateTotalEffort(categoryResults);

			reports.push({
				category,
				issueCount: categoryResults.length,
				criticalCount,
				recommendations,
				estimatedEffort,
			});
		}

		return reports.sort((a, b) => b.criticalCount - a.criticalCount);
	}

	/**
	 * Prioritize recommendations based on impact and effort
	 */
	private prioritizeRecommendations(results: AnalysisResult[]): PrioritizedRecommendation[] {
		const prioritized: PrioritizedRecommendation[] = [];

		for (const result of results) {
			const roi = this.calculateROI(result);
			const priority = this.calculatePriority(result, roi);

			prioritized.push({
				priority,
				result,
				rationale: this.generateRationale(result, roi),
				dependencies: result.recommendation.dependencies,
				estimatedROI: roi,
			});
		}

		// Sort by priority (lower number = higher priority)
		return prioritized.sort((a, b) => a.priority - b.priority);
	}

	/**
	 * Generate migration plan
	 */
	private generateMigrationPlan(
		results: AnalysisResult[],
		prioritized: PrioritizedRecommendation[]
	): MigrationPlan {
		const phases = this.createMigrationPhases(prioritized);
		const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
		const requiredResources = this.calculateRequiredResources(phases);

		return {
			phases,
			totalDuration,
			requiredResources,
			rollbackStrategy: this.generateRollbackStrategy(),
		};
	}

	/**
	 * Generate architecture diagrams
	 */
	private generateArchitectureDiagrams(results: AnalysisResult[]): ArchitectureDiagram[] {
		const diagrams: ArchitectureDiagram[] = [];

		// Current architecture overview
		diagrams.push({
			name: "Current Architecture",
			type: "current",
			format: "mermaid",
			content: this.generateCurrentArchitectureDiagram(),
			description: "Current system architecture with identified issues",
		});

		// Proposed architecture
		diagrams.push({
			name: "Proposed Architecture",
			type: "proposed",
			format: "mermaid",
			content: this.generateProposedArchitectureDiagram(results),
			description: "Recommended architecture after refactoring",
		});

		// Dependency graph
		diagrams.push({
			name: "Dependency Analysis",
			type: "current",
			format: "mermaid",
			content: this.generateDependencyDiagram(results),
			description: "Current dependency structure and issues",
		});

		return diagrams;
	}

	/**
	 * Calculate metrics
	 */
	private calculateMetrics(results: AnalysisResult[]): RefactoringMetrics {
		const typeIssues = results.filter((r) => r.category === "type-safety").length;
		const qualityIssues = results.filter((r) => r.category === "code-quality").length;
		const performanceIssues = results.filter((r) => r.category === "performance").length;
		const securityIssues = results.filter((r) => r.category === "security").length;

		return {
			codeQuality: {
				typeScriptCoverage: 100 - typeIssues * 2, // Rough estimate
				testCoverage: 0, // Would need actual test coverage data
				lintErrors: qualityIssues,
				codeSmells: qualityIssues,
				technicalDebt: this.calculateTechnicalDebt(results),
			},
			performance: {
				bundleSize: this.calculateBundleSizeImpact(results),
				buildTime: 0, // Would need actual build time data
				startupTime: 0, // Would need actual startup time data
				memoryUsage: 0, // Would need actual memory usage data
			},
			maintainability: {
				cyclomaticComplexity: this.calculateAverageComplexity(results),
				cognitiveComplexity: 0, // Would need actual cognitive complexity data
				duplicationRatio: this.calculateDuplicationRatio(results),
				modularity: this.calculateModularityScore(results),
			},
			security: {
				vulnerabilities: securityIssues,
				criticalVulnerabilities: results.filter(
					(r) => r.category === "security" && r.severity === "critical"
				).length,
				securityScore: 100 - securityIssues * 5,
				complianceIssues: 0, // Would need compliance analysis
			},
		};
	}

	/**
	 * Calculate total effort
	 */
	private calculateTotalEffort(results: AnalysisResult[]): any {
		const totalHours = results.reduce((sum, r) => sum + r.effort.hours, 0);
		const maxComplexity = results.reduce((max, r) => {
			const complexityValues = {
				trivial: 1,
				simple: 2,
				moderate: 3,
				complex: 4,
				"very-complex": 5,
			};
			return Math.max(max, complexityValues[r.effort.complexity] || 0);
		}, 0);

		const complexityMap = ["", "trivial", "simple", "moderate", "complex", "very-complex"];

		return {
			hours: totalHours,
			complexity: complexityMap[maxComplexity] as any,
			requiresExpertise: results.some((r) => r.effort.requiresExpertise),
			automationPossible: results.some((r) => r.effort.automationPossible),
		};
	}

	/**
	 * Identify benefits
	 */
	private identifyBenefits(results: AnalysisResult[]): Benefit[] {
		const benefitMap = new Map<string, { count: number; impact: number }>();

		for (const result of results) {
			const category = result.category;
			const impact = this.getImpactScore(result.impact);

			if (!benefitMap.has(category)) {
				benefitMap.set(category, { count: 0, impact: 0 });
			}

			const benefit = benefitMap.get(category)!;
			benefit.count++;
			benefit.impact += impact;
		}

		const benefits: Benefit[] = [];
		for (const [category, data] of benefitMap.entries()) {
			benefits.push({
				category,
				description: this.getBenefitDescription(category, data.count),
				metric: `${data.count} issues resolved`,
				expectedImprovement: this.getExpectedImprovement(category, data.impact),
			});
		}

		return benefits.sort((a, b) => b.expectedImprovement.localeCompare(a.expectedImprovement));
	}

	/**
	 * Assess risks
	 */
	private assessRisks(results: AnalysisResult[]): RiskAssessment {
		const riskFactors = [];
		let overallRisk: "low" | "medium" | "high" = "low";

		// Check for high-risk changes
		const highRiskCount = results.filter((r) =>
			r.recommendation.risks.some((risk) => risk.level === "high")
		).length;

		if (highRiskCount > 10) {
			overallRisk = "high";
			riskFactors.push({
				area: "Refactoring Scope",
				level: "high",
				description: `${highRiskCount} high-risk changes identified`,
			});
		} else if (highRiskCount > 5) {
			overallRisk = "medium";
			riskFactors.push({
				area: "Refactoring Scope",
				level: "medium",
				description: `${highRiskCount} high-risk changes identified`,
			});
		}

		// Check for architectural changes
		const archChanges = results.filter((r) => r.category === "architecture").length;
		if (archChanges > 0) {
			riskFactors.push({
				area: "Architecture",
				level: archChanges > 5 ? "high" : "medium",
				description: `${archChanges} architectural changes required`,
			});
		}

		// Mitigation strategies
		const mitigationStrategies = [
			"Implement changes incrementally with thorough testing",
			"Create comprehensive test suite before refactoring",
			"Use feature flags for gradual rollout",
			"Maintain detailed documentation of changes",
			"Establish rollback procedures for each phase",
		];

		return {
			overallRisk,
			riskFactors,
			mitigationStrategies,
		};
	}

	/**
	 * Calculate ROI (Return on Investment)
	 */
	private calculateROI(result: AnalysisResult): number {
		const impactScore = this.getImpactScore(result.impact);
		const effortScore = this.getEffortScore(result.effort);

		// ROI = (Benefit - Cost) / Cost
		// Higher impact and lower effort = higher ROI
		return (impactScore * 100) / (effortScore + 1);
	}

	/**
	 * Calculate priority
	 */
	private calculatePriority(result: AnalysisResult, roi: number): number {
		const severityWeights = {
			critical: 1,
			high: 2,
			medium: 3,
			low: 4,
		};

		const severityScore = severityWeights[result.severity];

		// Lower priority number = higher priority
		// Factor in both severity and ROI
		return severityScore * 10 - roi;
	}

	/**
	 * Generate rationale for prioritization
	 */
	private generateRationale(result: AnalysisResult, roi: number): string {
		const severity = result.severity;
		const category = result.category;
		const roiLevel = roi > 100 ? "high" : roi > 50 ? "medium" : "low";

		return `${severity} severity ${category} issue with ${roiLevel} ROI. ${result.impact.estimatedBenefit}`;
	}

	/**
	 * Create migration phases
	 */
	private createMigrationPhases(prioritized: PrioritizedRecommendation[]): MigrationPhase[] {
		const phases: MigrationPhase[] = [];

		// Phase 1: Critical fixes and low-hanging fruit
		const phase1Items = prioritized.filter(
			(p) =>
				p.result.severity === "critical" ||
				p.result.effort.complexity === "trivial" ||
				p.result.effort.complexity === "simple"
		);

		if (phase1Items.length > 0) {
			phases.push({
				name: "Phase 1: Critical Fixes & Quick Wins",
				description: "Address critical issues and implement easy improvements",
				tasks: phase1Items.map((p) => p.result.message),
				duration: Math.ceil(phase1Items.reduce((sum, p) => sum + p.result.effort.hours, 0) / 40), // Convert hours to days
				dependencies: [],
				risks: this.extractPhaseRisks(phase1Items),
			});
		}

		// Phase 2: Medium complexity improvements
		const phase2Items = prioritized.filter(
			(p) => p.result.effort.complexity === "moderate" && p.result.severity !== "critical"
		);

		if (phase2Items.length > 0) {
			phases.push({
				name: "Phase 2: Core Improvements",
				description: "Implement moderate complexity improvements",
				tasks: phase2Items.map((p) => p.result.message),
				duration: Math.ceil(phase2Items.reduce((sum, p) => sum + p.result.effort.hours, 0) / 40),
				dependencies: phase1Items.length > 0 ? ["Phase 1"] : [],
				risks: this.extractPhaseRisks(phase2Items),
			});
		}

		// Phase 3: Complex refactoring
		const phase3Items = prioritized.filter(
			(p) =>
				p.result.effort.complexity === "complex" || p.result.effort.complexity === "very-complex"
		);

		if (phase3Items.length > 0) {
			phases.push({
				name: "Phase 3: Major Refactoring",
				description: "Implement complex architectural changes",
				tasks: phase3Items.map((p) => p.result.message),
				duration: Math.ceil(phase3Items.reduce((sum, p) => sum + p.result.effort.hours, 0) / 40),
				dependencies: phases.map((p) => p.name),
				risks: this.extractPhaseRisks(phase3Items),
			});
		}

		return phases;
	}

	/**
	 * Calculate required resources
	 */
	private calculateRequiredResources(phases: MigrationPhase[]): Resource[] {
		const resources: Resource[] = [];
		const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

		// Calculate based on complexity
		const hasComplexWork = phases.some((phase) =>
			phase.risks.some((risk) => risk.level === "high")
		);

		resources.push({
			type: "developer",
			count: hasComplexWork ? 3 : 2,
			skillLevel: "senior",
			duration: totalDuration,
		});

		if (hasComplexWork) {
			resources.push({
				type: "architect",
				count: 1,
				skillLevel: "expert",
				duration: Math.ceil(totalDuration / 2),
			});
		}

		resources.push({
			type: "qa",
			count: 1,
			skillLevel: "mid",
			duration: totalDuration,
		});

		return resources;
	}

	/**
	 * Extract risks for a phase
	 */
	private extractPhaseRisks(items: PrioritizedRecommendation[]): any[] {
		const riskMap = new Map<string, any>();

		for (const item of items) {
			for (const risk of item.result.recommendation.risks) {
				const key = `${risk.level}-${risk.description}`;
				if (!riskMap.has(key)) {
					riskMap.set(key, risk);
				}
			}
		}

		return Array.from(riskMap.values())
			.sort((a, b) => {
				const levels = { high: 0, medium: 1, low: 2 };
				return levels[a.level as keyof typeof levels] - levels[b.level as keyof typeof levels];
			})
			.slice(0, 3); // Top 3 risks
	}

	/**
	 * Generate rollback strategy
	 */
	private generateRollbackStrategy(): string {
		return `
1. Version Control: Ensure all changes are committed with clear messages
2. Feature Flags: Use feature flags to control new functionality
3. Database Backups: Create backups before schema changes
4. Deployment Stages: Deploy to staging environment first
5. Monitoring: Set up alerts for error rates and performance metrics
6. Rollback Procedure: 
   - Revert git commits in reverse order
   - Restore database from backup if needed
   - Disable feature flags
   - Deploy previous stable version
7. Communication: Notify team and stakeholders of rollback
    `.trim();
	}

	/**
	 * Get impact score
	 */
	private getImpactScore(impact: any): number {
		const scores = {
			critical: 10,
			high: 8,
			medium: 5,
			low: 3,
			minimal: 1,
		};

		let totalScore = 0;
		totalScore += scores[impact.performance as keyof typeof scores] || 0;
		totalScore += scores[impact.maintainability as keyof typeof scores] || 0;
		totalScore += scores[impact.security as keyof typeof scores] || 0;

		return totalScore;
	}

	/**
	 * Get effort score
	 */
	private getEffortScore(effort: any): number {
		const complexityScores = {
			trivial: 1,
			simple: 2,
			moderate: 5,
			complex: 10,
			"very-complex": 20,
		};

		let score = effort.hours / 8; // Convert to days
		score *= complexityScores[effort.complexity as keyof typeof complexityScores] || 1;

		if (effort.requiresExpertise) score *= 1.5;
		if (!effort.automationPossible) score *= 1.2;

		return score;
	}

	/**
	 * Get benefit description
	 */
	private getBenefitDescription(category: string, count: number): string {
		const descriptions: Record<string, string> = {
			"type-safety": `Improve type safety by resolving ${count} type-related issues`,
			"code-quality": `Enhance code quality by fixing ${count} quality issues`,
			"dead-code": `Reduce codebase size by removing ${count} instances of dead code`,
			performance: `Optimize performance by addressing ${count} performance issues`,
			architecture: `Improve system architecture by implementing ${count} architectural changes`,
			security: `Enhance security by fixing ${count} security vulnerabilities`,
		};

		return descriptions[category] || `Address ${count} ${category} issues`;
	}

	/**
	 * Get expected improvement
	 */
	private getExpectedImprovement(category: string, impactScore: number): string {
		if (impactScore > 50) return "50%+ improvement";
		if (impactScore > 30) return "30-50% improvement";
		if (impactScore > 10) return "10-30% improvement";
		return "5-10% improvement";
	}

	/**
	 * Generate current architecture diagram
	 */
	private generateCurrentArchitectureDiagram(): string {
		return `
graph TB
    subgraph "Frontend"
        UI[UI Components]
        STATE[State Management]
    end
    
    subgraph "Backend"
        API[API Layer]
        BL[Business Logic]
    end
    
    subgraph "Data"
        DB[(Database)]
        CACHE[(Cache)]
    end
    
    UI --> STATE
    STATE --> API
    API --> BL
    BL --> DB
    BL --> CACHE
    
    style UI fill:#ff9999
    style BL fill:#ffff99
    style DB fill:#99ff99
`;
	}

	/**
	 * Generate proposed architecture diagram
	 */
	private generateProposedArchitectureDiagram(results: AnalysisResult[]): string {
		return `
graph TB
    subgraph "Frontend Layer"
        UI[Clean UI Components]
        HOOKS[Custom Hooks]
        STORE[Optimized State]
    end
    
    subgraph "Application Layer"
        API[RESTful API]
        GQL[GraphQL Gateway]
        MW[Middleware]
    end
    
    subgraph "Domain Layer"
        SVC[Domain Services]
        REPO[Repositories]
        EVT[Event Bus]
    end
    
    subgraph "Infrastructure"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        Q[Message Queue]
    end
    
    UI --> HOOKS
    HOOKS --> STORE
    STORE --> API
    STORE --> GQL
    API --> MW
    GQL --> MW
    MW --> SVC
    SVC --> REPO
    SVC --> EVT
    REPO --> DB
    SVC --> REDIS
    EVT --> Q
    
    style UI fill:#99ff99
    style SVC fill:#99ff99
    style DB fill:#99ff99
`;
	}

	/**
	 * Generate dependency diagram
	 */
	private generateDependencyDiagram(results: AnalysisResult[]): string {
		return `
graph LR
    subgraph "Core Dependencies"
        REACT[React]
        NEXT[Next.js]
        TS[TypeScript]
    end
    
    subgraph "State Management"
        REDUX[Redux]
        ZUSTAND[Zustand]
    end
    
    subgraph "Data Fetching"
        AXIOS[Axios]
        SWR[SWR]
        QUERY[React Query]
    end
    
    subgraph "Utilities"
        LODASH[Lodash]
        MOMENT[Moment.js]
        UTILS[Custom Utils]
    end
    
    NEXT --> REACT
    REACT --> TS
    REDUX --> REACT
    ZUSTAND --> REACT
    AXIOS --> TS
    SWR --> REACT
    QUERY --> REACT
    LODASH --> TS
    MOMENT --> TS
    UTILS --> TS
    
    style MOMENT fill:#ff9999
    style LODASH fill:#ffff99
`;
	}

	/**
	 * Calculate technical debt
	 */
	private calculateTechnicalDebt(results: AnalysisResult[]): number {
		return results.reduce((sum, result) => sum + result.effort.hours, 0);
	}

	/**
	 * Calculate bundle size impact
	 */
	private calculateBundleSizeImpact(results: AnalysisResult[]): number {
		return results.reduce((sum, result) => sum + (result.impact.bundleSize || 0), 0);
	}

	/**
	 * Calculate average complexity
	 */
	private calculateAverageComplexity(results: AnalysisResult[]): number {
		const complexityResults = results.filter(
			(r) => r.metadata && r.metadata.metrics && r.metadata.metrics.cyclomaticComplexity
		);

		if (complexityResults.length === 0) return 0;

		const totalComplexity = complexityResults.reduce(
			(sum, r) => sum + r.metadata.metrics.cyclomaticComplexity,
			0
		);

		return totalComplexity / complexityResults.length;
	}

	/**
	 * Calculate duplication ratio
	 */
	private calculateDuplicationRatio(results: AnalysisResult[]): number {
		const duplicationResults = results.filter((r) => r.category === "dead-code");
		return (duplicationResults.length / results.length) * 100;
	}

	/**
	 * Calculate modularity score
	 */
	private calculateModularityScore(results: AnalysisResult[]): number {
		const archResults = results.filter((r) => r.category === "architecture");
		// Simple scoring: 100 - (architectural issues * 5)
		return Math.max(0, 100 - archResults.length * 5);
	}
}
