const path = require("path");
const {
  estimateTokens,
  loadJson,
  loadYaml,
  clamp,
  matchKeywords,
  getContextDepthWeight,
  formatCost,
} = require("./utils");

const DEFAULT_RULES_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "routing-rules.json"
);
const DEFAULT_CONFIG_PATH = path.join(
  __dirname,
  "..",
  "references",
  "config.yaml"
);

/**
 * Load routing rules from JSON file.
 */
function loadRoutingRules(rulesPath) {
  return loadJson(rulesPath || DEFAULT_RULES_PATH);
}

/**
 * Load configuration from YAML file.
 */
function loadConfig(configPath) {
  return loadYaml(configPath || DEFAULT_CONFIG_PATH);
}

/**
 * Analyze the complexity of a task description.
 * Returns a score between 0.0 and 1.0 along with a breakdown.
 */
function analyzeComplexity(taskDescription, rules, config) {
  const tokens = estimateTokens(taskDescription);
  const weights = config.weights || {
    keywords: 0.4,
    contextDepth: 0.3,
    tokenEstimate: 0.3,
  };

  // 1. Keyword analysis
  let keywordScore = 0;
  let matchedPattern = "moderate";
  let matchedKeywords = [];
  let bestMatchCount = 0;

  for (const [patternName, pattern] of Object.entries(rules.taskPatterns)) {
    const result = matchKeywords(taskDescription, pattern.keywords);
    if (result.count > bestMatchCount) {
      bestMatchCount = result.count;
      matchedPattern = patternName;
      matchedKeywords = result.matched;
      keywordScore = config.baseComplexity + pattern.complexityBonus;
    }
  }
  keywordScore = clamp(keywordScore, 0, 1);

  // 2. Context depth analysis
  const contextWeight = getContextDepthWeight(
    tokens,
    rules.contextDepthWeights
  );
  const contextScore = clamp(config.baseComplexity + contextWeight, 0, 1);

  // 3. Token-based estimation (more tokens = likely more complex output needed)
  const tokenScore = clamp(tokens / 500, 0, 1);

  // Weighted combination
  const finalScore = clamp(
    keywordScore * weights.keywords +
      contextScore * weights.contextDepth +
      tokenScore * weights.tokenEstimate,
    0,
    1
  );

  return {
    score: Math.round(finalScore * 1000) / 1000,
    breakdown: {
      keywordScore: Math.round(keywordScore * 1000) / 1000,
      contextScore: Math.round(contextScore * 1000) / 1000,
      tokenScore: Math.round(tokenScore * 1000) / 1000,
      weights,
      matchedPattern,
      matchedKeywords,
      estimatedTokens: tokens,
    },
  };
}

/**
 * Select the best model for a given complexity score.
 */
function selectModel(complexityScore, rules, config) {
  const preferCheaper =
    config.costOptimization && config.costOptimization.preferCheaper !== false;

  const candidates = [];
  for (const [modelKey, model] of Object.entries(rules.models)) {
    const [min, max] = model.complexityRange;
    if (complexityScore >= min && complexityScore <= max) {
      candidates.push({ key: modelKey, ...model });
    }
  }

  if (candidates.length === 0) {
    // Fallback to default model from config
    const defaultKey = config.defaultModel || "sonnet";
    const fallback = rules.models[defaultKey];
    if (fallback) {
      return { key: defaultKey, ...fallback, fallback: true };
    }
    // Last resort: return the first model
    const firstKey = Object.keys(rules.models)[0];
    return { key: firstKey, ...rules.models[firstKey], fallback: true };
  }

  // Sort by cost (cheapest first) or quality (most expensive first)
  candidates.sort((a, b) => {
    if (preferCheaper) {
      return a.costPer1kInput - b.costPer1kInput;
    }
    return b.costPer1kInput - a.costPer1kInput;
  });

  return candidates[0];
}

/**
 * Estimate the cost for a given task with a selected model.
 */
function estimateCost(estimatedInputTokens, model) {
  // Assume output tokens are roughly 2x input tokens for estimation
  const estimatedOutputTokens = estimatedInputTokens * 2;
  const inputCost = (estimatedInputTokens / 1000) * model.costPer1kInput;
  const outputCost = (estimatedOutputTokens / 1000) * model.costPer1kOutput;
  return {
    inputTokens: estimatedInputTokens,
    outputTokens: estimatedOutputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    formatted: formatCost(inputCost + outputCost),
  };
}

/**
 * Main routing function. Takes a task description and returns a routing decision.
 */
function routeTask(taskDescription, options = {}) {
  if (taskDescription == null || typeof taskDescription !== "string") {
    throw new Error("Task description is required and must be a string");
  }

  const trimmed = taskDescription.trim();
  if (trimmed.length === 0) {
    throw new Error("Task description cannot be empty");
  }

  const rules = loadRoutingRules(options.rulesPath);
  const config = loadConfig(options.configPath);

  // If a model is forced, skip routing
  if (options.forceModel) {
    const forced = rules.models[options.forceModel];
    if (!forced) {
      throw new Error(
        `Unknown model: ${options.forceModel}. Available: ${Object.keys(rules.models).join(", ")}`
      );
    }
    const tokens = estimateTokens(trimmed);
    const cost = estimateCost(tokens, forced);
    return {
      model: { key: options.forceModel, ...forced },
      complexity: null,
      cost,
      forced: true,
    };
  }

  // Analyze and route
  const complexity = analyzeComplexity(trimmed, rules, config);
  const model = selectModel(complexity.score, rules, config);
  const cost = estimateCost(complexity.breakdown.estimatedTokens, model);

  return {
    model: {
      key: model.key,
      id: model.id,
      label: model.label,
      fallback: model.fallback || false,
    },
    complexity,
    cost,
    forced: false,
  };
}

/**
 * Get all routing rules for display.
 */
function getRoutingRules(options = {}) {
  const rules = loadRoutingRules(options.rulesPath);
  const config = loadConfig(options.configPath);
  return { rules, config };
}

module.exports = {
  routeTask,
  analyzeComplexity,
  selectModel,
  estimateCost,
  loadRoutingRules,
  loadConfig,
  getRoutingRules,
};
