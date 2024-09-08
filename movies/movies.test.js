import { expect, test, describe } from "bun:test";
import { execSync } from "child_process";

describe("tmdb.json", () => {
  test("--type autocomplete", () => {
    const output = execSync(
      "bun Engine/engine.js --recipe movies/tmdb.json --type autocomplete --input \"Matrix\""
    ).toString();

    const results = JSON.parse(output);

    // Generic validations
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Find the Matrix entry
    const entry = results.find(item => 
      Object.entries(item).some(([key, value]) => 
        key.startsWith('TITLE') && value === 'Matrix' && 
        item[key.replace('TITLE', 'SUBTITLE')] === '1998'
      )
    );

    expect(entry).toBeDefined();

    const suffix = Object.keys(entry)
      .find(key => key.startsWith('TITLE') && entry[key] === 'Matrix')
      .slice(-1);

    // Assert specific values
    expect(entry[`COVER${suffix}`]).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(entry[`TITLE${suffix}`]).toBe("Matrix");
    expect(entry[`YEAR${suffix}`]).toBe("December 31, 1998");
    expect(entry[`SUBTITLE${suffix}`]).toBe("1998");
    expect(entry[`URL${suffix}`]).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
  });

  test("--type url'", () => {
    const output = execSync(
      "bun Engine/engine.js --recipe movies/tmdb.json --type url --input \"https://www.themoviedb.org/movie/603-the-matrix\?language\=en-US\""
    ).toString();

    const result = JSON.parse(output);

    // Generic validations
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);

    expect(result.URL).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
    expect(result.TITLE).toBe("The Matrix");
    expect(result.DATE).toBe("1999");
    expect(result.DESCRIPTION).toBeDefined();
    // expect(result.GENRE).toBe("");
    expect(result.DURATION).toBeDefined();
    expect(result.RATING).toBeDefined();
    expect(result.AUTHOR).toBeDefined();
    expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);

    // expect(result.TAGS).toBe("");
  });
});
