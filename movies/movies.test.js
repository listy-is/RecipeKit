import { expect, test, describe } from "bun:test";
import { runEngine } from '../Engine/test_utils.js';

describe("tmdb.json", () => {
  test("--type autocomplete", async() => {
   
    const results = await runEngine("movies/tmdb.json", "autocomplete", "Matrix");

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

  test("--type url'", async () => {
    const result = await runEngine("movies/tmdb.json", "url", "https://www.themoviedb.org/movie/603-the-matrix?language=en-US");

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
