import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ChatMessage } from "./chat-message";

// Mock Lucide React icons
// vi.mock("lucide-react", () => ({
// 	Bot: ({ className, ...props }: any) => (
// <svg className={className} data-testid="bot-icon" {...props} />
// ),
// 	User: ({ className, ...props }: any) => (
// <svg className={className} data-testid="user-icon" {...props} />
// ),
// }));

// Mock the Markdown component
// vi.mock("@/components/markdown", () => ({
// 	Markdown: ({ children, repoUrl, branch }: any) => (
// <div data-branch={branch} data-repo-url={repoUrl} data-testid="markdown">
// {children}
// </div>
// ),
// }));

// Mock the StreamingIndicator component
// vi.mock("@/components/streaming-indicator", () => ({
// 	StreamingIndicator: ({ size, variant }: any) => (
// <div data-size={size} data-testid="streaming-indicator" data-variant={variant} />
// ),
// }));

// Mock the utils
// vi.mock("@/lib/utils", () => ({
// 	cn: (...args: any[]) => args.filter(Boolean).join(" "),
// }));

describe.skip("ChatMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render user message", () => {
		render(<ChatMessage role="user" text="Hello, this is a test message" />);

		expect(screen.getByText("Hello, this is a test message")).toBeTruthy();
		expect(screen.getByTestId("user-icon")).toBeTruthy();
	});

	it("should render assistant message", () => {
		render(<ChatMessage role="assistant" text="Hello, I am an AI assistant" />);

		expect(screen.getByText("Hello, I am an AI assistant")).toBeTruthy();
		expect(screen.getByTestId("bot-icon")).toBeTruthy();
	});

	it("should render streaming assistant message", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="This is a streaming message" />);

		expect(screen.getByText("This is a streaming message")).toBeTruthy();
		expect(screen.getByTestId("streaming-indicator")).toBeTruthy();
	});

	it("should render streaming with progress", () => {
		render(
			<ChatMessage
				isStreaming={true}
				role="assistant"
				streamProgress={{ chunkIndex: 2, totalChunks: 10 }}
				text="This is a streaming message"
			/>
		);

		expect(screen.getByText("30%")).toBeTruthy();
		expect(screen.getByTestId("streaming-indicator")).toBeTruthy();
	});

	it("should render markdown for assistant messages", () => {
		render(
			<ChatMessage
				branch="main"
				repoUrl="https://github.com/test/repo"
				role="user"
				text="# Hello\n\nThis is **bold** text"
			/>
		);

		const markdown = screen.getByTestId("markdown");
		expect(markdown.getAttribute("data-repo-url")).toBe("https://github.com/test/repo");
		expect(markdown.getAttribute("data-branch")).toBe("main");
		expect(markdown.textContent).toContain("# Hello\n\nThis is **bold** text");
	});

	it("should render plain text for user messages", () => {
		render(<ChatMessage role="user" text="This is a user message" />);

		expect(screen.getByText("This is a user message")).toBeTruthy();
		expect(screen.queryByTestId("markdown")).toBeFalsy();
	});

	it("should handle empty text", () => {
		render(<ChatMessage role="user" text="" />);

		expect(screen.getByTestId("user-icon")).toBeTruthy();
	});

	it("should handle long messages", () => {
		const longMessage = "A".repeat(1000);
		render(<ChatMessage role="user" text={longMessage} />);

		expect(screen.getByText(longMessage)).toBeTruthy();
	});

	it("should apply correct styling for assistant messages", () => {
		render(<ChatMessage role="assistant" text="Assistant message" />);

		const messageContainer = screen.getByText("Assistant message").closest("div");
		expect(messageContainer?.classList.contains("bg-card")).toBe(true);
		expect(messageContainer?.classList.contains("border")).toBe(true);
		expect(messageContainer?.classList.contains("border-border")).toBe(true);
	});

	it("should apply correct styling for user messages", () => {
		render(<ChatMessage role="user" text="User message" />);

		const messageContainer = screen.getByText("User message").closest("div");
		expect(messageContainer?.classList.contains("bg-primary")).toBe(true);
		expect(messageContainer?.classList.contains("text-primary-foreground")).toBe(true);
	});

	it("should show streaming animation for assistant avatar", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="Streaming message" />);

		const avatarContainer = screen.getByTestId("bot-icon").closest("div");
		expect(avatarContainer?.classList.contains("relative")).toBe(true);
		expect(avatarContainer?.classList.contains("overflow-hidden")).toBe(true);
	});

	it("should handle streaming indicator variants", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="Streaming message" />);

		const streamingIndicator = screen.getByTestId("streaming-indicator");
		expect(streamingIndicator.getAttribute("data-size")).toBe("sm");
		expect(streamingIndicator.getAttribute("data-variant")).toBe("cursor");
	});

	it("should calculate progress percentage correctly", () => {
		render(
			<ChatMessage
				isStreaming={true}
				role="assistant"
				streamProgress={{ chunkIndex: 4, totalChunks: 8 }}
				text="Streaming message"
			/>
		);

		expect(screen.getByText("63%")).toBeTruthy();
	});

	it("should handle zero progress", () => {
		render(
			<ChatMessage
				isStreaming={true}
				role="assistant"
				streamProgress={{ chunkIndex: 0, totalChunks: 10 }}
				text="Streaming message"
			/>
		);

		expect(screen.getByText("10%")).toBeTruthy();
	});

	it("should handle complete progress", () => {
		render(
			<ChatMessage
				isStreaming={true}
				role="assistant"
				streamProgress={{ chunkIndex: 9, totalChunks: 10 }}
				text="Streaming message"
			/>
		);

		expect(screen.getByText("100%")).toBeTruthy();
	});

	it("should position user message on the right", () => {
		render(<ChatMessage role="user" text="User message" />);

		const container = screen.getByText("User message").closest("div")?.parentElement;
		expect(container?.classList.contains("justify-end")).toBe(true);
	});

	it("should position assistant message on the left", () => {
		render(<ChatMessage role="assistant" text="Assistant message" />);

		const container = screen.getByText("Assistant message").closest("div")?.parentElement;
		expect(container?.classList.contains("justify-start")).toBe(true);
	});

	it("should handle code blocks in markdown", () => {
		render(<ChatMessage role="assistant" text="```javascript\nconsole.log('Hello World');\n```" />);

		const markdown = screen.getByTestId("markdown");
		expect(markdown.textContent).toContain("```javascript\nconsole.log('Hello World');\n```");
	});

	it("should handle markdown with repository context", () => {
		render(
			<ChatMessage
				branch="feature-branch"
				repoUrl="https://github.com/test/repo"
				role="user"
				text="Check out this [file](./src/index.ts)"
			/>
		);

		const markdown = screen.getByTestId("markdown");
		expect(markdown.getAttribute("data-repo-url")).toBe("https://github.com/test/repo");
		expect(markdown.getAttribute("data-branch")).toBe("feature-branch");
	});

	it("should handle special characters in text", () => {
		const specialText = "Hello! @user #hashtag $variable & <div>HTML</div>";
		render(<ChatMessage role="user" text={specialText} />);

		expect(screen.getByText(specialText)).toBeTruthy();
	});

	it("should handle newlines in user messages", () => {
		const multilineText = "Line 1\nLine 2\nLine 3";
		render(<ChatMessage role="user" text={multilineText} />);

		expect(screen.getByText(multilineText)).toBeTruthy();
	});

	it("should handle unicode characters", () => {
		const unicodeText = "Hello 🌍 World! 你好 🚀";
		render(<ChatMessage role="user" text={unicodeText} />);

		expect(screen.getByText(unicodeText)).toBeTruthy();
	});
});
