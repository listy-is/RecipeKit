import { launch } from 'puppeteer';
import { readFile } from 'fs/promises';

class Logger {
  constructor(isDebug = false) {
    this.isDebug = isDebug;
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
    const value = this.variables[key] || process.env[key];
    logger.log(`Getting variable: ${key}, Value: ${value}`);
    return value;
  }

  updateFromResult(result) {
    for (const [key, value] of Object.entries(result)) {
      this.set(key, value);
    }
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
    replacedStep.loopIndex = loopIndex;
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
      case 'regex':
        await this.executeRegexStep(replacedStep, result);
        break;
      case 'store':
        await this.executeStoreStep(replacedStep, result);
        break;
      case 'api_request':
        await this.executeApiRequestStep(replacedStep, result);
        break;
      case 'json_store_text':
        await this.executeJsonStoreTextStep(replacedStep, result);
        break;
      case 'url_encode':
        await this.executeUrlEncodeStep(replacedStep, result);
        break;
      // Add other step types here
      default:
        logger.warn(`Unknown step command: ${replacedStep.command}`);
    }

    logger.log(`Step result:`, result);
    this.variableManager.updateFromResult(result);
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
        const outputName = step.output.name.replace('$i', step.loopIndex || '');
        result[outputName] = attributeValue || '';
      }
    }
  }

  async executeRegexStep(step, result) {
    if (step.input && step.expression && step.output) {
      const inputKey = step.input.replace('$', '');
      const input = this.variableManager.get(inputKey);
      logger.log(`Regex step - Input key: ${inputKey}, Input value: ${input}`);
      
      if (input === undefined || input === null) {
        logger.warn(`Input for regex step is undefined or null: ${inputKey}`);
        return;
      }
      
      const regex = new RegExp(step.expression);
      const match = input.toString().match(regex);
      if (match && match[1]) {
        result[step.output.name] = match[1];
        logger.log(`Regex match found: ${match[1]}`);
      } else {
        logger.warn(`No regex match found for expression: ${step.expression}`);
      }
    } else {
      logger.warn('Regex step is missing required properties');
    }
  }

  async executeStoreStep(step, result) {
    if (step.input && step.output) {
      let inputValue = step.input;
      
      // Check if the input contains any variables to replace
      const variableMatches = inputValue.match(/\$([A-Z0-9_]+)/g);
      if (variableMatches) {
        for (const match of variableMatches) {
          const variableName = match.substring(1); // Remove the $ prefix
          const variableValue = this.variableManager.get(variableName);
          if (variableValue !== undefined) {
            inputValue = inputValue.replace(match, variableValue);
          } else {
            logger.warn(`Variable not found: ${variableName}`);
          }
        }
      }
      
      const outputName = step.output.name.replace('$i', step.loopIndex || '');
      result[outputName] = inputValue;
      logger.log(`Store step executed successfully. Output: ${outputName} = ${inputValue}`);
    }
  }

  async executeApiRequestStep(step, result) {
    if (step.url && step.output) {
      const response = await fetch(step.url, step.config);
      const data = await response.json();
      result[step.output.name] = data;
    }
  }

  async executeJsonStoreTextStep(step, result) {
    if (step.input && step.locator && step.output) {
      const data = JSON.parse(this.variableManager.get(step.input));
      const value = step.locator.split('.').reduce((obj, key) => obj && obj[key], data);
      result[step.output.name] = value;
    }
  }

  async executeUrlEncodeStep(step, result) {
    if (step.input && step.output) {
      result[step.output.name] = encodeURIComponent(step.input);
    }
  }
}

class RecipeEngine {
  constructor(options = {}) {
    this.browserManager = new BrowserManager();
    this.variableManager = new VariableManager();
    this.stepExecutor = new StepExecutor(this.browserManager, this.variableManager);
    this.options = options;
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
      const resultIndex = index - 1; // Adjust index to start from 0
      if (!results[resultIndex]) {
        results[resultIndex] = {};
      }
      for (const [key, value] of Object.entries(stepResult)) {
        const newKey = key.replace('$i', index.toString());
        results[resultIndex][newKey] = value;
      }
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
  let isDebug = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--debug') {
      isDebug = true;
    } else if (args[i].startsWith('--')) {
      parsedArgs[args[i].replace('--', '')] = args[i + 1];
      i++;
    }
  }

  // Set the debug flag for the logger
  logger.isDebug = isDebug;
  console.log('Logger debug flag:', logger.isDebug);

  if (!parsedArgs.recipe || !parsedArgs.type) {
    logger.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
    process.exit(1);
  }

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;

  const additionalOptions = {
    debug: parsedArgs.debug === 'true',
    timeout: parseInt(parsedArgs.timeout) || 30000,
    userAgent: parsedArgs.userAgent || process.env.USER_AGENT
  };

  let engine;
  try {
    const recipe = await loadRecipe(recipePath);
    logger.log('Loaded recipe:', JSON.stringify(recipe, null, 2));

    engine = new RecipeEngine(additionalOptions);
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
    if (error instanceof SyntaxError) {
      logger.error('Error parsing recipe JSON:', error);
    } else if (error instanceof TypeError) {
      logger.error('Error executing recipe steps:', error);
    } else {
      logger.error('Unexpected error:', error);
    }
  } finally {
    if (engine) {
      await engine.close();
    }
  }
}

main();