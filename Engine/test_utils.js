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

export function findEntry(results, title, subtitle = null) {
  const entry = results.find(item => {
    const titleEntry = Object.entries(item).find(([key, value]) => key.startsWith('TITLE') && value === title);
    if (!titleEntry) return false;
    if (!subtitle) return true;
    const [titleKey] = titleEntry;
    const subtitleKey = titleKey.replace('TITLE', 'SUBTITLE');
    return item[subtitleKey] === subtitle;
  });

  expect(entry).toBeDefined(`No entry found for title "${title}" ${subtitle ? `and subtitle "${subtitle}"` : ''}`);

  const suffix = Object.keys(entry).find(key => key.startsWith('TITLE') && entry[key] === title).slice(-1);
  return Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [key.replace(suffix, ''), value])
  );
}