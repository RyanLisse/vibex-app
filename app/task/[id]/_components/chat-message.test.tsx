import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ChatMessage } from "./chat-message";

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
	Bot: ({ className, ...props }: any) => (
		<svg className={className} data-testid="bot-icon" {...props} />
	),
	User: ({ className, ...props }: any) => (
		<svg className={className} data-testid="user-icon" {...props} />
	),
}));

// Mock the Markdown component
vi.mock("@/components/markdown", () => ({
	Markdown: ({ children, repoUrl, branch }: any) => (
		<div data-branch={branch} data-repo-url={repoUrl} data-testid="markdown">
			{children}
		</div>
	),
}));

// Mock the StreamingIndicator component
vi.mock("@/components/streaming-indicator", () => ({
	StreamingIndicator: ({ size, variant }: any) => (
		<div data-size={size} data-testid="streaming-indicator" data-variant={variant} />
	),
}));

// Mock the utils
vi.mock("@/lib/utils", () => ({
	cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("ChatMessage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render user message", () => {
		render(<ChatMessage role="user" text="Hello, this is a test message" />);

		expect(screen.getByText("Hello, this is a test message")).toBeInTheDocument();
		expect(screen.getByTestId("user-icon")).toBeInTheDocument();
	});

	it("should render assistant message", () => {
		render(<ChatMessage role="assistant" text="Hello, I am an AI assistant" />);

		expect(screen.getByText("Hello, I am an AI assistant")).toBeInTheDocument();
		expect(screen.getByTestId("bot-icon")).toBeInTheDocument();
	});

	it("should render streaming assistant message", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="This is a streaming message" />);

		expect(screen.getByText("This is a streaming message")).toBeInTheDocument();
		expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
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

		expect(screen.getByText("30%")).toBeInTheDocument();
		expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
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
		expect(markdown).toHaveAttribute("data-repo-url", "https://github.com/test/repo");
		expect(markdown).toHaveAttribute("data-branch", "main");
		expect(markdown).toHaveTextContent("# Hello\n\nThis is **bold** text");
	});

	it("should render plain text for user messages", () => {
		render(<ChatMessage role="user" text="This is a user message" />);

		expect(screen.getByText("This is a user message")).toBeInTheDocument();
		expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
	});

	it("should handle empty text", () => {
		render(<ChatMessage role="user" text="" />);

		expect(screen.getByTestId("user-icon")).toBeInTheDocument();
	});

	it("should handle long messages", () => {
		const longMessage = "A".repeat(1000);
		render(<ChatMessage role="user" text={longMessage} />);

		expect(screen.getByText(longMessage)).toBeInTheDocument();
	});

	it("should apply correct styling for assistant messages", () => {
		render(<ChatMessage role="assistant" text="Assistant message" />);

		const messageContainer = screen.getByText("Assistant message").closest("div");
		expect(messageContainer).toHaveClass("bg-card", "border", "border-border");
	});

	it("should apply correct styling for user messages", () => {
		render(<ChatMessage role="user" text="User message" />);

		const messageContainer = screen.getByText("User message").closest("div");
		expect(messageContainer).toHaveClass("bg-primary", "text-primary-foreground");
	});

	it("should show streaming animation for assistant avatar", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="Streaming message" />);

		const avatarContainer = screen.getByTestId("bot-icon").closest("div");
		expect(avatarContainer).toHaveClass("relative", "overflow-hidden");
	});

	it("should handle streaming indicator variants", () => {
		render(<ChatMessage isStreaming={true} role="assistant" text="Streaming message" />);

		const streamingIndicator = screen.getByTestId("streaming-indicator");
		expect(streamingIndicator).toHaveAttribute("data-size", "sm");
		expect(streamingIndicator).toHaveAttribute("data-variant", "cursor");
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

		expect(screen.getByText("63%")).toBeInTheDocument();
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

		expect(screen.getByText("10%")).toBeInTheDocument();
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

		expect(screen.getByText("100%")).toBeInTheDocument();
	});

	it("should position user message on the right", () => {
		render(<ChatMessage role="user" text="User message" />);

		const container = screen.getByText("User message").closest("div")?.parentElement;
		expect(container).toHaveClass("justify-end");
	});

	it("should position assistant message on the left", () => {
		render(<ChatMessage role="assistant" text="Assistant message" />);

		const container = screen.getByText("Assistant message").closest("div")?.parentElement;
		expect(container).toHaveClass("justify-start");
	});

	it("should handle code blocks in markdown", () => {
		render(<ChatMessage role="assistant" text="```javascript\nconsole.log('Hello World');\n```" />);

		const markdown = screen.getByTestId("markdown");
		expect(markdown).toHaveTextContent("```javascript\nconsole.log('Hello World');\n```");
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
		expect(markdown).toHaveAttribute("data-repo-url", "https://github.com/test/repo");
		expect(markdown).toHaveAttribute("data-branch", "feature-branch");
	});

	it("should handle special characters in text", () => {
		const specialText = "Hello! @user #hashtag $variable & <div>HTML</div>";
		render(<ChatMessage role="user" text={specialText} />);

		expect(screen.getByText(specialText)).toBeInTheDocument();
	});

	it("should handle newlines in user messages", () => {
		const multilineText = "Line 1\nLine 2\nLine 3";
		render(<ChatMessage role="user" text={multilineText} />);

		expect(screen.getByText(multilineText)).toBeInTheDocument();
	});

	it("should handle unicode characters", () => {
		const unicodeText = "Hello 🌍 World! 你好 🚀";
		render(<ChatMessage role="user" text={unicodeText} />);

		expect(screen.getByText(unicodeText)).toBeInTheDocument();
	});
});
