# Container-Use: Comprehensive Documentation Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Usage](#basic-usage)
4. [Advanced Features](#advanced-features)
5. [Common Use Cases](#common-use-cases)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Integration with Dagger](#integration-with-dagger)

## Introduction

### What is Container-Use?

Container-Use is an **open-source Model Context Protocol (MCP) server** developed by Dagger that provides **isolated containerized development environments for AI coding agents**. It acts as a bridge between AI agents (like Claude Code, Cursor, and other MCP-compatible tools) and containerized development environments, allowing each agent to work in its own isolated container and Git branch.

### The Problem It Solves

Container-Use addresses the **"agent chaos"** problem that occurs when scaling AI coding agents:

**Without Container-Use:**
- **"YOLO Mode"**: Running multiple agents in the same local environment leads to conflicts, overwritten files, dependency clashes, and system instability
- **"Prompt and Pray Mode"**: Using managed agent services creates a black box with no control, limited intervention capabilities, and dependency on external infrastructure

**With Container-Use:**
- **Isolated Environments**: Each agent gets its own fresh container in a dedicated Git branch
- **Controlled Parallelization**: Multiple agents can work simultaneously without conflicts
- **Transparent Operations**: Complete visibility into what agents actually do vs. what they claim
- **Direct Intervention**: Ability to drop into any agent's terminal when needed

### Key Features
- 🔧 **Isolated Development**: Each agent works in its own containerized environment
- 👀 **Real-time Visibility**: Monitor all agent activity with `cu watch`
- 🎯 **Direct Control**: Drop into any agent's terminal with `cu exec`
- 🔄 **Git Integration**: Each environment backed by a Git branch for versioned history
- 🚀 **Parallel Execution**: Run multiple agents on different tasks simultaneously
- 🔌 **Universal Compatibility**: Works with any MCP-compatible agent

## Installation and Setup

### System Requirements

**Core Requirements:**
- Docker (must be installed and running)
- Git (for version control and branch management)
- Supported OS: macOS, Linux, Windows

**Recommended:**
- Node.js (for certain MCP integrations)
- Minimum 4GB RAM for Docker Desktop

### Installation Methods

#### Method 1: macOS via Homebrew (Recommended)
```bash
brew install dagger/tap/container-use
```

#### Method 2: Universal Installation
```bash
curl -fsSL https://raw.githubusercontent.com/dagger/container-use/main/install.sh | bash
```

#### Method 3: Build from Source
```bash
git clone https://github.com/dagger/container-use.git
cd container-use
make install && hash -r
```

### Setting Up with AI Agents

#### Claude Code Setup
```bash
# Navigate to your project directory
cd /path/to/repository

# Add Container-Use MCP server
claude mcp add container-use -- container-use stdio

# Optional: Add agent rules for better integration
curl https://raw.githubusercontent.com/dagger/container-use/main/rules/agent.md >> CLAUDE.md
```

#### Cursor Setup
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "container-use": {
      "command": "cu",
      "args": ["stdio"],
      "env": [],
      "timeout": 60000
    }
  }
}
```

#### Goose Setup
Add to `~/.config/goose/config.yaml`:
```yaml
extensions:
  container-use:
    name: container-use
    type: stdio
    enabled: true
    cmd: cu
    args: [stdio]
```

## Basic Usage

### Core Commands

The `container-use` command is also available as `cu` for convenience:

```bash
# Watch all agent activity in real-time
cu watch

# Drop into an agent's container
cu exec <environment_name>

# Alternative: Watch using git log
watch git log --remotes=container-use --oneline --graph --decorate
```

### Git Integration Commands

```bash
# Review all commands used by agents
git log --remotes=container-use --notes

# Inspect code written by agents
git log --patch container-use/<environment_name>
git diff container-use/<environment_name>

# Check out agent's work to local repository
git checkout <environment_name> && git pull

# Merge successful work into main branch
git merge container-use/<environment_name>
```

### Basic Workflow Example

```bash
# Step 1: Start monitoring (in a separate terminal)
cu watch

# Step 2: Ask your agent to perform a task
> "Create a simple Express.js server with a health check endpoint"

# Step 3: Review the agent's work
git branch -r | grep container-use
git checkout container-use/<environment_name>

# Step 4: Merge if satisfied
git checkout main
git merge container-use/<environment_name>
```

## Advanced Features

### Parallel Agent Execution

Run multiple agents simultaneously on different tasks:

```bash
# Agent 1: Backend refactoring
> "Refactor the user authentication service using best practices"

# Agent 2: Frontend updates (simultaneously)
> "Upgrade all frontend npm packages to their latest stable versions"

# Agent 3: Documentation
> "Generate API documentation from the codebase"
```

### Direct Intervention

When an agent needs help or gets stuck:

```bash
# Drop into the agent's terminal
cu exec <environment_name>

