import { expect, test, describe } from "bun:test";
import { runEngine, findEntry } from '../Engine/utils/test_utils.js';

const RECIPE = "tmdb.json";
const INPUT = {
    AUTOCOMPLETE: "The Matrix",
    URL: "https://www.themoviedb.org/movie/603-the-matrix?language=en-US"
}
const ENTRY = { TITLE: "The Matrix", SUBTITLE: "1999" };

describe(RECIPE, () => {
  test("--type autocomplete", async() => {
   
    const results = await runEngine(`movies/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
    const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);
    
    expect(entry.TITLE).toBe(ENTRY.TITLE);
    expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
    expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(entry.URL).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
  });

  test("--type url'", async () => {
    const result = await runEngine(`movies/${RECIPE}`, "url", INPUT.URL);

    expect(result.TITLE).toBe(ENTRY.TITLE);
    expect(result.DATE).toBe("1999");
    expect(result.DESCRIPTION).toBeDefined();
    // expect(result.GENRE).toBe("");
    expect(result.DURATION).toBeDefined();
    expect(result.RATING).toBeDefined();
    expect(result.AUTHOR).toBeDefined();
    expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
  });
});

describe("imdb.json", () => {
  test("--type url", async () => {
    const result = await runEngine("movies/imdb.json", "url", "https://www.imdb.com/title/tt0133093/");

    expect(result.TITLE).toBe("Matrix");
    expect(result.DATE).toBe("1999");
    expect(result.DESCRIPTION).toBeDefined();
    expect(result.RATING).toBeDefined();
    expect(result.AUTHOR).toBeDefined();
    expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
  });
});
