import { launch } from 'puppeteer';
import { readFile } from 'fs/promises';

const STEP_TYPE_MAP = {
  autocomplete: 'autocomplete_steps',
  url: 'url_steps'
};

class RecipeEngine {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await launch();
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(process.env.USER_AGENT);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async executeRecipe(recipe, stepType, input = '') {
    if (!this.page) {
      throw new Error('RecipeEngine not initialized');
    }

    const recipeStepType = STEP_TYPE_MAP[stepType];
    if (!recipeStepType) {
      throw new Error(`Invalid step type: ${stepType}`);
    }

    const results = [];
    const steps = recipe[recipeStepType] || [];

    for (const step of steps) {
      if (step.config && step.config.loop) {
        const { from, to, step: loopStep } = step.config.loop;
        for (let i = from; i <= to; i += loopStep) {
          const loopResult = await this.executeStep(step, input, i);
          this.addToResults(results, loopResult, i);
        }
      } else {
        const stepResult = await this.executeStep(step, input);
        this.addToResults(results, stepResult);
      }
    }

    // Final pass to replace any remaining placeholders
    return results.map(result => {
      const finalResult = {};
      for (const [key, value] of Object.entries(result)) {
        finalResult[key] = this.replacePlaceholders(value, input);
      }
      return finalResult;
    });
  }

  addToResults(results, stepResult, index) {
    if (index !== undefined) {
      if (!results[index - 1]) results[index - 1] = {};
      Object.assign(results[index - 1], stepResult);
    } else {
      results.push(stepResult);
    }
  }

  async executeStep(step, input, loopIndex) {
    const result = {};
    const replacedStep = JSON.parse(JSON.stringify(step));
    
    for (const [key, value] of Object.entries(replacedStep)) {
      if (typeof value === 'string') {
        replacedStep[key] = this.replacePlaceholders(value, input, loopIndex);
      }
    }

    switch (replacedStep.command) {
      case 'load':
        if (replacedStep.url) {
          await this.page.goto(replacedStep.url);
        }
        break;
      case 'store_attribute':
        if (replacedStep.locator && replacedStep.attribute_name && replacedStep.output) {
          const elements = await this.page.$$(replacedStep.locator);
          if (elements.length > 0) {
            const attributeValue = await elements[0].evaluate(
              (el, attr) => el.getAttribute(attr),
              replacedStep.attribute_name
            );
            result[replacedStep.output.name] = attributeValue || '';
          }
        }
        break;
      case 'store_text':
        if (replacedStep.locator && replacedStep.output) {
          const elements = await this.page.$$(replacedStep.locator);
          if (elements.length > 0) {
            const text = await elements[0].evaluate(el => el.textContent);
            result[replacedStep.output.name] = text ? text.trim() : '';
          }
        }
        break;
      // Add more commands as needed
    }

    return result;
  }

  replacePlaceholders(str, input, loopIndex) {
    return str.replace(/\$([A-Z_]+|i)/g, (match, p1) => {
      if (p1 === 'INPUT') return input;
      if (p1 === 'i') return loopIndex !== undefined ? loopIndex.toString() : match;
      return process.env[p1] || match;
    });
  }
}

async function loadRecipe(recipePath) {
  const recipeContent = await readFile(recipePath, 'utf-8');
  return JSON.parse(recipeContent);
}

async function main() {
  const args = Bun.argv.slice(2);
  const parsedArgs = {};
  for (let i = 0; i < args.length; i += 2) {
    parsedArgs[args[i].replace('--', '')] = args[i + 1];
  }

  if (!parsedArgs.recipe || !parsedArgs.type) {
    console.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
    console.error('Example for URL steps: bun run engine.js --recipe ./recipes/example.json --type url');
    console.error('Example for autocomplete steps: bun run engine.js --recipe ./recipes/example.json --type autocomplete --input "search term"');
    process.exit(1);
  }

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;

  if (!STEP_TYPE_MAP[stepType]) {
    console.error(`Invalid step type: ${stepType}`);
    console.error('Step type must be either "url" or "autocomplete"');
    process.exit(1);
  }

  let engine;
  try {
    const recipe = await loadRecipe(recipePath);
    engine = new RecipeEngine();
    await engine.initialize();

    const results = await engine.executeRecipe(recipe, stepType, input);
    console.log('Recipe execution results:');
    results.forEach((result, index) => {
      console.log(`Result ${index + 1}:`, result);
    });
  } catch (error) {
    console.error('Error executing recipe:', error);
  } finally {
    if (engine) {
      await engine.close();
    }
  }
}

main();