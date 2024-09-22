import { expect } from "bun:test";
import { spawn } from "bun";

export async function runEngine(recipe, type, input) {
  const proc = spawn([
    "bun", 
    "Engine/engine.js", 
    "--recipe", recipe, 
    "--type", type, 
    "--input", input
  ]);

  const output = await new Response(proc.stdout).text();
  const data = JSON.parse(output);
  const results = data.results;

  // Generic validations
  if (type === "autocomplete") {
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  } else if (type === "url") {
    expect(typeof results).toBe('object');
    expect(Object.keys(results).length).toBeGreaterThan(0);
  }

  return results;
}

export function findEntry(results, title, subtitle = null) {
  const entry = results.find(item => {
    if (item.TITLE !== title) return false;
    if (!subtitle) return true;
    return item.SUBTITLE === subtitle;
  });

  expect(entry).toBeDefined(`No entry found for title "${title}" ${subtitle ? `and subtitle "${subtitle}"` : ''}`);

  return entry;
}