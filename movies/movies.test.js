import { expect, test, describe } from "bun:test";
import { execSync } from "child_process";

describe("tmdb.json", () => {
  test("--type autocomplete", () => {
    const output = execSync(
      "bun Engine/engine.js --recipe movies/tmdb.json --type autocomplete --input \"Matrix\""
    ).toString();

    const results = JSON.parse(output);

    // Generic validations
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Find the Matrix entry
    const matrixEntry = results.find(item => 
      Object.entries(item).some(([key, value]) => 
        key.startsWith('TITLE') && value === 'Matrix' && 
        item[key.replace('TITLE', 'SUBTITLE')] === '1998'
      )
    );

    expect(matrixEntry).toBeDefined();

    const suffix = Object.keys(matrixEntry)
      .find(key => key.startsWith('TITLE') && matrixEntry[key] === 'Matrix')
      .slice(-1);

    // Assert specific values
    expect(matrixEntry[`COVER${suffix}`]).toMatch(/^https:\/\/.*\.(jpg|jpeg|png|webp)$/i);
    expect(matrixEntry[`TITLE${suffix}`]).toBe("Matrix");
    expect(matrixEntry[`YEAR${suffix}`]).toBe("December 31, 1998");
    expect(matrixEntry[`SUBTITLE${suffix}`]).toBe("1998");
    expect(matrixEntry[`URL${suffix}`]).toMatch(/^https:\/\/www\.themoviedb\.org\/movie\/.*matrix.*$/i);
  });

  test("--type url'", () => {
    const output = execSync(
      "bun Engine/engine.js --recipe movies/tmdb.json --type url --input \"https://www.themoviedb.org/movie/555879-matrix?language=en-US\""
    ).toString();

    const result = JSON.parse(output);

    // Generic validations
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);

    // Assert specific values
    expect(result.URL).toBe("https://www.themoviedb.org/movie/555879-matrix?language=en-US");
    expect(result.TITLE).toBe("Matrix");
    expect(result.DATE).toBe("1998");
    expect(result.DESCRIPTION).toBe("The film is composed of receding planes in a landscape: a back garden and the houses beyond. The wooden lattice fence, visible in the image, marks the border between enclosed and open, private and public space, and forms both a fulcrum for the work and a formal grid by which the shots are framed and organised.");
    expect(result.GENRE).toBe("");
    expect(result.DURATION).toBe("7m");
    expect(result.RATING).toBe("7.0");
    expect(result.AUTHOR).toBe("Nicky Hamlyn");
    expect(result.COVER).toBe("https://image.tmdb.org/t/p/w600_and_h900_bestv2/AfFD10ZqEx2vkxM2yvRZkybsGB7.jpg");

    // Additional checks for new fields
    expect(result.AUX_RATING_PERCENT).toBe("70");
    expect(result.AUX_RATING_UNITS).toBe("7");
    expect(result.AUX_RATING_DEC).toBe("0");
    expect(result.AUX_PROVIDER).toBe("");
    expect(result.TAGS).toBe("");
  });
});
