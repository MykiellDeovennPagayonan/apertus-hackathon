const assert = require("node:assert/strict");

const ENDPOINT = "http://localhost:3000/api/apertus";

async function testPrompt(prompt, expectedSlug) {
  console.log(`\n========================================`);
  console.log(`Testing prompt: "${prompt}"`);
  console.log(`Target expected slug: ${expectedSlug}`);
  console.log(`Posting to ${ENDPOINT}...`);

  const startTime = Date.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocolVersion: 1,
      requestId: `chem-test-${Date.now()}`,
      prompt,
      viewport: { width: 1280, height: 900 },
      active: null,
    }),
  });

  const durationMs = Date.now() - startTime;
  console.log(`HTTP Status: ${res.status} (${durationMs} ms)`);
  assert.equal(res.status, 200, `Expected HTTP status 200, got ${res.status}`);

  const data = await res.json();
  console.log(`Response status: ${data.status}`);
  console.log(`Recipe Title: ${data.recipe?.title}`);
  console.log(`Recipe ID: ${data.recipe?.id}`);
  console.log(`Node count: ${data.recipe?.document?.nodes?.length}`);
  console.log(`Connection count: ${data.recipe?.document?.connections?.length}`);

  assert.ok(
    ["created", "updated"].includes(data.status),
    `Expected status 'created' or 'updated', got '${data.status}'`,
  );
  assert.ok(data.recipe, "Recipe object must be present in response");
  assert.ok(data.recipe.document, "Recipe document must be present");
  assert.ok(Array.isArray(data.recipe.document.nodes), "Document nodes must be an array");
  assert.ok(data.recipe.document.nodes.length > 0, "Document nodes must not be empty");

  // Verify that the recipe corresponds to our chemistry experiment
  const nodeDefs = data.recipe.document.nodes.map((n) => n.definition);
  console.log(`Node definitions:`, nodeDefs);

  const matched = nodeDefs.some((d) => d.toLowerCase().includes(expectedSlug.replace("-", "")));
  console.log(`Matched expected domain definition '${expectedSlug}': ${matched}`);
  assert.ok(
    matched || data.recipe.id.includes(expectedSlug),
    `Recipe should reference ${expectedSlug}, found definitions: ${nodeDefs.join(", ")}`,
  );

  console.log(`Test passed for "${prompt}"!`);
  return data;
}

async function run() {
  try {
    await testPrompt(
      "Explore Beer Lambert law with concentration and absorbance",
      "beer-lambert",
    );
    await testPrompt(
      "Light absorbance and transmittance through a cuvette with different concentrations",
      "beer-lambert",
    );
    await testPrompt(
      "Galvanic cell voltage with zinc and copper concentrations using Nernst equation",
      "galvanic-cell",
    );
    await testPrompt(
      "Daniell cell electrochemistry with zinc and copper half-cell concentrations",
      "galvanic-cell",
    );
    console.log(`\n========================================`);
    console.log("All chemistry prompt tests completed successfully!");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

run();
