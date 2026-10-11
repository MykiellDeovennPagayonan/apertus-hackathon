const assert = require("node:assert/strict");

const prompts = [
  "Explore trade tariffs and deadweight loss with imports",
  "Explore monopoly pricing and deadweight loss with market power",
];

async function main() {
  console.log("=== TESTING ECONOMICS PROMPTS AGAINST /api/apertus ===");
  for (const prompt of prompts) {
    console.log(`\nTesting prompt: "${prompt}"...`);
    const payload = {
      protocolVersion: 1,
      requestId: `econ-test-${Math.random().toString(36).slice(2, 9)}`,
      prompt,
      viewport: { width: 1280, height: 800 },
      active: null,
    };

    const res = await fetch("http://localhost:3000/api/apertus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = bodyText;
    }
    console.log("Response body:", JSON.stringify(data, null, 2));
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    console.log(`Result status: ${data.status}`);
    assert.ok(
      ["created", "updated"].includes(data.status),
      `Expected status 'created' or 'updated', got ${data.status}`
    );
    assert.ok(data.recipe, "Expected data.recipe to be present");
    console.log(`Recipe ID: ${data.recipe.id}`);
    console.log(`Recipe Title: ${data.recipe.title}`);
    console.log(`Nodes count: ${data.recipe.document.nodes.length}`);
    console.log(`Coverage level: ${data.coverage.level}`);
    console.log(`Learner explanation: ${data.learnerExplanation || "N/A"}`);
    console.log(`✔ [PASS] Successfully verified prompt: "${prompt}"`);
  }
  console.log("\n🎉 ALL NEW ECONOMICS PROMPTS VERIFIED SUCCESSFULLY WITH STATUS 200!\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in prompt verification:", err);
  process.exit(1);
});
