# Model Router - User Documentation

## Quick Start

```bash
# Route a task to the optimal model
node scripts/cli.js route "Summarize this article about climate change"

# Analyze task complexity without routing
node scripts/cli.js analyze "Design a microservices architecture for an e-commerce platform"

# View current routing rules
node scripts/cli.js rules
```

## How It Works

Model Router analyzes your task description to determine its complexity, then selects the most cost-effective model that can handle it well.

### Complexity Analysis

The complexity score (0.0 to 1.0) is calculated from three factors:

1. **Keyword Detection** (40% weight): Task descriptions are scanned for keywords associated with simple, moderate, or complex tasks.
2. **Context Depth** (30% weight): Longer task descriptions and context suggest higher complexity.
3. **Token Estimation** (30% weight): Expected output length influences model selection.

### Model Selection

Based on the complexity score, tasks are routed to:

| Score Range | Model | Best For |
|-------------|-------|----------|
| 0.0 - 0.35 | Haiku 4.5 | Simple tasks: summaries, extraction, classification |
| 0.3 - 0.7  | Sonnet 4.6 | Moderate tasks: analysis, code review, debugging |
| 0.65 - 1.0 | Opus 4.6 | Complex tasks: architecture, research, creative writing |

When scores fall in overlap ranges, the cheaper model is preferred (configurable).

## CLI Commands

### `route <task>`
Routes a task to the optimal model.

```bash
node scripts/cli.js route "Write unit tests for the auth module"
```

Options:
- `--config <path>` - Use custom config file
- `--format <json|text|minimal>` - Output format
- `--model <name>` - Force a specific model (bypass routing)

### `analyze <task>`
Shows complexity analysis without routing.

```bash
node scripts/cli.js analyze "Refactor the database layer"
```

### `rules`
Displays current routing rules and model configurations.

```bash
node scripts/cli.js rules
```

## Configuration

Edit `references/config.yaml` to customize routing behavior. See the file for all available options.

## Integration with OpenClaw Agents

The CLI outputs JSON by default, making it easy to integrate with agent workflows:

```bash
# In an agent script
result=$(node scripts/cli.js route "Your task here" --format minimal)
echo "Selected model: $result"
```

## Troubleshooting

- **"No matching model found"**: Check that routing-rules.json contains valid model definitions
- **Exit code 1**: Invalid input or missing task description
- **Exit code 2**: Configuration file not found or invalid
