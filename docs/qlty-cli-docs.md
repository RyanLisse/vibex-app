# Qlty CLI Complete Documentation Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [CLI Commands Reference](#cli-commands-reference)
5. [Supported Languages and Plugins](#supported-languages-and-plugins)
6. [Configuration Guide](#configuration-guide)
7. [CI/CD Integration](#cicd-integration)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Introduction

Qlty CLI is a multi-language code quality tool for linting, auto-formatting, security scanning, and maintainability analysis. It supports **70+ static analysis tools** for **40+ programming languages** through a unified interface.

### Key Features
- **Universal tool**: Single CLI for all code quality needs
- **Git-aware**: Analyzes only changed files by default
- **Fast performance**: 3-21x faster than running tools directly
- **Free and open**: No limits on contributors or repositories
- **Cloud integration**: Optional cloud features for teams

## Installation

### macOS and Linux
```bash
curl "https://qlty.sh" | sh
```

### Windows
```powershell
powershell -c "iwr https://qlty.sh | iex"
```

### System Requirements
- **Operating Systems**: macOS, Linux, Windows
- **Architectures**: x86_64, ARM64
- **Additional**: PHP linters require PHP in `$PATH`

## Getting Started

### Quick Start
```bash
# Initialize Qlty in your repository
qlty init

# Run code quality checks
qlty check

# Auto-format code
qlty fmt

# Detect code smells
qlty smells

# View code metrics
qlty metrics
```

### Basic Workflow
1. **Initialize**: `qlty init` auto-detects languages and enables appropriate plugins
2. **Check**: `qlty check` runs linters on changed files
3. **Fix**: `qlty check --fix` applies auto-fixes
4. **Format**: `qlty fmt` reformats code according to style guides

## CLI Commands Reference

### Core Commands

#### `check` - Run linters
```bash
qlty check [OPTIONS] [PATHS]...
```

**Key Options:**
- `-a, --all` - Check all files, not just changed
- `--fix` - Apply auto-fix suggestions
- `--ai` - Generate AI fixes (requires OpenAI API key)
- `--unsafe` - Allow unsafe fixes
- `--level <LEVEL>` - Minimum issue level to show [note, fmt, low, medium, high]
- `--filter <FILTER>` - Filter by plugin or check
- `--upstream <REF>` - Compare against specific branch
- `--sarif` - Output in SARIF format

#### `fmt` - Auto-format files
```bash
qlty fmt [OPTIONS] [PATHS]...
```

**Key Options:**
- `-a, --all` - Format all files
- `--filter <FILTER>` - Filter by formatter
- `--index` - Format files in Git index

#### `metrics` - Display code quality metrics
```bash
qlty metrics [OPTIONS]
```
Shows complexity, duplication, lines of code, and other maintainability metrics.

#### `smells` - Scan for code smells
```bash
qlty smells [OPTIONS]
```
Detects duplication, complex functions, and other maintainability issues.

### Configuration Commands

#### `init` - Initialize Qlty
```bash
qlty init
```
Auto-generates `.qlty/qlty.toml` based on detected languages.

#### `config show` - Display configuration
```bash
qlty config show
```

#### `config validate` - Validate configuration
```bash
qlty config validate
```

#### `config migrate` - Migrate from Code Climate
```bash
qlty config migrate [--dry-run]
```

### Plugin Commands

#### `plugins list` - List available plugins
```bash
qlty plugins list
```

#### `plugins enable` - Enable plugins
```bash
qlty plugins enable <PLUGIN>...
```

#### `plugins disable` - Disable plugins
```bash
qlty plugins disable <PLUGIN>...
```

#### `plugins upgrade` - Upgrade plugins
```bash
qlty plugins upgrade [PLUGIN]...
```

### Coverage Commands

#### `coverage publish` - Publish coverage data
```bash
qlty coverage publish <FILES>... [OPTIONS]
```

**Options:**
- `--tag <TAG>` - Tag coverage (e.g., unit, integration)
- `--strip-prefix <PREFIX>` - Remove path prefix
- `--add-prefix <PREFIX>` - Add path prefix

### Utility Commands
- `cache clean` - Clean cache
- `cache dir` - Show cache directory
- `cache status` - Show cache status
- `completions` - Generate shell completions
- `docs` - Open documentation
- `upgrade` - Upgrade Qlty CLI
- `version` - Show version

## Supported Languages and Plugins

### Programming Languages (40+)

**Primary Languages with Full Support:**
- C# - Quality metrics, security scanning
- Go - Quality metrics, security scanning
- Java - Quality metrics, security scanning (Java 8+)
- JavaScript - Quality metrics, security scanning
- Kotlin - Quality metrics, security scanning
- PHP - Quality metrics, security scanning
- Python - Quality metrics, security scanning
- Ruby - Quality metrics, security scanning (Ruby 2.5+)
- Rust - Quality metrics, security scanning
- TypeScript - Quality metrics, security scanning

**Additional Languages:**
- C++, Dart, Elixir, Erlang, R, Swift, Apex

**Infrastructure and Configuration:**
- Docker, Terraform, CloudFormation, Kubernetes
- YAML, JSON, Markdown, SQL
- CSS/SCSS/Less, HTML, GraphQL
- Shell/Bash scripts

### Available Plugins (70+)

#### JavaScript/TypeScript
- `eslint` - Linting
- `prettier` - Formatting
- `radarlint` - Additional linting

#### Python
- `bandit` - Security
- `black` - Formatting
- `flake8` - Style checking
- `ruff` - Fast linting and formatting

#### Ruby
- `brakeman` - Rails security
- `reek` - Code smells
- `rubocop` - Style guide
- `standardrb` - Alternative style guide

#### Security and Secrets
- `gitleaks` - Secret scanning
- `osv-scanner` - Vulnerability scanning
- `semgrep` - Multi-language security
- `trivy` - Container security
- `trufflehog` - Secret detection

#### Infrastructure
- `checkov` - IaC security
- `hadolint` - Dockerfile linting
- `tflint` - Terraform linting

#### Multi-language
- `prettier` - Formatting for multiple formats
- `complexity` - Code complexity
- `duplication` - Duplicate detection

## Configuration Guide

### Configuration File Structure

Qlty uses `.qlty/qlty.toml` for configuration:

```toml
config_version = "0"

# Sources
[[source]]
name = "default"
url = "https://github.com/qltysh/qlty"
tag = "main"

# Exclusions
exclude_patterns = [
    "node_modules/**",
    "build/**",
    "dist/**",
    "*.generated.*"
]

# Test patterns
test_patterns = [
    "test/**",
    "tests/**",
    "spec/**",
    "**/*_test.*"
]

# Smell detection
[smells]
mode = "review"  # review, monitor, diff, off

[smells.duplication]
mass_threshold = 40
count_threshold = 2

[smells.high_function_complexity]
threshold = 5

# Language-specific settings
[language.javascript]
[language.javascript.smells.many_function_parameters]
threshold = 6

# Plugins
[[plugin]]
name = "eslint"
version = "8.0.0"
enabled = true
mode = "review"

# Exclusions
[[exclude]]
plugins = ["eslint"]
patterns = ["*.config.js"]

# Issue triage
[[triage]]
[triage.match]
plugins = ["eslint"]
rules = ["no-console"]
patterns = ["src/debug/**"]

[triage.set]
level = "info"
```

### Key Configuration Options

#### Smell Detection Modes
- `review` - Issues appear in PR reviews
- `monitor` - Track but don't show in PRs
- `diff` - Only show issues in changed lines
- `off` - Disable smell detection

#### Plugin Modes
- `targets` - Run on target files (default)
- `disabled` - Don't run
- `review` - Run but don't fail builds
- `observe` - Monitoring mode

#### Glob Patterns
- `*` - Match any string
- `**` - Match any path
- `?` - Match single character
- `[abc]` - Match any character in brackets
- `{a,b}` - Match alternatives

## CI/CD Integration

### GitHub Actions
```yaml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: qltysh/qlty-action/install@v1
      - uses: qltysh/qlty-action/check@v1
      - uses: qltysh/qlty-action/coverage@v1
        with:
          path: coverage.xml
```

### GitLab CI
```yaml
qlty-check:
  image: ghcr.io/qltysh/qlty:latest
  script:
    - qlty check
```

### CircleCI
```yaml
version: 2.1
orbs:
  qlty: qltysh/qlty@1.0

workflows:
  quality:
    jobs:
      - qlty/check
```

### Coverage Integration

#### Basic Upload
```bash
qlty coverage publish coverage.xml
```

#### Tagged Coverage
```bash
# Different test suites
qlty coverage publish unit.xml --tag unit
qlty coverage publish integration.xml --tag integration
```

#### Path Fixing
```bash
qlty coverage publish coverage.xml \
  --strip-prefix "/ci-workspace/" \
  --add-prefix "src/"
```

## Advanced Features

### Git Hooks
```bash
# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
qlty check
EOF
chmod +x .git/hooks/pre-commit
```

### Custom Plugins

Create a plugin definition:
```toml
[plugins.definitions.my-tool]
releases = ["my-tool"]
file_types = ["python"]
latest_version = "1.0.0"

[plugins.definitions.my-tool.drivers.lint]
script = "my-tool ${target}"
output = "sarif"
driver_type = "linter"
```

### Performance Optimization
- **Caching**: 21x faster with primed cache
- **Batching**: Process multiple files together
- **Git-aware**: Only analyze changed files
- **Concurrency**: Set with `-j, --jobs`

### Monorepo Support
```toml
# Different configs for different areas
exclude_patterns = [
    "packages/*/node_modules/",
    "apps/*/build/"
]

# Coverage tags for components
# qlty coverage publish --tag frontend
# qlty coverage publish --tag backend
```

## Troubleshooting

### Common Issues

#### Missing Dependencies
```toml
[[plugin]]
name = "eslint"
extra_packages = ["eslint-plugin-react"]
# OR
package_file = "package.json"
```

#### Custom Config Files
```toml
[[plugin]]
name = "stylelint"
config_files = [".stylelintrc", "stylelint.config.js"]
```

#### Performance Issues
- Use `--verbose` to identify slow plugins
- Increase batch size: `max_batch = 512`
- Exclude large generated files

### Debug Mode
```bash
# Detailed logs
qlty check --debug --verbose

# Check logs
tail -f .qlty/logs/qlty-cli.*

# Plugin execution details
ls .qlty/out/
```

### Error Resolution
1. Run with `--debug` and `--verbose`
2. Check `.qlty/logs/` for details
3. Review `.qlty/out/` for plugin output
4. Verify configuration with `qlty config show`
5. Test with minimal config

## Best Practices

### Development Workflow
1. **Start simple**: Begin with `qlty init`
2. **Focus on new issues**: Default analyzes only changed files
3. **Use Git hooks**: Instant feedback during development
4. **Leverage caching**: Don't clear cache unnecessarily

### Team Adoption
1. **Gradual rollout**: Start with one team/repository
2. **Communication**: Explain benefits before enabling
3. **Training**: Provide workflow documentation
4. **Monitor adoption**: Regular check-ins and tuning

### Configuration Management
1. **Version control**: Always commit `.qlty/qlty.toml`
2. **Pin versions**: Use specific plugin versions
3. **Document changes**: Clear commit messages
4. **Test changes**: Use `--sample` flag

### Performance Tips
1. **Exclude wisely**: Don't analyze generated code
2. **Batch operations**: Enable for large projects
3. **Pre-install**: Use `qlty install` when network is fast
4. **Monitor logs**: Watch for timeout warnings

### CI/CD Best Practices
1. **Cache dependencies**: Speed up builds
2. **Quality gates**: Set appropriate thresholds
3. **Coverage tags**: Track different test types
4. **Parallel execution**: Use matrix builds

## Conclusion

Qlty CLI provides a comprehensive solution for code quality management across multiple languages and frameworks. Its Git-aware execution, performance optimizations, and extensive plugin ecosystem make it an excellent choice for teams looking to improve their code quality workflows.

For additional support:
- Documentation: [docs.qlty.sh](https://docs.qlty.sh)
- Discord Community: Run `qlty discord`
- GitHub: [github.com/qltysh/qlty](https://github.com/qltysh/qlty)