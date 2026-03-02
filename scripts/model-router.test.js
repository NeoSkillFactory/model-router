const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  routeTask,
  analyzeComplexity,
  selectModel,
  estimateCost,
  loadRoutingRules,
  loadConfig,
  getRoutingRules,
} = require("./model-router");

const {
  estimateTokens,
  clamp,
  matchKeywords,
  formatCost,
} = require("./utils");

const RULES_PATH = path.join(__dirname, "..", "assets", "routing-rules.json");
const CONFIG_PATH = path.join(__dirname, "..", "references", "config.yaml");

// --- Utils tests ---

describe("utils", () => {
  describe("estimateTokens", () => {
    it("returns 0 for empty or null input", () => {
      assert.equal(estimateTokens(""), 0);
      assert.equal(estimateTokens(null), 0);
      assert.equal(estimateTokens(undefined), 0);
    });

    it("estimates tokens for a short string", () => {
      const tokens = estimateTokens("Hello world");
      assert.ok(tokens > 0);
      assert.equal(tokens, Math.ceil(11 / 4));
    });

    it("scales with text length", () => {
      const short = estimateTokens("Hi");
      const long = estimateTokens("This is a much longer piece of text that should produce more tokens");
      assert.ok(long > short);
    });
  });

  describe("clamp", () => {
    it("clamps below min", () => {
      assert.equal(clamp(-0.5, 0, 1), 0);
    });

    it("clamps above max", () => {
      assert.equal(clamp(1.5, 0, 1), 1);
    });

    it("passes through values in range", () => {
      assert.equal(clamp(0.5, 0, 1), 0.5);
    });
  });

  describe("matchKeywords", () => {
    it("finds matching keywords", () => {
      const result = matchKeywords("Please summarize this document", [
        "summarize",
        "extract",
        "classify",
      ]);
      assert.deepEqual(result.matched, ["summarize"]);
      assert.equal(result.count, 1);
    });

    it("finds multiple keywords", () => {
      const result = matchKeywords(
        "Summarize and classify the data, then extract the key points",
        ["summarize", "extract", "classify"]
      );
      assert.equal(result.count, 3);
    });

    it("returns empty for no matches", () => {
      const result = matchKeywords("Hello world", ["summarize", "extract"]);
      assert.equal(result.count, 0);
      assert.deepEqual(result.matched, []);
    });
  });

  describe("formatCost", () => {
    it("formats small costs with 6 decimals", () => {
      assert.equal(formatCost(0.000121), "$0.000121");
    });

    it("formats larger costs with 4 decimals", () => {
      assert.equal(formatCost(0.0500), "$0.0500");
    });
  });
});

// --- Model Router tests ---

describe("model-router", () => {
  let rules;
  let config;

  it("loads routing rules", () => {
    rules = loadRoutingRules(RULES_PATH);
    assert.ok(rules);
    assert.ok(rules.models);
    assert.ok(rules.models.haiku);
    assert.ok(rules.models.sonnet);
    assert.ok(rules.models.opus);
    assert.ok(rules.taskPatterns);
  });

  it("loads config", () => {
    config = loadConfig(CONFIG_PATH);
    assert.ok(config);
    assert.equal(config.defaultModel, "sonnet");
    assert.equal(config.baseComplexity, 0.5);
  });

  describe("analyzeComplexity", () => {
    it("scores simple tasks low", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const result = analyzeComplexity("Summarize this paragraph", rules, config);
      assert.ok(result.score < 0.4, `Expected score < 0.4 but got ${result.score}`);
      assert.equal(result.breakdown.matchedPattern, "simple");
      assert.ok(result.breakdown.matchedKeywords.includes("summarize"));
    });

    it("scores complex tasks higher", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const result = analyzeComplexity(
        "Architect and design a comprehensive microservices platform with event-driven architecture",
        rules,
        config
      );
      assert.ok(result.score > 0.3, `Expected score > 0.3 but got ${result.score}`);
      assert.equal(result.breakdown.matchedPattern, "complex");
    });

    it("scores moderate tasks in middle range", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const result = analyzeComplexity("Analyze this code for bugs", rules, config);
      assert.ok(result.score >= 0.2 && result.score <= 0.6, `Expected score in 0.2-0.6 but got ${result.score}`);
    });
  });

  describe("selectModel", () => {
    it("selects haiku for low complexity", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const model = selectModel(0.1, rules, config);
      assert.equal(model.key, "haiku");
    });

    it("selects sonnet for medium complexity", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const model = selectModel(0.5, rules, config);
      assert.equal(model.key, "sonnet");
    });

    it("selects opus for high complexity", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      const model = selectModel(0.9, rules, config);
      assert.equal(model.key, "opus");
    });

    it("prefers cheaper model in overlap range when configured", () => {
      rules = loadRoutingRules(RULES_PATH);
      config = loadConfig(CONFIG_PATH);
      // 0.33 is in overlap range for haiku (0-0.35) and sonnet (0.3-0.7)
      const model = selectModel(0.33, rules, config);
      assert.equal(model.key, "haiku");
    });
  });

  describe("estimateCost", () => {
    it("calculates cost correctly", () => {
      const model = { costPer1kInput: 0.003, costPer1kOutput: 0.015 };
      const cost = estimateCost(100, model);
      assert.equal(cost.inputTokens, 100);
      assert.equal(cost.outputTokens, 200);
      assert.ok(Math.abs(cost.inputCost - 0.0003) < 0.0001);
      assert.ok(Math.abs(cost.outputCost - 0.003) < 0.001);
      assert.ok(cost.totalCost > 0);
      assert.ok(cost.formatted.startsWith("$"));
    });
  });

  describe("routeTask", () => {
    it("routes a simple task to haiku", () => {
      const result = routeTask("Summarize this document");
      assert.equal(result.model.key, "haiku");
      assert.equal(result.forced, false);
      assert.ok(result.complexity);
      assert.ok(result.cost);
    });

    it("routes a complex task to a capable model", () => {
      const result = routeTask(
        "Design and architect a distributed system for real-time event processing with fault tolerance"
      );
      assert.ok(
        ["sonnet", "opus"].includes(result.model.key),
        `Expected sonnet or opus but got ${result.model.key}`
      );
    });

    it("respects forced model option", () => {
      const result = routeTask("Any task here", { forceModel: "opus" });
      assert.equal(result.model.key, "opus");
      assert.equal(result.forced, true);
      assert.equal(result.complexity, null);
    });

    it("throws on empty task", () => {
      assert.throws(() => routeTask(""), { message: /empty/ });
    });

    it("throws on null task", () => {
      assert.throws(() => routeTask(null), { message: /required/ });
    });

    it("throws on unknown forced model", () => {
      assert.throws(() => routeTask("test", { forceModel: "gpt-5" }), {
        message: /Unknown model/,
      });
    });
  });

  describe("getRoutingRules", () => {
    it("returns rules and config", () => {
      const data = getRoutingRules();
      assert.ok(data.rules);
      assert.ok(data.config);
      assert.ok(data.rules.models);
      assert.ok(data.config.defaultModel);
    });
  });
});
