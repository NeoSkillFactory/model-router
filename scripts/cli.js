#!/usr/bin/env node

const { routeTask, getRoutingRules, analyzeComplexity, loadRoutingRules, loadConfig } = require("./model-router");
const { formatCost } = require("./utils");

function printUsage() {
  const usage = `
model-router - Automatically route tasks to optimal AI models

Usage:
  node cli.js <command> [options]

Commands:
  route <task>      Route a task to the optimal model
  analyze <task>    Analyze task complexity without routing
  rules             Display current routing rules

Options:
  --config <path>   Path to custom config file (YAML)
  --format <type>   Output format: json (default), text, minimal
  --model <name>    Force a specific model (bypass routing)
  --help            Show this help message

Examples:
  node cli.js route "Summarize this paragraph"
  node cli.js route "Design a microservices architecture" --format text
  node cli.js analyze "Write unit tests for auth module"
  node cli.js rules
`.trim();
  console.log(usage);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = { command: null, task: null, options: {} };

  let i = 0;
  // First non-flag arg is the command
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      parsed.options.help = true;
      i++;
    } else if (arg === "--config" && i + 1 < args.length) {
      parsed.options.configPath = args[i + 1];
      i += 2;
    } else if (arg === "--format" && i + 1 < args.length) {
      parsed.options.format = args[i + 1];
      i += 2;
    } else if (arg === "--model" && i + 1 < args.length) {
      parsed.options.forceModel = args[i + 1];
      i += 2;
    } else if (!parsed.command) {
      parsed.command = arg;
      i++;
    } else if (!parsed.task) {
      parsed.task = arg;
      i++;
    } else {
      // Append additional words to task
      parsed.task += " " + arg;
      i++;
    }
  }

  return parsed;
}

function formatRouteResult(result, format) {
  if (format === "minimal") {
    return result.model.id || result.model.key;
  }

  if (format === "text") {
    const lines = [];
    lines.push(`Selected Model: ${result.model.label} (${result.model.id})`);
    if (result.forced) {
      lines.push("  (forced by --model flag)");
    }
    if (result.complexity) {
      lines.push(`Complexity Score: ${result.complexity.score}`);
      lines.push(`  Pattern: ${result.complexity.breakdown.matchedPattern}`);
      if (result.complexity.breakdown.matchedKeywords.length > 0) {
        lines.push(
          `  Keywords: ${result.complexity.breakdown.matchedKeywords.join(", ")}`
        );
      }
      lines.push(
        `  Estimated Tokens: ${result.complexity.breakdown.estimatedTokens}`
      );
    }
    if (result.cost) {
      lines.push(`Estimated Cost: ${result.cost.formatted}`);
      lines.push(
        `  Input: ${result.cost.inputTokens} tokens (${formatCost(result.cost.inputCost)})`
      );
      lines.push(
        `  Output: ${result.cost.outputTokens} tokens (${formatCost(result.cost.outputCost)})`
      );
    }
    return lines.join("\n");
  }

  // Default: JSON
  return JSON.stringify(result, null, 2);
}

function formatAnalyzeResult(complexity, format) {
  if (format === "minimal") {
    return String(complexity.score);
  }

  if (format === "text") {
    const lines = [];
    lines.push(`Complexity Score: ${complexity.score}`);
    lines.push(`Pattern: ${complexity.breakdown.matchedPattern}`);
    lines.push(
      `Keyword Score: ${complexity.breakdown.keywordScore} (weight: ${complexity.breakdown.weights.keywords})`
    );
    lines.push(
      `Context Score: ${complexity.breakdown.contextScore} (weight: ${complexity.breakdown.weights.contextDepth})`
    );
    lines.push(
      `Token Score: ${complexity.breakdown.tokenScore} (weight: ${complexity.breakdown.weights.tokenEstimate})`
    );
    if (complexity.breakdown.matchedKeywords.length > 0) {
      lines.push(
        `Matched Keywords: ${complexity.breakdown.matchedKeywords.join(", ")}`
      );
    }
    lines.push(`Estimated Tokens: ${complexity.breakdown.estimatedTokens}`);
    return lines.join("\n");
  }

  return JSON.stringify(complexity, null, 2);
}

function formatRulesResult(data, format) {
  if (format === "text") {
    const lines = [];
    lines.push("=== Models ===");
    for (const [key, model] of Object.entries(data.rules.models)) {
      lines.push(
        `  ${key}: ${model.label} (${model.id}) — range: ${model.complexityRange.join("-")}, input: $${model.costPer1kInput}/1k, output: $${model.costPer1kOutput}/1k`
      );
    }
    lines.push("\n=== Task Patterns ===");
    for (const [name, pattern] of Object.entries(data.rules.taskPatterns)) {
      lines.push(
        `  ${name}: bonus=${pattern.complexityBonus}, keywords=[${pattern.keywords.join(", ")}]`
      );
    }
    lines.push("\n=== Configuration ===");
    lines.push(`  Default Model: ${data.config.defaultModel}`);
    lines.push(`  Base Complexity: ${data.config.baseComplexity}`);
    lines.push(`  Prefer Cheaper: ${data.config.costOptimization.preferCheaper}`);
    return lines.join("\n");
  }

  return JSON.stringify(data, null, 2);
}

function main() {
  const { command, task, options } = parseArgs(process.argv);
  const format = options.format || "json";

  if (options.help || !command) {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  try {
    switch (command) {
      case "route": {
        if (!task) {
          console.error("Error: Task description is required for 'route' command.");
          console.error('Usage: node cli.js route "Your task description"');
          process.exit(1);
        }
        const result = routeTask(task, options);
        console.log(formatRouteResult(result, format));
        break;
      }

      case "analyze": {
        if (!task) {
          console.error("Error: Task description is required for 'analyze' command.");
          console.error('Usage: node cli.js analyze "Your task description"');
          process.exit(1);
        }
        const rules = loadRoutingRules(options.rulesPath);
        const config = loadConfig(options.configPath);
        const complexity = analyzeComplexity(task, rules, config);
        console.log(formatAnalyzeResult(complexity, format));
        break;
      }

      case "rules": {
        const data = getRoutingRules(options);
        console.log(formatRulesResult(data, format));
        break;
      }

      default:
        console.error(`Error: Unknown command '${command}'.`);
        console.error("Available commands: route, analyze, rules");
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(err.message.includes("ENOENT") ? 2 : 1);
  }
}

main();
