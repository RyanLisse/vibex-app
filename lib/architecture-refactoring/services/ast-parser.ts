/**
 * AST Parser Service
 * Provides Abstract Syntax Tree parsing functionality
 */

import * as ts from 'typescript';
import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  ASTParserInterface,
  AST,
  ASTNode,
  ASTVisitor,
  Position,
} from '../types';
import { Logger } from './logger';

export class ASTParser implements ASTParserInterface {
  private logger: Logger;
  private cache: Map<string, AST> = new Map();

  constructor() {
    this.logger = new Logger('ASTParser');
  }

  async parseFile(filePath: string, content: string): Promise<AST> {
    // Check cache
    const cached = this.cache.get(filePath);
    if (cached) {
      this.logger.debug(`Using cached AST for: ${filePath}`);
      return cached;
    }

    const language = this.detectLanguage(filePath);
    let ast: AST;

    if (language === 'typescript') {
      ast = await this.parseTypeScript(filePath, content);
    } else if (language === 'javascript') {
      ast = await this.parseJavaScript(filePath, content);
    } else {
      throw new Error(`Unsupported language for file: ${filePath}`);
    }

    // Cache the result
    this.cache.set(filePath, ast);
    return ast;
  }

  traverse(ast: AST, visitor: ASTVisitor): void {
    if (ast.language === 'typescript') {
      this.traverseTypeScript(ast.root as any, visitor);
    } else if (ast.language === 'javascript') {
      this.traverseBabel(ast.root as any, visitor);
    }
  }

  getNodeType(node: ASTNode): string {
    return node.type;
  }

  /**
   * Parse TypeScript file
   */
  private async parseTypeScript(filePath: string, content: string): Promise<AST> {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    const root = this.convertTsNode(sourceFile);

    return {
      root,
      filePath,
      language: 'typescript',
    };
  }

  /**
   * Parse JavaScript file using Babel
   */
  private async parseJavaScript(filePath: string, content: string): Promise<AST> {
    try {
      const babelAst = babelParse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });

      const root = this.convertBabelNode(babelAst as any);

      return {
        root,
        filePath,
        language: 'javascript',
      };
    } catch (error) {
      this.logger.error(`Failed to parse JavaScript file: ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Convert TypeScript node to generic AST node
   */
  private convertTsNode(node: ts.Node): ASTNode {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const astNode: ASTNode = {
      type: ts.SyntaxKind[node.kind],
      start: {
        line: start.line + 1,
        column: start.character + 1,
      },
      end: {
        line: end.line + 1,
        column: end.character + 1,
      },
      children: [],
      value: this.getNodeValue(node),
    };

    // Add children
    ts.forEachChild(node, (child) => {
      astNode.children.push(this.convertTsNode(child));
    });

    return astNode;
  }

  /**
   * Convert Babel node to generic AST node
   */
  private convertBabelNode(node: any): ASTNode {
    const astNode: ASTNode = {
      type: node.type,
      start: {
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
      },
      end: {
        line: node.loc?.end.line || 0,
        column: node.loc?.end.column || 0,
      },
      children: [],
      value: node.value || node.name || undefined,
    };

    // Add children based on node type
    const childKeys = this.getBabelChildKeys(node);
    for (const key of childKeys) {
      const child = node[key];
      if (child) {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && item.type) {
              astNode.children.push(this.convertBabelNode(item));
            }
          }
        } else if (typeof child === 'object' && child.type) {
          astNode.children.push(this.convertBabelNode(child));
        }
      }
    }

    return astNode;
  }

  /**
   * Traverse TypeScript AST
   */
  private traverseTypeScript(node: ts.Node, visitor: ASTVisitor): void {
    const astNode = this.convertTsNode(node);
    const nodeType = ts.SyntaxKind[node.kind];

    // Call visitor for this node type
    if (visitor[nodeType]) {
      visitor[nodeType](astNode);
    }

    // Call generic visitor if exists
    if (visitor['*']) {
      visitor['*'](astNode);
    }

    // Traverse children
    ts.forEachChild(node, (child) => {
      this.traverseTypeScript(child, visitor);
    });
  }

  /**
   * Traverse Babel AST
   */
  private traverseBabel(ast: any, visitor: ASTVisitor): void {
    traverse(ast, {
      enter(path: any) {
        const node = path.node;
        const astNode: ASTNode = {
          type: node.type,
          start: {
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
          },
          end: {
            line: node.loc?.end.line || 0,
            column: node.loc?.end.column || 0,
          },
          children: [],
          value: node.value || node.name || undefined,
        };

        // Call visitor for this node type
        if (visitor[node.type]) {
          visitor[node.type](astNode, path.parent ? path.parent.node : undefined);
        }

        // Call generic visitor if exists
        if (visitor['*']) {
          visitor['*'](astNode, path.parent ? path.parent.node : undefined);
        }
      },
    });
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'typescript';
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      return 'javascript';
    }
    return 'unknown';
  }

  /**
   * Get node value for TypeScript node
   */
  private getNodeValue(node: ts.Node): any {
    if (ts.isIdentifier(node)) {
      return node.text;
    } else if (ts.isStringLiteral(node)) {
      return node.text;
    } else if (ts.isNumericLiteral(node)) {
      return Number(node.text);
    }
    return undefined;
  }

  /**
   * Get child keys for Babel node
   */
  private getBabelChildKeys(node: any): string[] {
    const commonKeys = [
      'body', 'declarations', 'expression', 'expressions',
      'left', 'right', 'argument', 'arguments', 'callee',
      'object', 'property', 'properties', 'elements',
      'init', 'test', 'consequent', 'alternate',
      'block', 'handler', 'finalizer', 'cases',
      'discriminant', 'param', 'params', 'id',
      'superClass', 'implements', 'decorators',
    ];

    return commonKeys.filter(key => key in node);
  }

  /**
   * Clear AST cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('AST cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; files: string[] } {
    return {
      size: this.cache.size,
      files: Array.from(this.cache.keys()),
    };
  }

  /**
   * Find nodes by type in AST
   */
  findNodesByType(ast: AST, nodeType: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    const visitor: ASTVisitor = {
      [nodeType]: (node) => {
        nodes.push(node);
      },
    };

    this.traverse(ast, visitor);
    return nodes;
  }

  /**
   * Get parent node path
   */
  getNodePath(ast: AST, targetNode: ASTNode): ASTNode[] {
    const path: ASTNode[] = [];
    
    const findPath = (node: ASTNode, currentPath: ASTNode[]): boolean => {
      if (node === targetNode) {
        path.push(...currentPath, node);
        return true;
      }

      for (const child of node.children) {
        if (findPath(child, [...currentPath, node])) {
          return true;
        }
      }

      return false;
    };

    findPath(ast.root, []);
    return path;
  }
}