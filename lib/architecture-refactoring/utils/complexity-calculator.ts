/**
 * Complexity Calculator
 * Calculates various complexity metrics for code
 */

import { AST, ASTNode, ComplexityMetrics } from '../types';
import { Logger } from '../services/logger';

export class ComplexityCalculator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ComplexityCalculator');
  }

  /**
   * Calculate complexity metrics for an AST
   */
  calculate(ast: AST, filePath: string): ComplexityMetrics {
    const metrics: ComplexityMetrics = {
      cyclomaticComplexity: 1, // Base complexity
      cognitiveComplexity: 0,
      linesOfCode: 0,
      maintainabilityIndex: 0,
    };

    // Calculate lines of code
    metrics.linesOfCode = this.calculateLinesOfCode(ast.root);

    // Calculate cyclomatic complexity
    metrics.cyclomaticComplexity = this.calculateCyclomaticComplexity(ast.root);

    // Calculate cognitive complexity
    metrics.cognitiveComplexity = this.calculateCognitiveComplexity(ast.root);

    // Calculate maintainability index
    metrics.maintainabilityIndex = this.calculateMaintainabilityIndex(
      metrics.cyclomaticComplexity,
      metrics.linesOfCode,
      metrics.cognitiveComplexity
    );

    this.logger.debug(`Calculated complexity for ${filePath}`, metrics);

    return metrics;
  }

  /**
   * Calculate lines of code (excluding comments and empty lines)
   */
  private calculateLinesOfCode(root: ASTNode): number {
    // In a real implementation, this would exclude comments and empty lines
    // For now, we'll use the end line of the root node
    return root.end.line;
  }

  /**
   * Calculate cyclomatic complexity
   * Counts decision points in the code
   */
  private calculateCyclomaticComplexity(node: ASTNode, complexity: number = 1): number {
    const decisionTypes = [
      'IfStatement',
      'ConditionalExpression',
      'SwitchCase',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'CatchClause',
      'LogicalExpression',
    ];

    if (decisionTypes.includes(node.type)) {
      complexity++;
      
      // Special handling for logical expressions
      if (node.type === 'LogicalExpression' && node.value === '&&' || node.value === '||') {
        complexity++;
      }
    }

    // Recursively calculate for children
    for (const child of node.children) {
      complexity = this.calculateCyclomaticComplexity(child, complexity);
    }

    return complexity;
  }

  /**
   * Calculate cognitive complexity
   * Measures how difficult code is to understand
   */
  private calculateCognitiveComplexity(node: ASTNode, depth: number = 0, complexity: number = 0): number {
    const incrementTypes = [
      'IfStatement',
      'ConditionalExpression',
      'SwitchStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'CatchClause',
    ];

    const nestingTypes = [
      'IfStatement',
      'ForStatement',
      'ForInStatement',
      'ForOfStatement',
      'WhileStatement',
      'DoWhileStatement',
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ];

    if (incrementTypes.includes(node.type)) {
      // Base increment
      complexity++;
      
      // Add nesting penalty
      complexity += depth;
      
      // Special cases
      if (node.type === 'IfStatement') {
        // Check for else-if chains
        const hasElse = node.children.some(child => child.type === 'ElseStatement');
        if (hasElse) {
          complexity++;
        }
      }
    }

    // Increase depth for nesting structures
    const newDepth = nestingTypes.includes(node.type) ? depth + 1 : depth;

    // Recursively calculate for children
    for (const child of node.children) {
      complexity = this.calculateCognitiveComplexity(child, newDepth, complexity);
    }

    return complexity;
  }

  /**
   * Calculate maintainability index
   * A composite metric that measures how maintainable the code is
   */
  private calculateMaintainabilityIndex(
    cyclomaticComplexity: number,
    linesOfCode: number,
    cognitiveComplexity: number
  ): number {
    // Simplified version of the Maintainability Index formula
    // MI = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(L)
    // Where V = Halstead Volume (we'll approximate with cognitive complexity)
    //       G = Cyclomatic Complexity
    //       L = Lines of Code

    const volume = Math.max(1, cognitiveComplexity * 10); // Approximation
    const mi = 171 - 5.2 * Math.log(volume) - 0.23 * cyclomaticComplexity - 16.2 * Math.log(linesOfCode);

    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, mi));
  }

  /**
   * Calculate complexity for a specific function
   */
  calculateFunctionComplexity(functionNode: ASTNode): ComplexityMetrics {
    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(functionNode),
      cognitiveComplexity: this.calculateCognitiveComplexity(functionNode),
      linesOfCode: functionNode.end.line - functionNode.start.line + 1,
      maintainabilityIndex: 0, // Will be calculated after
    };
  }

  /**
   * Get complexity thresholds
   */
  getComplexityThresholds(): {
    cyclomatic: { low: number; medium: number; high: number };
    cognitive: { low: number; medium: number; high: number };
    maintainability: { poor: number; moderate: number; good: number };
  } {
    return {
      cyclomatic: {
        low: 10,
        medium: 20,
        high: 30,
      },
      cognitive: {
        low: 15,
        medium: 30,
        high: 45,
      },
      maintainability: {
        poor: 20,
        moderate: 50,
        good: 80,
      },
    };
  }

  /**
   * Get complexity level
   */
  getComplexityLevel(metrics: ComplexityMetrics): {
    cyclomatic: 'low' | 'medium' | 'high' | 'very-high';
    cognitive: 'low' | 'medium' | 'high' | 'very-high';
    maintainability: 'poor' | 'moderate' | 'good' | 'excellent';
  } {
    const thresholds = this.getComplexityThresholds();

    // Cyclomatic complexity level
    let cyclomatic: 'low' | 'medium' | 'high' | 'very-high';
    if (metrics.cyclomaticComplexity <= thresholds.cyclomatic.low) {
      cyclomatic = 'low';
    } else if (metrics.cyclomaticComplexity <= thresholds.cyclomatic.medium) {
      cyclomatic = 'medium';
    } else if (metrics.cyclomaticComplexity <= thresholds.cyclomatic.high) {
      cyclomatic = 'high';
    } else {
      cyclomatic = 'very-high';
    }

    // Cognitive complexity level
    let cognitive: 'low' | 'medium' | 'high' | 'very-high';
    if (metrics.cognitiveComplexity <= thresholds.cognitive.low) {
      cognitive = 'low';
    } else if (metrics.cognitiveComplexity <= thresholds.cognitive.medium) {
      cognitive = 'medium';
    } else if (metrics.cognitiveComplexity <= thresholds.cognitive.high) {
      cognitive = 'high';
    } else {
      cognitive = 'very-high';
    }

    // Maintainability level
    let maintainability: 'poor' | 'moderate' | 'good' | 'excellent';
    if (metrics.maintainabilityIndex < thresholds.maintainability.poor) {
      maintainability = 'poor';
    } else if (metrics.maintainabilityIndex < thresholds.maintainability.moderate) {
      maintainability = 'moderate';
    } else if (metrics.maintainabilityIndex < thresholds.maintainability.good) {
      maintainability = 'good';
    } else {
      maintainability = 'excellent';
    }

    return { cyclomatic, cognitive, maintainability };
  }

  /**
   * Get recommendations based on complexity
   */
  getRecommendations(metrics: ComplexityMetrics): string[] {
    const recommendations: string[] = [];
    const levels = this.getComplexityLevel(metrics);

    if (levels.cyclomatic === 'high' || levels.cyclomatic === 'very-high') {
      recommendations.push('Consider breaking down complex functions into smaller, focused functions');
      recommendations.push('Extract complex conditional logic into separate functions');
    }

    if (levels.cognitive === 'high' || levels.cognitive === 'very-high') {
      recommendations.push('Reduce nesting levels by using early returns');
      recommendations.push('Simplify complex boolean expressions');
      recommendations.push('Consider using design patterns to reduce complexity');
    }

    if (levels.maintainability === 'poor' || levels.maintainability === 'moderate') {
      recommendations.push('Add documentation to explain complex logic');
      recommendations.push('Use meaningful variable and function names');
      recommendations.push('Consider refactoring to improve code structure');
    }

    return recommendations;
  }
}