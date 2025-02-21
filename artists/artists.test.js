import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "apple.json";
const INPUT = {
    AUTOCOMPLETE: "Coldplay",
    URL: "https://music.apple.com/us/artist/coldplay/471744?uo=4"
}

const ENTRY = {TITLE: "Coldplay"};

describe(RECIPE, () => {
    test("--type autocomplete", async () => {
        const results = await runEngine(`artists/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE);

        expect(entry.TITLE).toBe(ENTRY.TITLE);
        expect(entry.URL).toMatch(/^https:\/\/music\.apple\.com\/.+/i);
    }, TIMEOUT);

    test("--type url", async () => {
        const result = await runEngine(`artists/${RECIPE}`, "url", INPUT.URL);

        expect(result.AUTHOR).toBe(ENTRY.TITLE);
        expect(result.GENRE).toBeDefined();
        expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    }, TIMEOUT);
});
