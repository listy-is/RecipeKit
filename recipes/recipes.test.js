import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "cookpad.json";
const INPUT = {
    AUTOCOMPLETE: "Paella",
    URL: "https://www.cookpad.com/us/recipes/15546861-spanish-paella"
}
const ENTRY = { TITLE:"Spanish Paella"};

describe(RECIPE, () => {
    test("--type autocomplete", async() => {

		const result = await runEngine(`recipes/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
		const entry = findEntry(result, ENTRY.TITLE);

		expect(entry.TITLE).toBe(ENTRY.TITLE);
    	expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    	expect(entry.URL).toBeDefined();
    }, TIMEOUT);

    test("--type url", async() => {
		const result = await runEngine(`recipes/${RECIPE}`, "url", INPUT.URL);

		expect(result.TITLE).toBe(ENTRY.TITLE);
    	expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    	expect(result.INGREDIENTS).toBeDefined();
    	expect(result.STEPS).toBeDefined();
    	expect(result.COOKING_TIME).toBeDefined();
		expect(result.DINERS).toBeDefined();
    }, TIMEOUT);
});