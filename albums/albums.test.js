import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "apple.json";
const INPUT = {
    AUTOCOMPLETE: "Placebo",
    URL: "https://music.apple.com/us/album/meds/961069448?uo=4"
}
const ENTRY = { TITLE: "Meds", SUBTITLE: "Placebo" };

describe(RECIPE, () => {
  test("--type autocomplete", async() => {
   
    const results = await runEngine(`albums/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
    const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);
    
    expect(entry.TITLE).toBe(ENTRY.TITLE);
    expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
    expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(entry.URL).toMatch(/^https:\/\/music\.apple\.com\/[a-z]{2}\/album\/[^\/]+\/\d+(\?uo=4)?$/i);
  }, TIMEOUT);

  test("--type url'", async () => {
    const result = await runEngine(`albums/${RECIPE}`, "url", INPUT.URL);

    expect(result.TITLE).toBe(ENTRY.TITLE);
    expect(result.DATE).toBe("2006");
    expect(result.GENRE).toBe("Alternative");
    expect(result.AUTHOR).toBeDefined(ENTRY.SUBTITLE);
    expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);

  }, TIMEOUT);
});

