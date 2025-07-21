import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/utils", () => ({
	cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
	Lightbulb: ({ className, ...props }: any) => (
		<svg className={className} data-testid="lightbulb-icon" {...props} />
	),
	ArrowRight: ({ className, ...props }: any) => (
		<svg className={className} data-testid="arrow-right-icon" {...props} />
	),
	Sparkles: ({ className, ...props }: any) => (
		<svg className={className} data-testid="sparkles-icon" {...props} />
	),
	X: ({ className, ...props }: any) => (
		<svg className={className} data-testid="x-icon" {...props} />
	),
}));

// AI Suggestion component interfaces and implementation
interface Suggestion {
	id: string;
	title: string;
	description?: string;
	action: string;
	category?: "prompt" | "action" | "tip" | "follow-up";
	confidence?: number;
	metadata?: Record<string, any>;
}

interface AISuggestionProps {
	suggestions: Suggestion[];
	onSuggestionClick: (suggestion: Suggestion) => void;
	onDismiss?: (suggestionId: string) => void;
	className?: string;
	variant?: "default" | "compact" | "card";
	maxVisible?: number;
	showConfidence?: boolean;
	showCategory?: boolean;
	showIcons?: boolean;
	title?: string;
}

interface SuggestionItemProps {
	suggestion: Suggestion;
	onClick: (suggestion: Suggestion) => void;
	onDismiss?: (id: string) => void;
	showConfidence?: boolean;
	showCategory?: boolean;
	showIcons?: boolean;
	variant?: "default" | "compact" | "card";
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
	suggestion,
	onClick,
	onDismiss,
	showConfidence = false,
	showCategory = false,
	showIcons = true,
	variant = "default",
}) => {
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case "prompt":
				return <svg className="lightbulb-icon" data-testid="lightbulb-icon" />;
			case "action":
				return (
					<svg className="arrow-right-icon" data-testid="arrow-right-icon" />
				);
			case "tip":
				return <svg className="sparkles-icon" data-testid="sparkles-icon" />;
			default:
				return <svg className="lightbulb-icon" data-testid="lightbulb-icon" />;
		}
	};

	return (
		<div
			className={`suggestion-item ${variant}`}
			data-testid={`suggestion-${suggestion.id}`}
		>
			<button
				onClick={() => onClick(suggestion)}
				className="suggestion-button"
				data-testid={`suggestion-button-${suggestion.id}`}
			>
				{showIcons && suggestion.category && (
					<div className="suggestion-icon" data-testid="suggestion-icon">
						{getCategoryIcon(suggestion.category)}
					</div>
				)}

				<div className="suggestion-content" data-testid="suggestion-content">
					<div className="suggestion-title" data-testid="suggestion-title">
						{suggestion.title}
					</div>

					{suggestion.description && (
						<div
							className="suggestion-description"
							data-testid="suggestion-description"
						>
							{suggestion.description}
						</div>
					)}

					{showCategory && suggestion.category && (
						<div
							className="suggestion-category"
							data-testid="suggestion-category"
						>
							{suggestion.category}
						</div>
					)}

					{showConfidence && suggestion.confidence !== undefined && (
						<div
							className="suggestion-confidence"
							data-testid="suggestion-confidence"
						>
							{Math.round(suggestion.confidence * 100)}% confidence
						</div>
					)}
				</div>
			</button>

			{onDismiss && (
				<button
					onClick={() => onDismiss(suggestion.id)}
					className="suggestion-dismiss"
					data-testid={`suggestion-dismiss-${suggestion.id}`}
					aria-label={`Dismiss suggestion: ${suggestion.title}`}
				>
					<svg className="x-icon" data-testid="x-icon" />
				</button>
			)}
		</div>
	);
};

const AISuggestion: React.FC<AISuggestionProps> = ({
	suggestions,
	onSuggestionClick,
	onDismiss,
	className = "",
	variant = "default",
	maxVisible = 5,
	showConfidence = false,
	showCategory = false,
	showIcons = true,
	title = "Suggestions",
}) => {
	const visibleSuggestions = suggestions.slice(0, maxVisible);

	if (suggestions.length === 0) {
		return null;
	}

	return (
		<div
			className={`ai-suggestion ${variant} ${className}`}
			data-testid="ai-suggestion"
		>
			{title && (
				<div className="suggestion-header" data-testid="suggestion-header">
					<h3 className="suggestion-title">{title}</h3>
					{suggestions.length > maxVisible && (
						<span className="suggestion-count" data-testid="suggestion-count">
							Showing {maxVisible} of {suggestions.length}
						</span>
					)}
				</div>
			)}

			<div className="suggestion-list" data-testid="suggestion-list">
				{visibleSuggestions.map((suggestion) => (
					<SuggestionItem
						key={suggestion.id}
						suggestion={suggestion}
						onClick={onSuggestionClick}
						onDismiss={onDismiss}
						showConfidence={showConfidence}
						showCategory={showCategory}
						showIcons={showIcons}
						variant={variant}
					/>
				))}
			</div>
		</div>
	);
};

