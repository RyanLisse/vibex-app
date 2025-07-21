import { useTheme } from "next-themes";
import type React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
	oneDark,
	oneLight
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { TableRow
} from "@/components/ui/table";

type CodeComponentProps = React.ComponentPropsWithoutRef<"code"> & {
	inline?: boolean;
	className?: string;
	children?: React.ReactNode;
	style?: React.CSSProperties;
};

export const CodeComponent: React.FC<CodeComponentProps> = ({
	inline,
	className,
	children,
	...props
}) => {
	const match = /language-(\w+)/.exec(className || "");
	const { theme } = useTheme();
	const [copied, setCopied] = useState(false);

	if (inline) {
		return (
			<code
				className="rounded-md bg-background px-1 py-0.5 text-sm dark:bg-zinc-800"
				style={{ wordBreak: "break-all" }}
				{...props}
			>
				{children}
			</code>
		);
	}

	// Code block with language
	if (match) {
		return (
			<div className="my-2 overflow-hidden rounded-lg border bg-background">
				<div className="flex items-center justify-between border-b bg-sidebar px-2 py-1">
					<span className="text-muted-foreground text-xs">{match[1]}</span>
					<Button
						className="size-7"
						onClick={() => {
							navigator.clipboard.writeText(String(children));
							setCopied(true);
							setTimeout(() => setCopied(false), 2000);
						}}
						size="icon"
						variant="ghost"
					>
						{copied ? (
							<CheckIcon className="h-4 w-4 text-green-500" />
						) : (
							<CopyIcon className="h-4 w-4" />
						)}
					</Button>
				</div>
				<ScrollArea className="max-w-full">
					<div className="px-4 py-2" style={{ maxWidth: "100%" }}>
						<SyntaxHighlighter
							codeTagProps={{
								style: {
									whiteSpace: "pre",
									display: "block",
								},
							}}
							customStyle={{
								fontSize: "12.5px",
								backgroundColor: "transparent",
								padding: "0",
								margin: "0",
								background: "none",
								overflow: "visible",
							}}
							language={match[1]}
PreTag="div"
							style={theme === "dark" ? oneDark : oneLight}
							wrapLongLines={false}
						>
							{String(children).replace(/\n$/, "")}
						</SyntaxHighlighter>
					</div>
				</ScrollArea>
			</div>
		);
	}

	// Code block without language
	return (
		<code
			className="!bg-sidebar relative rounded border border-muted-foreground/20 px-[0.3rem] py-[0.2rem] font-mono text-xs"
			style={{ wordBreak: "break-word" }}
		>
			{children}
		</code>
	);
};

