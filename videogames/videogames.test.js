import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "imdb.json";
const INPUT = {
    AUTOCOMPLETE: "Medievil",
    URL: "https://m.imdb.com/title/tt0280928/?ref_=fn_ttl_ttl_1"
}

const ENTRY = {TITLE: "MediEvil", SUBTITLE: "1998"};

describe(RECIPE, () => {
    test("--type autocomplete", async () => {

        const results = await runEngine (`videogames/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);
        
        expect(entry.TITLE).toBe(ENTRY.TITLE);
        expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
        expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(entry.URL).toMatch(/^https:\/\/(www|m)\.imdb\.com\/title\/tt\d+\/?.*$/i);
    }, TIMEOUT);

    test("--type url", async () => {
        const result = await runEngine (`videogames/${RECIPE}`, "url", INPUT.URL);

        expect(result.TITLE).toBe(ENTRY.TITLE);
        expect(result.DATE).toBe(ENTRY.SUBTITLE);
        expect(result.DESCRIPTION).toBeDefined();
        expect(result.RATING).toBeDefined();
        expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    }, TIMEOUT);
});