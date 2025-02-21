import { expect, test, describe } from "bun:test";
import { runEngine, findEntry, loadEnvVariables } from '../Engine/utils/test_utils.js';

// Add process.env variables from the .env file
await loadEnvVariables();
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT);

const RECIPE = "goodreads.json";
const INPUT = {
    AUTOCOMPLETE: "Posdata: te quiero",
    URL: "https://www.goodreads.com/book/show/12413520-posdata",
}

const ENTRY = {
    TITLE:  "Posdata: te quiero",
    SUBTITLE:"Cecelia Ahern",
}

describe(RECIPE, () => {
    test("--type autocomplete", async ()=> {
        
    const results = await runEngine (`books/${RECIPE}`, "autocomplete", INPUT.AUTOCOMPLETE);
    const entry = findEntry(results, ENTRY.TITLE,ENTRY.SUBTITLE);

    expect(entry.TITLE).toBe(ENTRY.TITLE);
    expect(entry.SUBTITLE).toBe(ENTRY.SUBTITLE);
    expect(entry.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(entry.URL).toMatch(/^https:\/\/www\.goodreads\.com\/book\/show\/.*posdata.*$/i); 
}, TIMEOUT);

test("--type url", async ()=> {
    const result = await runEngine(`books/${RECIPE}`, "url", INPUT.URL);

    expect(result.TITLE).toBe(ENTRY.TITLE);
    expect(result.YEAR).toBeDefined();
    expect(result.PAGES).toBeDefined();
    expect(result.DESCRIPTION).toBeDefined();
    expect(result.RATING).toBeDefined();
    expect(result.AUTHOR).toBe(ENTRY.SUBTITLE);
    expect(result.COVER).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
}, TIMEOUT);
});