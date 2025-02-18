import { expect, test, describe } from "bun:test";
import { runEngine, findEntry } from '../Engine/utils/test_utils.js';

const RECIPE = "apple.json";
const INPUT = {
    AUTOCOMPLETE: "Heroes",
    URL: "https://itunes.apple.com/search?media=music&entity=musicTrack&limit=1&explicit=YES&term=697651436"
}

const ENTRY = {TITLE: "Heroes (Single Version)", SUBTITLE: "David Bowie"};

describe(RECIPE, () => {
    test("--type autocomplete", async () => {

        const results = await runEngine(`songs/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
        const entry = findEntry(results, ENTRY.TITLE, ENTRY.SUBTITLE);

		expect(entry.TITLE).toBe(ENTRY.TITLE);
		expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
		expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
		expect(entry.URL).toMatch(/^https:\/\/itunes\.apple\.com\/.+/i);
	})

	test("--type url", async () => {
		const result = await runEngine(`songs/${RECIPE}`, "url", INPUT.URL);

		expect(result.TITLE).toBe(ENTRY.TITLE);
		expect(result.AUTHOR).toBe(ENTRY.SUBTITLE);
		expect(result.DATE).toBeDefined();
		expect(result.GENRE).toBeDefined();
		expect(result.PRICE).toBeDefined();
		expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
	});
});
