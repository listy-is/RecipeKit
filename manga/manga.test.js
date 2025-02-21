import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "anisearch.json";
const INPUT = {
    AUTOCOMPLETE: "Sailor Moon",
    URL:  "https://www.anisearch.COM/manga/2869,sailor-moon"
}

const ENTRY = {TITLE: "Sailor Moon", SUBTITLE: "1991"}

describe(RECIPE, () => {
    test("--type autocomplete", async() => {
        const results = await runEngine(`manga/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);

        expect(entry.TITLE).toBe(ENTRY.TITLE);
        expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
        expect(entry.BACKGROUND).toBeDefined();
        expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(entry.URL).toMatch(/^https:\/\/www\.anisearch\.com\/manga\/.*sailor-moon.*$/i);
    }, TIMEOUT);

    test("--type url", async() => {
        const result = await runEngine(`manga/${RECIPE}`, "url", INPUT.URL);

        expect(result.TITLE).toBe(ENTRY.TITLE);
        expect(result.DATE).toBe("1991");
        expect(result.DESCRIPTION).toBeDefined();
        expect(result.RATING).toBeDefined();
        expect(result.AUTHOR).toBeDefined();
        expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(result.VOLUMES).toBeDefined();
        expect(result.ORIGINAL_TITLE).toBeDefined();
    }, TIMEOUT);
});
