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
  const result = JSON.parse(output);

  // Generic validations
  if (type === "autocomplete") {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  } else if (type === "url") {
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);
  }

  return result;
}