import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "anisearch.json";
const INPUT = {
    AUTOCOMPLETE: "Death Note",
    URL: "https://www.anisearch.com/anime/3633,death-note"
}

const ENTRY = {
    TITLE: "Death Note", 
    SUBTITLE: "2006"
}

describe(RECIPE, () => {
    test("--type autocomplete", async() => {

        const results = await runEngine(`anime/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);

        expect(entry.TITLE).toBe(ENTRY.TITLE);
        expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
        expect(entry.BACKGROUND).toBeDefined();
        expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(entry.URL).toMatch(/^https:\/\/www\.anisearch\.com\/anime\/.*death-note.*$/i);
    }, TIMEOUT);

    test("--type url", async() => {
        const result = await runEngine(`anime/${RECIPE}`, "url", INPUT.URL);
        
        expect(result.TITLE).toBe(ENTRY.TITLE);
        expect(result.DATE).toBe(ENTRY.SUBTITLE);
        expect(result.DESCRIPTION).toBeDefined();
        expect(result.RATING).toBeDefined();
        expect(result.AUTHOR).toBeDefined();
        expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(result.EPISODES).toBeDefined();
        expect(result.ORIGINAL_TITLE).toBeDefined();
    }, TIMEOUT);
});

describe("anidb.json", () => {
    test("--type url", async() => {
        const results = await runEngine(`anime/anidb.json`, "url", "https://anidb.net/anime/4563");

        expect(results.TITLE).toBe("Death Note");
        // expect(results.DATE).toBe("2006"); // TODO: Add date to the test
        expect(results.DESCRIPTION).toBeDefined();
        expect(results.RATING).toBeDefined();
        expect(results.AUTHOR).toBeDefined();
        expect(results.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(results.EPISODES).toBeDefined();
    }, TIMEOUT);
});