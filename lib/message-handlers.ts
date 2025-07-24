// Message handling utilities and handlers

export interface Message {
	id: string;
	type: string;
	payload: any;
	timestamp: number;
	source?: string;
	target?: string;
	metadata?: Record<string, any>;
}

export interface MessageHandler {
	type: string;
	handler: (message: Message) => Promise<any> | any;
	priority?: number;
}

/**
 * Message handlers registry and processing system
 */
export class MessageHandlers {
	private handlers: Map<string, MessageHandler[]> = new Map();
	private middlewares: ((message: Message) => Promise<Message> | Message)[] = [];

	/**
	 * Register a message handler for a specific message type
	 * @param type - Message type to handle
	 * @param handler - Handler function
	 * @param priority - Handler priority (higher priority runs first)
	 */
	register(type: string, handler: MessageHandler["handler"], priority: number = 0): void {
		if (!this.handlers.has(type)) {
			this.handlers.set(type, []);
		}

		const messageHandler: MessageHandler = { type, handler, priority };
		const handlers = this.handlers.get(type)!;

		// Insert handler in priority order (highest first)
		const insertIndex = handlers.findIndex((h) => h.priority! < priority);
		if (insertIndex === -1) {
			handlers.push(messageHandler);
		} else {
			handlers.splice(insertIndex, 0, messageHandler);
		}
	}

	/**
	 * Unregister a message handler
	 * @param type - Message type
	 * @param handler - Handler function to remove
	 */
	unregister(type: string, handler: MessageHandler["handler"]): boolean {
		const handlers = this.handlers.get(type);
		if (!handlers) {
			return false;
		}

		const index = handlers.findIndex((h) => h.handler === handler);
		if (index === -1) {
			return false;
		}

		handlers.splice(index, 1);

		// Clean up empty handler arrays
		if (handlers.length === 0) {
			this.handlers.delete(type);
		}

		return true;
	}

	/**
	 * Add middleware to process messages before handlers
	 * @param middleware - Middleware function
	 */
	use(middleware: (message: Message) => Promise<Message> | Message): void {
		this.middlewares.push(middleware);
	}

	/**
	 * Process a message through registered handlers
	 * @param message - Message to process
	 * @returns Processing results from all handlers
	 */
	async handle(message: Message): Promise<any[]> {
		let processedMessage = message;

		// Apply middlewares
		for (const middleware of this.middlewares) {
			processedMessage = await middleware(processedMessage);
		}

		const handlers = this.handlers.get(processedMessage.type);
		if (!handlers || handlers.length === 0) {
			console.warn(`No handlers registered for message type: ${processedMessage.type}`);
			return [];
		}

		// Execute all handlers for this message type
		const results = [];
		for (const { handler } of handlers) {
			try {
				const result = await handler(processedMessage);
				results.push(result);
			} catch (error) {
				console.error(`Error in message handler for type ${processedMessage.type}:`, error);
				results.push({ error: error.message });
			}
		}

		return results;
	}

	/**
	 * Check if handlers are registered for a message type
	 * @param type - Message type to check
	 * @returns true if handlers exist
	 */
	hasHandlers(type: string): boolean {
		return this.handlers.has(type) && this.handlers.get(type)!.length > 0;
	}

	/**
	 * Get all registered message types
	 * @returns Array of registered message types
	 */
	getRegisteredTypes(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Get handler count for a specific message type
	 * @param type - Message type
	 * @returns Number of registered handlers
	 */
	getHandlerCount(type: string): number {
		return this.handlers.get(type)?.length || 0;
	}

	/**
	 * Clear all handlers and middlewares
	 */
	clear(): void {
		this.handlers.clear();
		this.middlewares.length = 0;
	}

	/**
	 * Handle status update messages
	 */
	async handleStatusUpdate(statusData: any): Promise<any> {
		const message = createMessage("status", statusData);
		return this.handle(message);
	}

	/**
	 * Handle git messages
	 */
	async handleGitMessage(updateData: any): Promise<any> {
		const message = createMessage("git", updateData);
		return this.handle(message);
	}

	/**
	 * Handle shell call messages
	 */
	async handleShellCall(updateData: any): Promise<any> {
		const message = createMessage("shell_call", updateData);
		return this.handle(message);
	}

	/**
	 * Handle shell output messages
	 */
	async handleShellOutput(updateData: any): Promise<any> {
		const message = createMessage("shell_output", updateData);
		return this.handle(message);
	}

	/**
	 * Handle assistant messages
	 */
	async handleAssistantMessage(updateData: any): Promise<any> {
		const message = createMessage("assistant_message", updateData);
		return this.handle(message);
	}

	/**
	 * Handle update messages by routing to appropriate handler
	 */
	async handleUpdateMessage(updateData: any): Promise<any> {
		if (!updateData?.message?.type) {
			return [];
		}

		switch (updateData.message.type) {
			case "git":
				return this.handleGitMessage(updateData);
			case "local_shell_call":
				return this.handleShellCall(updateData);
			case "local_shell_call_output":
				return this.handleShellOutput(updateData);
			case "message":
				return this.handleAssistantMessage(updateData);
			default:
				console.warn(`Unknown message type: ${updateData.message.type}`);
				return [];
		}
	}
}

/**
 * Create a new message with proper structure
 * @param type - Message type
 * @param payload - Message payload
 * @param options - Additional message options
 * @returns Properly structured message
 */
export function createMessage(
	type: string,
	payload: any,
	options: Partial<Omit<Message, "id" | "type" | "payload" | "timestamp">> = {}
): Message {
	// Generate UUID compatible with both Node.js and Bun
	const generateUUID = (): string => {
		if (typeof crypto !== "undefined" && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback for environments without crypto.randomUUID
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			const v = c === "x" ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	};

	return {
		id: generateUUID(),
		type,
		payload,
		timestamp: Date.now(),
		...options,
	};
}

/**
 * Validate message structure
 * @param message - Message to validate
 * @returns true if valid, throws error otherwise
 */
export function validateMessage(message: Message): boolean {
	if (!message) {
		throw new Error("Message is required");
	}

	if (!message.id || typeof message.id !== "string") {
		throw new Error("Message must have a valid id");
	}

	if (!message.type || typeof message.type !== "string") {
		throw new Error("Message must have a valid type");
	}

	if (!message.timestamp || typeof message.timestamp !== "number") {
		throw new Error("Message must have a valid timestamp");
	}

	return true;
}

// Default message handlers instance
export const messageHandlers = new MessageHandlers();
