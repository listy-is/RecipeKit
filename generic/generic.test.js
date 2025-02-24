import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "generic.json";
const INPUT = {
    URL: "https://www.apple.com"
}
const ENTRY = { TITLE: "Apple",};

describe(RECIPE, () => {
    test("--type url", async () => {
        const results = await runEngine(`generic/${RECIPE}`, "url", INPUT.URL);

		expect(results.TITLE).toBe(ENTRY.TITLE);
        expect(results.DESCRIPTION).toBeDefined();
        expect(results.FAVICON).toBeDefined();
		expect(results.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)(\?[^ ]*)?$/i);
    }, TIMEOUT);
});

describe("twitter.json", () => {
    test("--type url", async () => {
        const results = await runEngine(`generic/twitter.json`, "url", "https://x.com/rihanna/status/1893712776922808485");

        expect(results.AUTHOR).toBeDefined();
        expect(results.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
        expect(results.AVATAR).toBeDefined();
        expect(results.DATE).toBeDefined();
        expect(results.SUMMARY).toBeDefined();
    }, TIMEOUT);
});


describe("amazon.json", () => {
    test("--type url", async () => {
        const results = await runEngine(`generic/amazon.json`, "url", "https://www.amazon.es/MARSGAMING-Ergon%C3%B3mico-Alfombrilla-Compatibilidad-Multiplataforma/dp/B0D7MG3HCQ/?th=1");

        expect(results.TITLE).toBeDefined();
        expect(results.DESCRIPTION).toBeDefined();
        expect(results.COVER).toBeDefined();
    }, TIMEOUT);
});
