---
name: model-router
description: Automatically routes AI tasks to optimal models based on complexity and cost to minimize token waste and maximize budget efficiency.
version: 1.0.0
author: openclaw
tags:
  - optimization
  - routing
  - cost-reduction
  - model-selection
triggers:
  - "route this task to the best model"
  - "optimize model usage for cost"
  - "automatically select the right model"
  - "reduce token waste"
  - "set up automatic model routing"
  - "configure cost-based task routing"
---

# model-router

## 1. One-Sentence Description
Automatically routes AI tasks to optimal models based on complexity and cost to minimize token waste and maximize budget efficiency.

## 2. Core Capabilities
- **Task Complexity Analysis**: Evaluates task descriptions using keyword detection, token counting, and context depth analysis to determine complexity level (low, medium, high).
- **Cost-Optimized Model Selection**: Routes tasks to the most cost-effective model that meets quality requirements, using multi-criteria scoring.
- **CLI Accessibility**: Provides a clean command-line interface for direct usage and easy integration with scripts and pipelines.
- **Usage Tracking**: Logs routing decisions and estimated cost savings for reporting.

## 3. Configuration
- Customizable routing rules via `references/config.yaml`
- Task type-specific configurations in `assets/routing-rules.json`
- Model preference overrides via CLI flags

## 4. Integration
- Works with OpenClaw agent workflows via `sessions_spawn` or direct execution
- CLI output is machine-parseable (JSON) for downstream processing

## 5. Error Handling
- Non-zero exit codes on failure
- Descriptive error messages to stderr
- Graceful degradation to default model when routing fails

## 6. Usage

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