# Or connect directly to the container
docker exec -it <container_id> /bin/bash
```

### Environment Variables and Configuration

Container-Use integrates with Dagger under the hood and supports various environment configurations:

```bash
# Custom environment variables can be passed through MCP configuration
{
  "mcpServers": {
    "container-use": {
      "command": "cu",
      "args": ["stdio"],
      "env": {
        "NODE_ENV": "development",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Common Use Cases

### 1. Feature Development

Have multiple agents work on different features simultaneously:

```bash
# Agent 1: Implement user authentication
# Agent 2: Build dashboard components
# Agent 3: Create API endpoints
```

### 2. A/B Testing Implementations

Test different approaches to the same problem:

```bash
# Create two Flask implementations
> "Create a REST API using Flask with SQLAlchemy"

# Create a FastAPI alternative
> "Create the same REST API using FastAPI with async support"
```

### 3. Dependency Updates

Safely test package updates without affecting the main codebase:

```bash
> "Update all npm packages to latest versions and run tests"
```

### 4. Multi-Version Testing

Test your application against different runtime versions:

```bash
> "Test the application with Python 3.9, 3.10, and 3.11"
```

### 5. Code Refactoring

Explore different refactoring approaches:

```bash
> "Refactor the authentication module to use dependency injection"
```

## Best Practices

### 1. Agent Task Design

- **Start Small**: Begin with focused, well-defined tasks
- **Clear Instructions**: Provide specific, actionable instructions to agents
- **Incremental Development**: Build complex features incrementally

### 2. Resource Management

```bash
# Monitor container resources
docker stats

# Clean up unused containers and images
docker system prune

# Remove specific agent branches after merging
git branch -D container-use/<environment_name>
```

### 3. Workflow Organization

- **Branch Naming**: Use descriptive branch names for different agent tasks
- **Regular Reviews**: Periodically review agent work using `git log`
- **Documentation**: Keep track of what each agent is working on

### 4. Security Considerations

- **Container Isolation**: Each agent runs in its own secure container
- **Resource Limits**: Configure appropriate CPU and memory limits
- **Access Control**: Agents cannot access the host system directly
- **Audit Trail**: Complete history of agent actions via Git

### 5. Performance Optimization

- **Parallel Execution**: Leverage multiple agents for independent tasks
- **Caching**: Dagger's intelligent caching speeds up repeated operations
- **Cleanup Strategy**: Regularly clean up completed agent environments

## Troubleshooting

### Common Issues and Solutions

#### Installation Issues
**Problem**: Command not found after installation  
**Solution**: 
```bash
# Refresh PATH
hash -r
# Or restart your terminal
```

#### Docker Issues
**Problem**: Container creation failures  
**Solution**:
```bash
# Verify Docker is running
docker ps
# Check Docker daemon status
docker info
# Restart Docker if needed
```

#### Dagger Engine Issues
**Problem**: Agent environments not starting  
**Solution**:
```bash
# Check Dagger Engine status
docker ps --filter name="dagger-engine-*"

# Reset Dagger Engine if needed
DAGGER_ENGINE_DOCKER_CONTAINER="$(docker container list --all --filter 'name=^dagger-engine-*' --format '{{.Names}}')"
docker container stop "$DAGGER_ENGINE_DOCKER_CONTAINER"
docker container rm "$DAGGER_ENGINE_DOCKER_CONTAINER"
```

#### Network Issues
**Problem**: Network resolution failures after VPN changes  
**Solution**:
```bash
# Restart Dagger Engine container
DAGGER_ENGINE_DOCKER_CONTAINER="$(docker container list --all --filter 'name=^dagger-engine-*' --format '{{.Names}}')"
docker restart "$DAGGER_ENGINE_DOCKER_CONTAINER"
```

### Diagnostic Commands

```bash
# Check container-use version
cu --version

# Monitor all agent activity
cu watch

# Check Docker resources
docker system df

# Review git activity
git log --remotes=container-use --oneline --graph --decorate

# Clean up resources
docker system prune
docker volume prune
```

## Integration with Dagger

### How Container-Use Leverages Dagger

Container-Use is built on top of Dagger's container orchestration platform, providing:

1. **Composable Functions**: Environments defined as code, not static images
2. **Portability**: Same environment runs identically on laptops and CI systems
3. **Intelligent Caching**: Content-addressable caching for fast operations
4. **Cross-Platform Support**: Works consistently across different operating systems

### CI/CD Integration

Container-Use environments work seamlessly in CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Setup Container-Use
  run: |
    curl -fsSL https://raw.githubusercontent.com/dagger/container-use/main/install.sh | bash
    
- name: Run Agent Tasks
  run: |
    cu stdio &
    # Your agent commands here
```

### Integration with Other Tools

- **MCP Ecosystem**: Compatible with any MCP-supporting agent
- **Container Runtimes**: Works with Docker, containerd, and OCI-compliant runtimes
- **Version Control**: Deep Git integration for state management
- **Development Tools**: Integrates with VS Code, Cursor, and other IDEs

## Community and Support

### Resources
- **GitHub Repository**: https://github.com/dagger/container-use
- **Discord Community**: #container-use channel in Dagger Discord
- **Documentation**: Integrated with Dagger documentation
- **Issues**: Report bugs and request features on GitHub

### Development Status
Container-Use is in early development. Expect:
- Rapid iteration and improvements
- Potential breaking changes
- Incomplete documentation in some areas
- Active community support and feedback

## Conclusion

Container-Use revolutionizes AI-assisted development by solving the fundamental problem of agent isolation and control. By providing each AI agent with its own containerized environment and Git branch, it enables safe parallel development, complete transparency, and direct intervention capabilities. Whether you're working with a single agent or orchestrating multiple agents for complex tasks, Container-Use provides the infrastructure needed to scale AI-assisted development effectively.

Start with simple tasks, gradually explore parallel agent workflows, and leverage the power of isolated environments to transform your development process. The combination of Dagger's container orchestration and Git's version control creates a robust foundation for the future of AI-assisted software development.