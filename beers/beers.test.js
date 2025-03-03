import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "untappd.json"
const INPUT = {
    AUTOCOMPLETE: "Cruzcampo",
    URL: "https://untappd.com/b/cruzcampo-cruzcampo-pilsen/399207"
}

const ENTRY = { TITLE: "Cruzcampo Pilsen", SUBTITLE: "Cruzcampo"};

describe(RECIPE, () => {
    test("--type autocomplete", async () => {

        const results = await runEngine (`beers/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);

        expect(entry.TITLE).toBe(ENTRY.TITLE);
        expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
        expect(entry.COVER).toMatch(/https:\/\/assets\.untappd\.com\/site\/beer_logos\/.*\.(jpg|png|jpeg)/);
        expect(entry.URL).toMatch(/^\/b\/.*\/\d+$/);
    }, TIMEOUT);
    
    test("--type url", async () => {
        
        const results = await runEngine (`beers/${RECIPE}`, "url", INPUT.URL);

        expect(results.TITLE).toBe(ENTRY.TITLE);
        expect(results.AUTHOR).toBe(ENTRY.SUBTITLE);
        expect(results.COVER).toMatch(/https:\/\/assets\.untappd\.com\/site\/beer_logos\/.*\.(jpg|png|jpeg)/);
        expect(results.RATING).toBeDefined();
        expect(results.STYLE).toBeDefined();
        expect(results.ALCOHOL).toBeDefined();
    }, TIMEOUT);
});