const components: Partial<Components> = {
	code: CodeComponent,
	pre: ({ children }) => <>{children}</>,
	ol: ({ children, ...props }) => (
		<ol className="ml-4 list-outside list-decimal" {...props}>
			{children}
		</ol>
	),
	li: ({ children, ...props }) => (
		<li className="py-1" {...props}>
			{children}
		</li>
	),
	ul: ({ children, ...props }) => (
		<ul className="ml-4 list-outside list-disc" {...props}>
			{children}
		</ul>
	),
	strong: ({ children, ...props }) => (
		<span className="font-semibold" {...props}>
			{children}
		</span>
	),
	p: ({ children, ...props }) => (
		<p
			className="mb-2"
			style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
			{...props}
		>
			{children}
		</p>
	),
	a: ({ children, href, ...props }) => {
		// Check if the URL is external (starts with http/https) or internal
		const isExternal = href?.startsWith("http") || href?.startsWith("https");

		if (isExternal) {
			return (
				<a
					className="text-blue-500 hover:underline"
					href={href}
					rel="noreferrer"
					style={{
						wordBreak: "break-word",
						overflowWrap: "break-word",
					}}
					target="_blank"
					{...props}
				>
					{children}
				</a>
			);
		}

		return (
			<Link
				className="text-blue-500 hover:underline"
				href={href || "#"}
				passHref
				rel="noreferrer"
				style={{
					wordBreak: "break-word",
					overflowWrap: "break-word",
				}}
				target="_blank"
				{...props}
			>
				{children}
			</Link>
		);
	},
	h1: ({ children, ...props }) => (
		<h1
			className="mt-6 mb-2 font-semibold text-3xl"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h1>
	),
	h2: ({ children, ...props }) => (
		<h2
			className="mt-6 mb-2 font-semibold text-2xl"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h2>
	),
	h3: ({ children, ...props }) => (
		<h3
			className="mt-6 mb-2 font-semibold text-xl"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h3>
	),
	h4: ({ children, ...props }) => (
		<h4
			className="mt-6 mb-2 font-semibold text-lg"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h4>
	),
	h5: ({ children, ...props }) => (
		<h5
			className="mt-6 mb-2 font-semibold text-base"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h5>
	),
	h6: ({ children, ...props }) => (
		<h6
			className="mt-6 mb-2 font-semibold text-sm"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</h6>
	),
	img: ({ alt, src, title, ...props }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			alt={alt}
			className="my-2 h-auto max-w-full rounded"
			src={src}
			title={title}
			{...props}
		/>
	),
	blockquote: ({ children, ...props }) => (
		<blockquote
			className="my-4 border-gray-300 border-l-4 pl-4 italic dark:border-gray-700"
			style={{ wordBreak: "break-word" }}
			{...props}
		>
			{children}
		</blockquote>
	),
	table: ({ children, ...props }) => (
		<ScrollArea className="my-4 w-140 rounded-lg border">
			<Table className="w-full" {...props}>
				{children}
			</Table>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	),
	thead: ({ children, ...props }) => (
		<TableHeader {...props}>{children}</TableHeader>
	),
	tbody: ({ children, ...props }) => (
		<TableBody {...props}>{children}</TableBody>
	),
	tfoot: ({ children, ...props }) => (
		<TableFooter {...props}>{children}</TableFooter>
	),
	tr: ({ children, ...props }) => <TableRow {...props}>{children}</TableRow>,
	th: ({ children, ...props }) => <TableHead {...props}>{children}</TableHead>,
	td: ({ children, ...props }) => <TableCell {...props}>{children}</TableCell>,
	hr: () => <Separator className="my-8 h-1" />,
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeRaw];

// Function to process citations and convert them to proper format
const processCitations = (
	content: string,
	repoUrl?: string,
	branch?: string,
): string => {
	// Match citations in format 【F:filename†L1-L1】
	const citationRegex = /【F:([^†]+)†L(\d+)-L(\d+)】/g;

	return content.replace(
		citationRegex,
		(_match, filename, startLine, endLine) => {
			const displayText =
				startLine === endLine
					? `${filename}:${startLine}`
					: `${filename}:${startLine}-${endLine}`;

			const repoBaseUrl = repoUrl ? `${repoUrl}/blob/${branch || "main"}` : "#";
			const linkUrl =
				startLine === endLine
					? `${repoBaseUrl}/${filename}#L${startLine}`
					: `${repoBaseUrl}/${filename}#L${startLine}-L${endLine}`;

			return `[${displayText}](${linkUrl}) `;
		},
	);
};

interface MarkdownProps {
	children: string;
	repoUrl?: string;
	branch?: string;
}

const NonMemoizedMarkdown = ({ children, repoUrl, branch }: MarkdownProps) => {
	const processedContent = processCitations(children, repoUrl, branch);

	return (
		<div style={{ width: "100%", maxWidth: "100%" }}>
			<ReactMarkdown
				components={components}
				rehypePlugins={rehypePlugins}
				remarkPlugins={remarkPlugins}
			>
				{processedContent}
			</ReactMarkdown>
		</div>
	);
};

export const Markdown = memo(