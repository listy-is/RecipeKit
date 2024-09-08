import { expect, test } from "bun:test";
import { execSync } from "child_process";

test("Engine/engine.js autocomplete for 'Matrix'", () => {
  const output = execSync(
    "bun Engine/engine.js --recipe movies/tmdb.json --type autocomplete --input \"Matrix\""
  ).toString();

  const results = JSON.parse(output);

  // Generic validations
  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBeGreaterThan(0);

  // Find the Matrix entry
  const matrixEntry = results.find(item => 
    Object.entries(item).some(([key, value]) => 
      key.startsWith('TITLE') && value === 'Matrix' && 
      item[key.replace('TITLE', 'SUBTITLE')] === '1998'
    )
  );

  expect(matrixEntry).toBeDefined();

  const suffix = Object.keys(matrixEntry)
    .find(key => key.startsWith('TITLE') && matrixEntry[key] === 'Matrix')
    .slice(-1);

  // Assert specific values
  expect(matrixEntry[`COVER${suffix}`]).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
  expect(matrixEntry[`TITLE${suffix}`]).toBe("Matrix");
  expect(matrixEntry[`YEAR${suffix}`]).toBe("December 31, 1998");
  expect(matrixEntry[`SUBTITLE${suffix}`]).toBe("1998");
  expect(matrixEntry[`URL${suffix}`]).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
});