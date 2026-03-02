const fs = require("fs");
const path = require("path");

/**
 * Estimate token count from text using a simple heuristic.
 * Approximation: ~4 characters per token for English text.
 */
function estimateTokens(text) {
  if (!text || typeof text !== "string") return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Load and parse a JSON file. Returns null on error.
 */
function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, "utf-8");
  return JSON.parse(raw);
}

/**
 * Load and parse a YAML file. Requires js-yaml.
 */
function loadYaml(filePath) {
  const yaml = require("js-yaml");
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, "utf-8");
  return yaml.load(raw);
}

/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Count occurrences of keywords from a list in the given text.
 * Returns { matched: string[], count: number }.
 */
function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
  return { matched, count: matched.length };
}

/**
 * Determine context depth category based on token count and weight config.
 */
function getContextDepthWeight(tokenCount, contextDepthWeights) {
  const entries = Object.entries(contextDepthWeights).sort(
    (a, b) => a[1].maxTokens - b[1].maxTokens
  );
  for (const [, cfg] of entries) {
    if (tokenCount <= cfg.maxTokens) {
      return cfg.weight;
    }
  }
  // Fallback: last entry
  return entries[entries.length - 1][1].weight;
}

/**
 * Format a cost value as a USD string.
 */
function formatCost(cost) {
  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`;
  }
  return `$${cost.toFixed(4)}`;
}

module.exports = {
  estimateTokens,
  loadJson,
  loadYaml,
  clamp,
  matchKeywords,
  getContextDepthWeight,
  formatCost,
};
