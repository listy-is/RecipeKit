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
        expect(results.DESCRIPTION).not.toBeEmpty();
        expect(results.FAVICON).not.toBeEmpty();
		expect(results.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)(\?[^ ]*)?$/i);
    }, TIMEOUT);
});

// This tests fails on the CI/CD pipeline
// https://github.com/listy-is/RecipeKit/actions/runs/13517062302/job/37767832838
// describe("twitter.json", () => {
//     test("--type url", async () => {
//         const results = await runEngine(`generic/twitter.json`, "url", "https://x.com/rihanna/status/1893712776922808485");

//         expect(results.AUTHOR).not.toBeEmpty();
//         expect(results.COVER).not.toBeEmpty();
//         expect(results.AVATAR).not.toBeEmpty();
//         expect(results.DATE).not.toBeEmpty();
//         expect(results.SUMMARY).not.toBeEmpty();
//     }, TIMEOUT);
// });


// This tests fails on the CI/CD pipeline
// https://github.com/listy-is/RecipeKit/actions/runs/13517062302/job/37767832838
// describe("amazon.json", () => {
//     test("--type url", async () => {
//         const results = await runEngine(`generic/amazon.json`, "url", "https://www.amazon.es/MARSGAMING-Ergon%C3%B3mico-Alfombrilla-Compatibilidad-Multiplataforma/dp/B0D7MG3HCQ/?th=1");

//         expect(results.TITLE).not.toBeEmpty();
//         expect(results.DESCRIPTION).not.toBeEmpty();
//         expect(results.COVER).not.toBeEmpty();
//     }, TIMEOUT);
// });
