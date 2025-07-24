/**
 * Complexity reducer utilities
 * Breaks down high-complexity functions into smaller, manageable pieces
 */

/**
 * Generic processor interface for breaking down complex operations
 */
export interface Processor<TInput, TOutput> {
	process(input: TInput): TOutput;
	validate?(input: TInput): boolean;
	transform?(input: TInput): TInput;
}

/**
 * Pipeline processor for chaining operations
 */
export class ProcessorPipeline<T> {
	private processors: Processor<T, T>[] = [];

	add(processor: Processor<T, T>): this {
		this.processors.push(processor);
		return this;
	}

	process(input: T): T {
		return this.processors.reduce((current, processor) => {
			// Validate input if validator exists
			if (processor.validate && !processor.validate(current)) {
				throw new Error(`Validation failed for processor: ${processor.constructor.name}`);
			}

			// Transform input if transformer exists
			const transformed = processor.transform ? processor.transform(current) : current;

			// Process the transformed input
			return processor.process(transformed);
		}, input);
	}
}

/**
 * Strategy pattern for handling different processing strategies
 */
export class StrategyProcessor<TInput, TOutput> {
	private strategies = new Map<string, Processor<TInput, TOutput>>();
	private defaultStrategy?: Processor<TInput, TOutput>;

	addStrategy(key: string, processor: Processor<TInput, TOutput>): this {
		this.strategies.set(key, processor);
		return this;
	}

	setDefault(processor: Processor<TInput, TOutput>): this {
		this.defaultStrategy = processor;
		return this;
	}

	process(input: TInput, strategyKey?: string): TOutput {
		const strategy = strategyKey ? this.strategies.get(strategyKey) : this.defaultStrategy;

		if (!strategy) {
			throw new Error(`No strategy found for key: ${strategyKey || "default"}`);
		}

		return strategy.process(input);
	}
}

/**
 * Command pattern for breaking down complex operations
 */
export interface Command<T = void> {
	execute(): T;
	undo?(): void;
	canExecute?(): boolean;
}

export class CommandProcessor {
	private commands: Command[] = [];
	private executedCommands: Command[] = [];

	add(command: Command): this {
		this.commands.push(command);
		return this;
	}

	execute(): void {
		for (const command of this.commands) {
			if (command.canExecute && !command.canExecute()) {
				continue;
			}

			command.execute();
			this.executedCommands.push(command);
		}
	}

	undo(): void {
		for (let i = this.executedCommands.length - 1; i >= 0; i--) {
			const command = this.executedCommands[i];
			if (command.undo) {
				command.undo();
			}
		}
		this.executedCommands = [];
	}
}

/**
 * State machine for managing complex state transitions
 */
export interface StateTransition<TState, TEvent> {
	from: TState;
	to: TState;
	event: TEvent;
	guard?: (state: TState, event: TEvent) => boolean;
	action?: (state: TState, event: TEvent) => void;
}

export class StateMachine<TState, TEvent> {
	private transitions: StateTransition<TState, TEvent>[] = [];
	private currentState: TState;

	constructor(initialState: TState) {
		this.currentState = initialState;
	}

	addTransition(transition: StateTransition<TState, TEvent>): this {
		this.transitions.push(transition);
		return this;
	}

	trigger(event: TEvent): boolean {
		const transition = this.transitions.find(
			(t) =>
				t.from === this.currentState &&
				t.event === event &&
				(!t.guard || t.guard(this.currentState, event))
		);

		if (!transition) {
			return false;
		}

		if (transition.action) {
			transition.action(this.currentState, event);
		}

		this.currentState = transition.to;
		return true;
	}

	getCurrentState(): TState {
		return this.currentState;
	}
}

/**
 * Factory pattern for creating processors based on type
 */
export class ProcessorFactory<TInput, TOutput> {
	private creators = new Map<string, () => Processor<TInput, TOutput>>();

	register(type: string, creator: () => Processor<TInput, TOutput>): this {
		this.creators.set(type, creator);
		return this;
	}

	create(type: string): Processor<TInput, TOutput> {
		const creator = this.creators.get(type);
		if (!creator) {
			throw new Error(`No processor creator found for type: ${type}`);
		}
		return creator();
	}

	getAvailableTypes(): string[] {
		return Array.from(this.creators.keys());
	}
}

/**
 * Utility for breaking down large arrays into smaller chunks
 */
export const processInChunks = async <T, R>(
	items: T[],
	chunkSize: number,
	processor: (chunk: T[]) => Promise<R[]>
): Promise<R[]> => {
	const results: R[] = [];

	for (let i = 0; i < items.length; i += chunkSize) {
		const chunk = items.slice(i, i + chunkSize);
		const chunkResults = await processor(chunk);
		results.push(...chunkResults);
	}

	return results;
};

/**
 * Utility for retry logic with exponential backoff
 */
export const withRetry = async <T>(
	operation: () => Promise<T>,
	maxRetries = 3,
	baseDelay = 1000
): Promise<T> => {
	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxRetries) {
				break;
			}

			const delay = baseDelay * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
};
