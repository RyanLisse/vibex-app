# CloneDex

An OpenAI Codex clone built with Next.js, VibeKit SDK, and Inngest. This application allows you to generate code using AI models with real-time updates and GitHub integration.

## 🔗 Demo 

[https://clonedex.vercel.app/](https://clonedex.vercel.app/)

## ✨ Features

- 🤖 AI-powered code generation using OpenAI
- 🔄 Real-time task updates with Inngest
- 🐙 GitHub integration for repository management
- 🌍 E2B sandboxed environment execution
- 🎨 Modern UI with Tailwind CSS and shadcn/ui
- 📝 Markdown rendering with syntax highlighting
- 🗃️ Zustand state management (easily replaceable with any remote database)

## 🚀 Prerequisites

Before you begin, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Inngest CLI** (required for local development)
- An **OpenAI API key**
- An **E2B API key**
- A **GitHub OAuth app** (for GitHub integration)

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Inngest CLI

The Inngest CLI is essential for running background functions locally:

```bash
# Install globally
npm install -g inngest

# Or using npx (recommended)
npx inngest-cli@latest
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# E2B Configuration (for sandboxed environments)
E2B_API_KEY=your_e2b_api_key_here

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

#### Getting API Keys:

- **OpenAI API Key**: Get it from [OpenAI Platform](https://platform.openai.com/api-keys)
- **E2B API Key**: Sign up at [E2B](https://e2b.dev/) and get your API key
- **GitHub OAuth**: Create a new OAuth app in your [GitHub Developer Settings](https://github.com/settings/developers)

## 🛠️ Development

### 1. Start the Inngest Dev Server

In one terminal, start the Inngest development server:

```bash
npx inngest-cli@latest dev
```

This will start the Inngest development server on `http://localhost:8288`.

### 2. Start the Next.js Development Server

In another terminal, start the Next.js application:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📋 Available Scripts

- `npm run dev` - Start the development server with Turbopack
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint for code quality

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router
│   ├── _components/        # Page-specific components
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   └── auth/              # Authentication routes
├── components/            # Reusable UI components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and configurations
├── stores/                # Zustand state management
└── public/                # Static assets
```

## 🔧 Configuration

### Inngest Functions

The application uses Inngest for background task processing. The main function is defined in `lib/inngest.ts`:

- **`createTask`**: Handles AI code generation with real-time updates
- **Task Channel**: Manages real-time communication for task status and updates

### VibeKit Integration

The app integrates with VibeKit SDK for AI code generation, supporting:

- Multiple AI models (currently OpenAI)
- E2B sandboxed environments
- GitHub repository integration
- Real-time streaming updates

## 🌐 Deployment

### Environment Variables for Production

Make sure to set all required environment variables in your production environment:

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
E2B_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set the environment variables in the Vercel dashboard
3. Deploy

### Inngest in Production

For production, you'll need to configure Inngest properly:

1. Set up an Inngest account at [inngest.com](https://inngest.com)
2. Configure your production Inngest endpoint
3. Update your deployment to use the production Inngest configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Inngest functions not working**: Make sure the Inngest CLI is running (`npx inngest-cli@latest dev`)
2. **API key errors**: Verify all environment variables are set correctly
3. **GitHub OAuth issues**: Check your GitHub OAuth app configuration and callback URLs
4. **E2B connection problems**: Ensure your E2B API key is valid and has sufficient credits

### Getting Help

- Check the [Inngest Documentation](https://www.inngest.com/docs)
- Visit [VibeKit Documentation](https://vibekit.dev/docs)
- Review [Next.js Documentation](https://nextjs.org/docs)

---

Built with ❤️ using Next.js, VibeKit, and Inngest
