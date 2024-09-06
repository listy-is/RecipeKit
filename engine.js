import { launch } from 'puppeteer';
import { readFile } from 'fs/promises';

class Logger {
  constructor() {
    this.isDebug = process.env.DEBUG === 'true';
  }

  log(...args) {
    if (this.isDebug) {
      console.log(...args);
    }
  }

  warn(...args) {
    if (this.isDebug) {
      console.warn(...args);
    }
  }

  error(...args) {
    console.error(...args);
  }
}

const logger = new Logger();

class BrowserManager {
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

  async loadPage(url, options) {
    try {
      await this.page.goto(url, options);
      if (options.waitUntil === 'networkidle0') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error(`Error loading page ${url}: ${error.message}`);
    }
  }

  async querySelector(selector) {
    return await this.page.$(selector);
  }

  async querySelectorAll(selector) {
    return await this.page.$$(selector);
  }
}

class VariableManager {
  constructor() {
    this.variables = {};
  }

  set(key, value) {
    this.variables[key] = value;
  }

  get(key) {
    return this.variables[key] || process.env[key];
  }

  replacePlaceholders(str, input, loopIndex) {
    return str.replace(/\$([A-Z_]+|i)/g, (match, p1) => {
      if (p1 === 'INPUT') return input;
      if (p1 === 'i') return loopIndex !== undefined ? loopIndex.toString() : match;
      return this.get(p1) || match;
    });
  }
}

class StepExecutor {
  constructor(browserManager, variableManager) {
    this.browserManager = browserManager;
    this.variableManager = variableManager;
  }

  async execute(step, input, loopIndex) {
    logger.log(`Executing step: ${step.command}`);
    const replacedStep = this.replaceStepPlaceholders(step, input, loopIndex);
    const result = {};

    switch (replacedStep.command) {
      case 'load':
        await this.executeLoadStep(replacedStep);
        break;
      case 'store_text':
        await this.executeStoreTextStep(replacedStep, result);
        break;
      case 'store_attribute':
        await this.executeStoreAttributeStep(replacedStep, result);
        break;
      // Add other step types here
      default:
        logger.warn(`Unknown step command: ${replacedStep.command}`);
    }

    logger.log(`Step result:`, result);
    return result;
  }

  replaceStepPlaceholders(step, input, loopIndex) {
    const replacedStep = JSON.parse(JSON.stringify(step));
    for (const [key, value] of Object.entries(replacedStep)) {
      if (typeof value === 'string') {
        replacedStep[key] = this.variableManager.replacePlaceholders(value, input, loopIndex);
      }
    }
    return replacedStep;
  }

  async executeLoadStep(step) {
    if (step.url) {
      const options = {
        waitUntil: step.config?.js ? 'networkidle0' : 'domcontentloaded',
        timeout: step.config?.timeout || parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT) || 30000
      };
      await this.browserManager.loadPage(step.url, options);
    }
  }

  async executeStoreTextStep(step, result) {
    if (step.locator && step.output) {
      const elements = await this.browserManager.querySelectorAll(step.locator);
      if (elements.length > 0) {
        const text = await elements[0].evaluate(el => el.textContent);
        result[step.output.name] = text ? text.trim() : '';
      }
    }
  }

  async executeStoreAttributeStep(step, result) {
    if (step.locator && step.attribute_name && step.output) {
      const elements = await this.browserManager.querySelectorAll(step.locator);
      if (elements.length > 0) {
        const attributeValue = await elements[0].evaluate(
          (el, attr) => el.getAttribute(attr),
          step.attribute_name
        );
        result[step.output.name] = attributeValue || '';
      }
    }
  }
}

class RecipeEngine {
  constructor() {
    this.browserManager = new BrowserManager();
    this.variableManager = new VariableManager();
    this.stepExecutor = new StepExecutor(this.browserManager, this.variableManager);
  }

  async initialize() {
    await this.browserManager.initialize();
  }

  async close() {
    await this.browserManager.close();
  }

  async executeRecipe(recipe, stepType, input = '') {
    logger.log(`Executing recipe for step type: ${stepType}`);
    const results = [];
    const steps = recipe[stepType] || [];

    if (steps.length === 0) {
      logger.warn(`No steps found for step type: ${stepType}`);
      return results;
    }

    logger.log(`Number of steps: ${steps.length}`);

    for (const step of steps) {
      logger.log(`Executing step: ${step.command}`);
      if (step.config && step.config.loop) {
        await this.executeLoopStep(step, input, results);
      } else {
        const stepResult = await this.stepExecutor.execute(step, input);
        this.addToResults(results, stepResult);
      }
      logger.log(`Step result:`, results[results.length - 1]);
    }

    logger.log(`Final results:`, results);
    return results;
  }

  async executeLoopStep(step, input, results) {
    logger.log(`Executing loop step: ${step.command}`);
    const { from, to, step: loopStep } = step.config.loop;
    for (let i = from; i <= to; i += loopStep) {
      const loopResult = await this.stepExecutor.execute(step, input, i);
      this.addToResults(results, loopResult, i);
      logger.log(`Loop step result (index ${i}):`, loopResult);
    }
  }

  addToResults(results, stepResult, index) {
    if (index !== undefined) {
      const resultIndex = Math.floor((index - 1) / 2);
      if (!results[resultIndex]) {
        results[resultIndex] = {};
      }
      Object.assign(results[resultIndex], stepResult);
    } else {
      results.push(stepResult);
    }
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
    logger.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
    process.exit(1);
  }

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;

  let engine;
  try {
    const recipe = await loadRecipe(recipePath);
    logger.log('Loaded recipe:', JSON.stringify(recipe, null, 2));

    engine = new RecipeEngine();
    await engine.initialize();

    const stepTypeMap = {
      'autocomplete': 'autocomplete_steps',
      'url': 'url_steps'
    };

    const results = await engine.executeRecipe(recipe, stepTypeMap[stepType] || stepType, input);
    console.log('Recipe execution results:');
    results.forEach((result, index) => {
      console.log(`Result ${index + 1}:`, result);
    });
  } catch (error) {
    logger.error('Error executing recipe:', error);
  } finally {
    if (engine) {
      await engine.close();
    }
  }
}

main();