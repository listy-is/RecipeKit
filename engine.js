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

  get(key, defaultValue = '') {
    const value = this.variables[key] || process.env[key] || defaultValue;
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
    const result = {};

    switch (replacedStep.command) {
      case 'load':
        await this.executeLoadStep(replacedStep);
        break;
      case 'store_attribute':
        await this.executeStoreAttributeStep(replacedStep, result);
        break;
      case 'store_text':
        await this.executeStoreTextStep(replacedStep, result);
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
      case 'initialize_variables':
        await this.executeInitializeVariablesStep(replacedStep, result);
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
    if (replacedStep.output && replacedStep.output.name) {
      replacedStep.output.name = replacedStep.output.name.replace('$i', loopIndex || '');
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

  async executeStoreTextStep(step, result) {
    if (step.locator && step.output) {
      const elements = await this.browserManager.querySelectorAll(step.locator);
      if (elements.length > 0) {
        const text = await elements[0].evaluate(el => el.textContent);
        result[step.output.name] = text ? text.trim() : '';
      }
    }
  }

  async executeRegexStep(step, result) {
    if (step.input && step.expression && step.output) {
      const inputKey = step.input.replace(/\$([A-Z_]+)\$i/, (match, p1) => {
        return `${p1}${step.loopIndex || ''}`;
      });
      const input = this.variableManager.get(inputKey);
      logger.log(`Regex step - Input key: ${inputKey}, Input value: "${input}"`);
      
      if (input === undefined || input === '') {
        logger.warn(`Input for regex step is empty or undefined: ${inputKey}`);
        result[step.output.name] = '';
        return;
      }
      
      try {
        const regex = new RegExp(step.expression);
        const match = input.toString().match(regex);
        if (match && match[1]) {
          result[step.output.name] = match[1].trim();
          logger.log(`Regex match found for ${step.output.name}: "${result[step.output.name]}"`);
        } else {
          logger.warn(`No regex match found for expression: ${step.expression} on input: "${input}"`);
          result[step.output.name] = '';
        }
      } catch (error) {
        logger.error(`Error in regex step: ${error.message}`);
        result[step.output.name] = '';
      }
    } else {
      logger.warn('Regex step is missing required properties');
      if (step.output) {
        result[step.output.name] = '';
      }
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

  async executeInitializeVariablesStep(step, result) {
    if (step.variables) {
      for (const [key, value] of Object.entries(step.variables)) {
        this.variableManager.set(key, value);
        result[key] = value;
      }
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
    const steps = recipe[stepType] || [];

    if (steps.length === 0) {
      logger.warn(`No steps found for step type: ${stepType}`);
      return {};
    }

    if (stepType === 'autocomplete_steps') {
      return await this.executeAutocompleteSteps(steps, input);
    } else {
      return await this.executeUrlSteps(steps, input);
    }
  }

  async executeAutocompleteSteps(steps, input) {
    const results = [];
    const tempResults = {};

    for (const step of steps) {
      if (step.config && step.config.loop) {
        const { from, to, step: stepSize } = step.config.loop;
        for (let i = from; i <= to; i += stepSize) {
          const result = await this.stepExecutor.execute(step, input, i);
          for (const [key, value] of Object.entries(result)) {
            if (!tempResults[i]) tempResults[i] = {};
            tempResults[i][key.replace('$i', i)] = value;
          }
        }
      } else {
        const result = await this.stepExecutor.execute(step, input);
        for (const [key, value] of Object.entries(result)) {
          for (let i = 1; i <= Object.keys(tempResults).length; i++) {
            if (!tempResults[i]) tempResults[i] = {};
            tempResults[i][key] = value;
          }
        }
      }
    }

    for (const result of Object.values(tempResults)) {
      results.push(this.cleanupResult(result));
    }

    return results;
  }

  async executeUrlSteps(steps, input) {
    const finalResult = {};

    for (const step of steps) {
      const result = await this.stepExecutor.execute(step, input);
      Object.assign(finalResult, result);
    }

    return this.cleanupResult(finalResult);
  }

  cleanupResult(result) {
    const cleanResult = {};
    for (const [key, value] of Object.entries(result)) {
      if (value !== undefined && value !== '') {
        cleanResult[key] = value;
      }
    }
    return cleanResult;
  }
}

async function loadRecipe(recipePath) {
  const recipeContent = await readFile(recipePath, 'utf-8');
  return JSON.parse(recipeContent);
}

async function parseArguments() {
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

  return { parsedArgs, isDebug };
}

function validateArguments(parsedArgs) {
  if (!parsedArgs.recipe || !parsedArgs.type) {
    logger.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
    process.exit(1);
  }
}

function getAdditionalOptions(parsedArgs) {
  return {
    debug: parsedArgs.debug === 'true',
    timeout: parseInt(parsedArgs.timeout) || 30000,
    userAgent: parsedArgs.userAgent || process.env.USER_AGENT
  };
}

async function executeRecipe(recipePath, stepType, input, additionalOptions) {
  const recipe = await loadRecipe(recipePath);
  logger.log('Loaded recipe:', JSON.stringify(recipe, null, 2));

  const engine = new RecipeEngine(additionalOptions);
  await engine.initialize();

  try {
    const stepTypeMap = {
      'autocomplete': 'autocomplete_steps',
      'url': 'url_steps'
    };

    const result = await engine.executeRecipe(recipe, stepTypeMap[stepType] || stepType, input);
    console.log("Recipe execution results:");
    if (Array.isArray(result)) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await engine.close();
  }
}

async function main() {
  const { parsedArgs, isDebug } = await parseArguments();
  logger.isDebug = isDebug;
  console.log('Logger debug flag:', logger.isDebug);

  validateArguments(parsedArgs);

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;
  const additionalOptions = getAdditionalOptions(parsedArgs);

  try {
    await executeRecipe(recipePath, stepType, input, additionalOptions);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error('Error parsing recipe JSON:', error);
    } else if (error instanceof TypeError) {
      logger.error('Error executing recipe steps:', error);
    } else {
      logger.error('Unexpected error:', error);
    }
  }
}

main();