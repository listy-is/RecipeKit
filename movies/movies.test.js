import { expect, test, describe } from "bun:test";
import { runEngine, findEntry } from '../Engine/utils/test_utils.js';

describe("tmdb.json", () => {
  test("--type autocomplete", async() => {
   
    const results = await runEngine("movies/tmdb.json", "autocomplete", "Matrix");
    const entry = findEntry(results, "Matrix", "1998");
    
    expect(entry.TITLE).toBe("Matrix");
    expect(entry.SUBTITLE).toBe("1998");
    expect(entry.YEAR).toBe("December 31, 1998");
    expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(entry.URL).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
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
