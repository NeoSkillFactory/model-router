# model-router

![Audit](https://img.shields.io/badge/audit%3A%20PASS-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![OpenClaw](https://img.shields.io/badge/OpenClaw-skill-orange)

> Automatically routes AI tasks to optimal models based on complexity and cost to minimize token waste and maximize budget efficiency.

## Features

- **Task Complexity Analysis**: Evaluates task descriptions using keyword detection, token counting, and context depth analysis to determine complexity level (low, medium, high).
- **Cost-Optimized Model Selection**: Routes tasks to the most cost-effective model that meets quality requirements, using multi-criteria scoring.
- **CLI Accessibility**: Provides a clean command-line interface for direct usage and easy integration with scripts and pipelines.
- **Usage Tracking**: Logs routing decisions and estimated cost savings for reporting.

## Usage

```bash
# Route a task
node scripts/cli.js route "Summarize this short paragraph"

# Route with custom config
node scripts/cli.js route "Build a complex data pipeline" --config references/config.yaml

# Show current routing rules
node scripts/cli.js rules

# Analyze complexity only
node scripts/cli.js analyze "Write a haiku about cats"
```

## Configuration

- Customizable routing rules via `references/config.yaml`
- Task type-specific configurations in `assets/routing-rules.json`
- Model preference overrides via CLI flags

## GitHub

Source code: [github.com/NeoSkillFactory/model-router](https://github.com/NeoSkillFactory/model-router)

## License

MIT © NeoSkillFactory