describe("AISuggestion Component", () => {
	const mockSuggestions: Suggestion[] = [
		{
			id: "1",
			title: "Explain this code",
			description: "Get a detailed explanation of the selected code",
			action: "explain",
			category: "prompt",
			confidence: 0.95,
		},
		{
			id: "2",
			title: "Add error handling",
			description: "Suggest error handling improvements",
			action: "add_error_handling",
			category: "action",
			confidence: 0.85,
		},
		{
			id: "3",
			title: "Optimize performance",
			action: "optimize",
			category: "tip",
			confidence: 0.75,
		},
	];

	const mockOnSuggestionClick = vi.fn();
	const mockOnDismiss = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Basic Rendering", () => {
		it("should render suggestions list", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getByTestId("ai-suggestion")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-list")).toBeInTheDocument();
			expect(screen.getByText("Suggestions")).toBeInTheDocument();
		});

		it("should render all suggestions when under maxVisible limit", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getByTestId("suggestion-1")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-2")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-3")).toBeInTheDocument();
		});

		it("should limit suggestions when maxVisible is set", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					maxVisible={2}
				/>,
			);

			expect(screen.getByTestId("suggestion-1")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-2")).toBeInTheDocument();
			expect(screen.queryByTestId("suggestion-3")).not.toBeInTheDocument();
		});

		it("should show suggestion count when limited", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					maxVisible={2}
				/>,
			);

			expect(screen.getByTestId("suggestion-count")).toBeInTheDocument();
			expect(screen.getByText("Showing 2 of 3")).toBeInTheDocument();
		});

		it("should not render when no suggestions", () => {
			const { container } = render(
				<AISuggestion
					suggestions={[]}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("Suggestion Items", () => {
		it("should render suggestion titles", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getByText("Explain this code")).toBeInTheDocument();
			expect(screen.getByText("Add error handling")).toBeInTheDocument();
			expect(screen.getByText("Optimize performance")).toBeInTheDocument();
		});

		it("should render suggestion descriptions when provided", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(
				screen.getByText("Get a detailed explanation of the selected code"),
			).toBeInTheDocument();
			expect(
				screen.getByText("Suggest error handling improvements"),
			).toBeInTheDocument();
		});

		it("should not render description when not provided", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			// Third suggestion has no description
			const thirdSuggestion = screen.getByTestId("suggestion-3");
			expect(
				thirdSuggestion.querySelector('[data-testid="suggestion-description"]'),
			).not.toBeInTheDocument();
		});
	});

	describe("Category Display", () => {
		it("should show category icons by default", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getAllByTestId("lightbulb-icon")).toHaveLength(1);
			expect(screen.getAllByTestId("arrow-right-icon")).toHaveLength(1);
			expect(screen.getAllByTestId("sparkles-icon")).toHaveLength(1);
		});

		it("should hide icons when showIcons is false", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					showIcons={false}
				/>,
			);

			expect(screen.queryByTestId("suggestion-icon")).not.toBeInTheDocument();
		});

		it("should show category text when showCategory is true", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					showCategory={true}
				/>,
			);

			expect(screen.getByText("prompt")).toBeInTheDocument();
			expect(screen.getByText("action")).toBeInTheDocument();
			expect(screen.getByText("tip")).toBeInTheDocument();
		});
	});

	describe("Confidence Display", () => {
		it("should show confidence when showConfidence is true", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					showConfidence={true}
				/>,
			);

			expect(screen.getByText("95% confidence")).toBeInTheDocument();
			expect(screen.getByText("85% confidence")).toBeInTheDocument();
			expect(screen.getByText("75% confidence")).toBeInTheDocument();
		});

		it("should not show confidence by default", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.queryByText("95% confidence")).not.toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onSuggestionClick when suggestion is clicked", async () => {
			const user = userEvent.setup();

			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			await user.click(screen.getByTestId("suggestion-button-1"));

			expect(mockOnSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
		});

		it("should call onDismiss when dismiss button is clicked", async () => {
			const user = userEvent.setup();

			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					onDismiss={mockOnDismiss}
				/>,
			);

			await user.click(screen.getByTestId("suggestion-dismiss-1"));

			expect(mockOnDismiss).toHaveBeenCalledWith("1");
		});

		it("should not show dismiss button when onDismiss is not provided", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(
				screen.queryByTestId("suggestion-dismiss-1"),
			).not.toBeInTheDocument();
		});

		it("should handle keyboard interactions", async () => {
			const user = userEvent.setup();

			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			const button = screen.getByTestId("suggestion-button-1");
			await user.type(button, "{enter}");

			expect(mockOnSuggestionClick).toHaveBeenCalledWith(mockSuggestions[0]);
		});
	});

	describe("Customization Props", () => {
		it("should apply custom className", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("ai-suggestion")).toHaveClass("custom-class");
		});

		it("should apply variant classes", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					variant="compact"
				/>,
			);

			expect(screen.getByTestId("ai-suggestion")).toHaveClass("compact");
		});

		it("should use custom title", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					title="Custom Title"
				/>,
			);

			expect(screen.getByText("Custom Title")).toBeInTheDocument();
		});

		it("should hide header when title is not provided", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					title=""
				/>,
			);

			expect(screen.queryByTestId("suggestion-header")).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper aria-label for dismiss buttons", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					onDismiss={mockOnDismiss}
				/>,
			);

			const dismissButton = screen.getByTestId("suggestion-dismiss-1");
			expect(dismissButton).toHaveAttribute(
				"aria-label",
				"Dismiss suggestion: Explain this code",
			);
		});

		it("should be focusable", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			const button = screen.getByTestId("suggestion-button-1");
			button.focus();
			expect(button).toHaveFocus();
		});

		it("should support tab navigation", async () => {
			const user = userEvent.setup();

			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					onDismiss={mockOnDismiss}
				/>,
			);

			await user.tab();
			expect(screen.getByTestId("suggestion-button-1")).toHaveFocus();

			await user.tab();
			expect(screen.getByTestId("suggestion-dismiss-1")).toHaveFocus();
		});
	});

	describe("Edge Cases", () => {
		it("should handle suggestions without category", () => {
			const suggestionsWithoutCategory = [
				{
					id: "no-category",
					title: "No category suggestion",
					action: "test",
				},
			];

			render(
				<AISuggestion
					suggestions={suggestionsWithoutCategory}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getByText("No category suggestion")).toBeInTheDocument();
		});

		it("should handle suggestions with zero confidence", () => {
			const zeroConfidenceSuggestions = [
				{
					id: "zero-confidence",
					title: "Zero confidence",
					action: "test",
					confidence: 0,
				},
			];

			render(
				<AISuggestion
					suggestions={zeroConfidenceSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					showConfidence={true}
				/>,
			);

			expect(screen.getByText("0% confidence")).toBeInTheDocument();
		});

		it("should handle very long suggestion titles", () => {
			const longTitleSuggestions = [
				{
					id: "long-title",
					title:
						"This is a very long suggestion title that might overflow or cause layout issues in the component",
					action: "test",
				},
			];

			render(
				<AISuggestion
					suggestions={longTitleSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(
				screen.getByText(/This is a very long suggestion title/),
			).toBeInTheDocument();
		});

		it("should handle maxVisible larger than suggestions array", () => {
			render(
				<AISuggestion
					suggestions={mockSuggestions}
					onSuggestionClick={mockOnSuggestionClick}
					maxVisible={10}
				/>,
			);

			expect(screen.getByTestId("suggestion-1")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-2")).toBeInTheDocument();
			expect(screen.getByTestId("suggestion-3")).toBeInTheDocument();
			expect(screen.queryByTestId("suggestion-count")).not.toBeInTheDocument();
		});

		it("should handle suggestions with metadata", () => {
			const suggestionsWithMetadata = [
				{
					id: "with-metadata",
					title: "Suggestion with metadata",
					action: "test",
					metadata: { source: "ai-analysis", priority: "high" },
				},
			];

			render(
				<AISuggestion
					suggestions={suggestionsWithMetadata}
					onSuggestionClick={mockOnSuggestionClick}
				/>,
			);

			expect(screen.getByText("Suggestion with metadata")).toBeInTheDocument();
		});
	});

	describe("Performance", () => {
		it("should handle large number of suggestions efficiently", () => {
			const largeSuggestionList = Array.from({ length: 100 }, (_, i) => ({
				id: `suggestion-${i}`,
				title: `Suggestion ${i}`,
				action: `action-${i}`,
			}));

			render(
				<AISuggestion
					suggestions={largeSuggestionList}
					onSuggestionClick={mockOnSuggestionClick}
					maxVisible={5}
				/>,
			);

			// Should only render 5 items
			expect(screen.getAllByTestId(/^suggestion-\d+$/)).toHaveLength(5);
			expect(screen.getByText("Showing 5 of 100")).toBeInTheDocument();
		});
	});
});
