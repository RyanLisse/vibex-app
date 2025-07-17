---
title: Getting Started with the Qlty CLI
slug: cli/quickstart
---

<Steps>
    ### Install the CLI

    First, install our CLI onto your local machine:

    <CodeBlocks>

```shell title="macOS & Linux"
curl https://qlty.sh | sh
```

```shell title="Windows"
powershell -c "iwr https://qlty.sh | iex"
```

</CodeBlocks>

    <div style="position: relative; padding-bottom: calc(32.94010889292196% + 41px); height: 0; width: 100%;">
        <iframe
            src="https://demo.arcade.software/pdnImPNfyJblLkMTw5o5?embed&show_copy_link=true"
            title="curl https://qlty.sh | sh"
            frameborder="0"
            loading="lazy"
            webkitAllowFullScreen
            mozAllowFullScreen
            allowFullScreen
            allow="clipboard-write"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;"
        ></iframe>
    </div>

    Qlty CLI supports macOS and Linux on X64 and ARM64, with Windows support in development.

    ### Initialize your repository

    From your Git repository, run:

    ```shell title="bash"

qlty init

````

<div style="position: relative; padding-bottom: calc(62.517006802721085% + 41px); height: 0; width: 100%;">
<iframe src="https://demo.arcade.software/wIIO4wY9U47bKAij79rG?embed&show_copy_link=true" title="qlty init" frameborder="0" loading="lazy" webkitAllowFullScreen
            mozAllowFullScreen
            allowFullScreen allow="clipboard-write" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;">
</iframe></div>

This will generate a baseline configuration based on the file types within your project and store it as `.qlty/qlty.toml` in your repository.

You can find more plugins with `qlty plugins list` and enable them with `qlty plugins enable [plugin]`.

    ### Identify code smells and review quality metrics

Check the code quality (for [supported programming languages](/languages)):

```bash title="Scan for code smells like duplication"
qlty smells --all
```

```bash title="Review a summary of quality metrics"
qlty metrics --all --max-depth=2 --sort complexity --limit 10
````

    <div style="position: relative; padding-bottom: calc(62.517006802721085% + 41px); height: 0; width: 100%;">
        <iframe
            src="https://demo.arcade.software/NHZHtbmkgrJxpbuJOb4E?embed&show_copy_link=true"
            title="qlty smells remix/app/.server/jobs"
            frameborder="0"
            loading="lazy"
            webkitAllowFullScreen
            mozAllowFullScreen
            allowFullScreen
            allow="clipboard-write"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;"
        ></iframe>
    </div>

    ### Lint your project

```bash title="Run linters on changed files on your current branch"
qlty check
```

    <div style="position: relative; padding-bottom: calc(46.054421768707485% + 41px); height: 0; width: 100%;">
        <iframe
            src="https://demo.arcade.software/jj69R7wlgRGgEL6urQJr?embed&show_copy_link=true"
            title="qlty check remix/app/.server/jobs"
            frameborder="0"
            loading="lazy"
            webkitAllowFullScreen
            mozAllowFullScreen
            allowFullScreen
            allow="clipboard-write"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;"
        ></iframe>
    </div>

```bash title="Run linters on all files"
qlty check --all
```

```bash title="Run only the shellcheck linter on all files"
qlty check --all --filter=shellcheck
```

```bash title="Run linters on the web/ folder"
qlty check web/
```

    ### Auto-format your code

```bash title="Auto-format changed files on your current branch"
qlty fmt
```

    <div style="position: relative; padding-bottom: calc(23.6734693877551% + 41px); height: 0; width: 100%;">
        <iframe
            src="https://demo.arcade.software/QXbWdDfpOFn67JHQuNE3?embed&show_copy_link=true"
            title="Arcade Flow (Thu Jul 11 2024)"
            frameborder="0"
            loading="lazy"
            webkitAllowFullScreen
            mozAllowFullScreen
            allowFullScreen
            allow="clipboard-write"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;"
        ></iframe>
    </div>

```bash title="Auto-format files in a directory"
qlty fmt web/
```

</Steps>

## Getting help

- **Learn more:** Run `qlty` for a summary of the most commonly used commands and `qlty --help` for a full list.
    - Appending `--help` to any command will provide detailed information about that command.
- **Join the community:** [Chat with us](https://qlty.sh/discord) on Discord
- **Get community support:** [Open an issue or discussion](https://github.com/qltysh/codeclimate/issues/new/choose) on GitHub

## Next steps

- [Exclude irrelevant files](/excluding-files) in your repository
- Refer to the [Analysis Configuration](/analysis-configuration) guide
- Explore the 40+ linters and security scanners [available as plugins](/plugins)
