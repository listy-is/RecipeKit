import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "vivino.json";
const INPUT = {
    AUTOCOMPLETE: "Opus One",
	URL: "https://www.vivino.com/ES/es/wines/164942685"
}

const ENTRY = {TITLE: "Opus One Overture", SUBTITLE: "Napa Valley·Estados Unidos"};

describe(RECIPE, () => {
	test("--type autocomplete", async () => {
		const results = await runEngine(`wines/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
		const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);

		expect(entry.TITLE).toBe(ENTRY.TITLE);
		expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
		expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
		expect(entry.URL).toBeDefined();
	}, TIMEOUT);
	
	test("--type url", async () => {
		const result = await runEngine(`wines/${RECIPE}`, "url", INPUT.URL);

		expect(result.TITLE).toBe(ENTRY.TITLE);
		expect(result.COUNTRY).toBe("Estados Unidos");
		expect(result.REGION).toBeDefined();
		expect(result.WINERY).toBeDefined();
		expect(result.RATING).toBeDefined();
		expect(result.PRICE).toBeDefined();
		expect(result.GRAPES).toBeDefined();
		expect(result.STYLE).toBeDefined();
		expect(result.DESCRIPTION).toBeDefined();
		expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
	}, TIMEOUT);
});