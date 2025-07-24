/**
 * AI Demo Page
 *
 * Demonstrates the unified AI system with multiple providers
 */

"use client";

import { AIChatPanel } from "@/components/ai/ai-chat-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Zap, Shield, RefreshCw, DollarSign, Brain } from "lucide-react";

export default function AIPage() {
	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold">Unified AI System</h1>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Seamlessly integrate with OpenAI, Anthropic, and Google AI using a single unified
					interface
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Zap className="h-5 w-5" />
							Multi-Provider Support
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Switch between OpenAI, Anthropic, and Google AI models with a single line of code
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5" />
							Automatic Fallback
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Ensure reliability with automatic provider fallback and retry mechanisms
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<RefreshCw className="h-5 w-5" />
							Load Balancing
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Distribute requests across providers with round-robin, least-latency, or random
							strategies
						</p>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="demo" className="space-y-4">
				<TabsList className="grid grid-cols-4 w-full">
					<TabsTrigger value="demo">Live Demo</TabsTrigger>
					<TabsTrigger value="models">Available Models</TabsTrigger>
					<TabsTrigger value="code">Code Examples</TabsTrigger>
					<TabsTrigger value="features">Features</TabsTrigger>
				</TabsList>

				<TabsContent value="demo" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Try the AI Chat</CardTitle>
							<CardDescription>
								Chat with different AI models and see real-time provider information
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AIChatPanel
								height="500px"
								showSettings={true}
								systemPrompt="You are a helpful AI assistant. Be concise and informative."
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="models" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Supported Models</CardTitle>
							<CardDescription>
								All available models across providers with their capabilities and pricing
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div>
									<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
										<Badge>OpenAI</Badge>
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<ModelCard
											name="GPT-4 Turbo"
											id="gpt-4-turbo-preview"
											capabilities={["Chat", "Functions", "Vision", "JSON"]}
											context="128K"
											price="$0.01/$0.03"
										/>
										<ModelCard
											name="GPT-3.5 Turbo"
											id="gpt-3.5-turbo"
											capabilities={["Chat", "Functions", "JSON"]}
											context="16K"
											price="$0.0005/$0.0015"
										/>
									</div>
								</div>

								<div>
									<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
										<Badge variant="secondary">Anthropic</Badge>
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<ModelCard
											name="Claude 3 Opus"
											id="claude-3-opus-20240229"
											capabilities={["Chat", "Functions", "Vision"]}
											context="200K"
											price="$0.015/$0.075"
										/>
										<ModelCard
											name="Claude 3.5 Sonnet"
											id="claude-3-5-sonnet-20241022"
											capabilities={["Chat", "Functions", "Vision"]}
											context="200K"
											price="$0.003/$0.015"
										/>
									</div>
								</div>

								<div>
									<h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
										<Badge variant="outline">Google AI</Badge>
									</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<ModelCard
											name="Gemini 1.5 Pro"
											id="gemini-1.5-pro-latest"
											capabilities={["Chat", "Functions", "Vision", "JSON"]}
											context="1M"
											price="$0.007/$0.021"
										/>
										<ModelCard
											name="Gemini 1.5 Flash"
											id="gemini-1.5-flash-latest"
											capabilities={["Chat", "Functions", "Vision", "JSON"]}
											context="1M"
											price="$0.00035/$0.00105"
										/>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="code" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Quick Start</CardTitle>
							<CardDescription>Get started with the unified AI system in minutes</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h4 className="font-semibold mb-2">1. Initialize Providers</h4>
								<pre className="bg-muted p-4 rounded-lg overflow-x-auto">
									<code>{`import { unifiedAI, initializeProviders } from '@/lib/ai';

// Initialize with environment variables
initializeProviders();

// Or with explicit configuration
initializeProviders({
  openai: { apiKey: 'your-key' },
  anthropic: { apiKey: 'your-key' },
  google: { apiKey: 'your-key' }
});`}</code>
								</pre>
							</div>

							<div>
								<h4 className="font-semibold mb-2">2. Create a Completion</h4>
								<pre className="bg-muted p-4 rounded-lg overflow-x-auto">
									<code>{`const result = await unifiedAI.createCompletion({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(result.data.choices[0].message.content);
console.log(\`Provider: \${result.provider}, Latency: \${result.latency}ms\`);`}</code>
								</pre>
							</div>

							<div>
								<h4 className="font-semibold mb-2">3. Use React Hook</h4>
								<pre className="bg-muted p-4 rounded-lg overflow-x-auto">
									<code>{`import { useAIChat } from '@/hooks/use-ai-chat';

function ChatComponent() {
  const { messages, input, setInput, sendMessage, isLoading } = useAIChat({
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a helpful assistant'
  });

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
    </div>
  );
}`}</code>
								</pre>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="features" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Brain className="h-5 w-5" />
									Model Discovery
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Find the best model for your use case based on capabilities, cost, and context
									window
								</p>
								<pre className="bg-muted p-3 rounded text-xs">
									<code>{`const best = await unifiedAI.findBestModel({
  capabilities: ['chat', 'vision'],
  maxCostPer1kTokens: 0.01,
  minContextWindow: 100000
});`}</code>
								</pre>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DollarSign className="h-5 w-5" />
									Cost Optimization
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Intelligent caching and provider selection to minimize costs while maintaining
									quality
								</p>
								<pre className="bg-muted p-3 rounded text-xs">
									<code>{`const client = new UnifiedAIClient({
  caching: true,
  cacheTTL: 3600000,
  loadBalancing: 'least-latency'
});`}</code>
								</pre>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Code className="h-5 w-5" />
									Function Calling
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Support for function calling across all compatible providers
								</p>
								<pre className="bg-muted p-3 rounded text-xs">
									<code>{`tools: [{
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get weather',
    parameters: { ... }
  }
}]`}</code>
								</pre>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<RefreshCw className="h-5 w-5" />
									Streaming Support
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Real-time streaming responses for better user experience
								</p>
								<pre className="bg-muted p-3 rounded text-xs">
									<code>{`const stream = await unifiedAI
  .createStreamingCompletion({ ... });

for await (const chunk of stream.data) {
  process.stdout.write(chunk.delta.content);
}`}</code>
								</pre>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function ModelCard({
	name,
	id,
	capabilities,
	context,
	price,
}: {
	name: string;
	id: string;
	capabilities: string[];
	context: string;
	price: string;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base">{name}</CardTitle>
				<CardDescription className="text-xs font-mono">{id}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex flex-wrap gap-1">
					{capabilities.map((cap) => (
						<Badge key={cap} variant="secondary" className="text-xs">
							{cap}
						</Badge>
					))}
				</div>
				<div className="flex justify-between text-xs text-muted-foreground">
					<span>Context: {context}</span>
					<span>{price}</span>
				</div>
			</CardContent>
		</Card>
	);
}
