import { launch } from 'puppeteer';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { file } from 'bun';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

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

class VariableManager {
  static VARIABLE_NAMES = {
    INPUT: 'INPUT',
    SYSTEM_LANGUAGE: 'SYSTEM_LANGUAGE',
    SYSTEM_REGION: 'SYSTEM_REGION',
  };

  constructor() {
    this.variables = {};
    this.loadEnvVariables();
    // Initialize with environment variables
    this.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, process.env.SYSTEM_LANGUAGE);
    this.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, process.env.SYSTEM_REGION);
  }

  async loadEnvVariables() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(__dirname, '.env');

    try {
      const env = await file(envPath).text();
      const envVariables = Object.fromEntries(
        env.split('\n')
          .filter(line => line.trim() !== '' && !line.startsWith('#'))
          .map(line => line.split('=').map(part => part.trim()))
      );

      Object.assign(process.env, envVariables);
      logger.log("Environment variables loaded successfully", envVariables);
    } catch (error) {
      logger.error(`Error loading .env file from ${envPath}:`, error.message);
    }
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

  replacePlaceholders(str, input, loopIndex, indexVariable) {
    const indexRegex = new RegExp(`\\$${indexVariable}`, 'g');
    return str.replace(/\$([A-Z_]+)(\$[a-z]+)?/g, (match, p1, p2) => {
      if (p1 === VariableManager.VARIABLE_NAMES.INPUT) return input;
      if (p2) {
        // Handle variables with dynamic index suffix
        const variableName = `${p1}${loopIndex}`;
        return this.get(variableName, match);
      }
      return this.get(p1, match);
    }).replace(indexRegex, loopIndex !== undefined ? loopIndex.toString() : '$' + indexVariable);
  }
}

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

class StepExecutor {
  constructor(browserManager, variableManager) {
    this.browserManager = browserManager;
    this.variableManager = variableManager;
    this.stepHandlers = {
      load: this.executeLoadStep,
      store_attribute: this.executeStoreAttributeStep,
      store_text: this.executeStoreTextStep,
      regex: this.executeRegexStep,
      store: this.executeStoreStep,
      api_request: this.executeApiRequestStep,
      json_store_text: this.executeJsonStoreTextStep,
      url_encode: this.executeUrlEncodeStep,
      initialize_variables: this.executeInitializeVariablesStep,
      store_url: this.executeStoreUrlStep,
    };
  }

  async execute(step, input) {
    logger.log(`Executing step: ${step.command}`);
    const indexVariable = step.config?.loop?.index;
    const loopIndex = step.loopIndex;
    const replacedStep = this.replaceStepPlaceholders(step, input, loopIndex, indexVariable);
    const result = {};

    const handler = this.stepHandlers[replacedStep.command];
    if (handler) {
      await handler.call(this, replacedStep, result, loopIndex, indexVariable);
    } else {
      logger.warn(`Unknown step command: ${replacedStep.command}`);
    }

    logger.log(`Step result:`, result);
    this.variableManager.updateFromResult(result);
    return result;
  }

  replaceStepPlaceholders(step, input, loopIndex, indexVariable) {
    const replacedStep = JSON.parse(JSON.stringify(step));
    for (const [key, value] of Object.entries(replacedStep)) {
      if (typeof value === 'string') {
        replacedStep[key] = this.variableManager.replacePlaceholders(value, input, loopIndex, indexVariable);
      } else if (typeof value === 'object' && value !== null) {
        replacedStep[key] = this.replaceStepPlaceholders(value, input, loopIndex, indexVariable);
      }
    }
    return replacedStep;
  }

  async executeLoadStep(step, result) {
    if (step.url) {
      const options = {
        waitUntil: step.config?.js ? 'networkidle0' : 'domcontentloaded',
        timeout: step.config?.timeout || parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT) || 30000
      };
      await this.browserManager.loadPage(step.url, options);
    }
  }

  async executeStoreAttributeStep(step, result, loopIndex, indexVariable) {
    if (step.locator && step.attribute_name && step.output) {
      const elements = await this.browserManager.querySelectorAll(step.locator);
      if (elements.length > 0) {
        const attributeValue = await elements[0].evaluate(
          (el, attr) => el.getAttribute(attr),
          step.attribute_name
        );
        const outputName = step.output.name.replace(`$${indexVariable}`, loopIndex);
        result[outputName] = attributeValue || '';
        logger.log(`Stored attribute ${step.attribute_name} for ${outputName}: "${result[outputName]}"`);
      } else {
        logger.warn(`No elements found for locator: ${step.locator}`);
        result[step.output.name] = '';
      }
    }
  }

  async executeStoreTextStep(step, result) {
    if (step.locator && step.output) {
      try {
        const elements = await this.browserManager.querySelectorAll(step.locator);
        if (elements.length > 0) {
          const text = await elements[0].evaluate(el => el.textContent);
          result[step.output.name] = text ? text.trim() : '';
          logger.log(`Stored text for ${step.output.name}: "${result[step.output.name]}"`);
        } else {
          logger.warn(`No elements found for locator: ${step.locator}`);
          result[step.output.name] = '';
        }
      } catch (error) {
        logger.error(`Error in store_text step: ${error.message}`);
        result[step.output.name] = '';
      }
    } else {
      logger.warn('store_text step is missing required properties');
      result[step.output.name] = '';
    }
  }

  async executeRegexStep(step, result, loopIndex, indexVariable) {
    if (step.input && step.expression && step.output) {
      const resolvedInput = this.variableManager.replacePlaceholders(step.input, '', loopIndex, indexVariable);
      const input = resolvedInput;

      const expression = step.expression.replace(/\\\\/g, '\\');
      logger.log(`Regex step - Input: "${input}", Expression: "${expression}"`);
      
      if (input === '') {
        logger.warn(`Input for regex step is empty: ${step.input}`);
        result[step.output.name] = input;
        return;
      }
      
      try {
        // Use 's' flag for dot-all mode, allowing '.' to match newlines
        const regex = new RegExp(expression, 'gs');
        const matches = [...input.matchAll(regex)];
        
        if (matches.length > 0) {
          let matchResult;
          if (matches[0].length > 1) {
            // If there are capture groups, use the first non-empty one
            matchResult = matches[0].slice(1).find(group => group !== undefined);
          } else {
            // If no capture groups, use the entire match
            matchResult = matches[0][0];
          }
          
          const outputName = step.output.name.replace(`$${indexVariable}`, loopIndex);
          result[outputName] = matchResult ? matchResult.trim() : '';
          logger.log(`Regex match found for ${outputName}: "${result[outputName]}"`);
        } else {
          logger.warn(`No regex match found for expression: ${expression} on input: "${input}"`);
          result[step.output.name] = input;
        }
      } catch (error) {
        logger.error(`Error in regex step: ${error.message}`);
        result[step.output.name] = input;
      }
    } else {
      logger.warn('Regex step is missing required properties');
      result[step.output.name] = input;
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

  async executeStoreUrlStep(step, result) {
    if (step.output) {
      result[step.output.name] = this.browserManager.page.url();
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

    return stepType === 'autocomplete_steps'
      ? await this.executeAutocompleteSteps(steps, input)
      : await this.executeUrlSteps(steps, input);
  }

  async executeAutocompleteSteps(steps, input) {
    const results = [];
    const tempResults = {};

    for (const step of steps) {
      await this.executeStep(step, input, tempResults);
    }

    for (const result of Object.values(tempResults)) {
      results.push(this.cleanupResult(result));
    }

    return results;
  }

  async executeStep(step, input, tempResults) {
    if (step.config && step.config.loop) {
      await this.executeLoopStep(step, input, tempResults);
    } else {
      await this.executeNonLoopStep(step, input, tempResults);
    }
  }

  async executeLoopStep(step, input, tempResults) {
    const { from, to, step: stepSize, index: indexVariable } = step.config.loop;
    for (let i = from; i <= to; i += stepSize) {
      const loopStep = { ...step, loopIndex: i };
      const result = await this.stepExecutor.execute(loopStep, input);
      this.updateTempResults(tempResults, result, i, indexVariable);
    }
  }

  async executeNonLoopStep(step, input, tempResults) {
    const result = await this.stepExecutor.execute(step, input);
    for (let i = 1; i <= Object.keys(tempResults).length || i === 1; i++) {
      this.updateTempResults(tempResults, result, i);
    }
  }

  updateTempResults(tempResults, result, index, indexVariable) {
    if (!tempResults[index]) tempResults[index] = {};
    for (const [key, value] of Object.entries(result)) {
      const updatedKey = key.replace(`$${indexVariable}`, index);
      tempResults[index][updatedKey] = value;
    }
  }

  initializeOutputVariables(steps) {
    const outputVariables = {};
    steps.forEach(step => {
      if (step.output && step.output.name) {
        outputVariables[step.output.name] = '';
      }
    });
    return outputVariables;
  }

  async executeUrlSteps(steps, input) {
    const finalResult = this.initializeOutputVariables(steps);

    for (const step of steps) {
      const result = await this.stepExecutor.execute(step, input);
      Object.assign(finalResult, result);
    }

    return finalResult;
  }

  cleanupResult(result) {
    return result;
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
    timeout: parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT) || 30000,
    userAgent: process.env.USER_AGENT
  };
}

function colorizeJson(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"(\w+)":/g, (match, p1) => `"${chalk.cyan(p1)}":`) // Keys
             .replace(/"([^"]+)"(?=,|\n|\s*})/g, (match, p1) => `"${chalk.green(p1)}"`) // String values
             .replace(/: (\d+)(,?)/g, (match, p1, p2) => `: ${chalk.yellow(p1)}${p2}`) // Number values
             .replace(/: (true|false)(,?)/g, (match, p1, p2) => `: ${chalk.magenta(p1)}${p2}`) // Boolean values
             .replace(/: (null)(,?)/g, (match, p1, p2) => `: ${chalk.gray(p1)}${p2}`); // Null values
}

async function executeRecipe(recipePath, stepType, input, additionalOptions) {
  const recipe = await loadRecipe(recipePath);
  logger.log('Loaded recipe:', recipePath);

  const engine = new RecipeEngine(additionalOptions);
  await engine.initialize();

  try {
    const result = await engine.executeRecipe(recipe, getStepTypeKey(stepType), input);
    console.log(colorizeJson(result));
  } finally {
    await engine.close();
  }
}

function getStepTypeKey(stepType) {
  const stepTypeMap = {
    'autocomplete': 'autocomplete_steps',
    'url': 'url_steps'
  };
  return stepTypeMap[stepType] || stepType;
}

async function main() {
  const { parsedArgs, isDebug } = await parseArguments();
  logger.isDebug = isDebug;

  validateArguments(parsedArgs);

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;
  const additionalOptions = getAdditionalOptions(parsedArgs);

  try {
    await executeRecipe(recipePath, stepType, input, additionalOptions);
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (error instanceof SyntaxError) {
    logger.error('Error parsing recipe JSON:', error);
  } else if (error instanceof TypeError) {
    logger.error('Error executing recipe steps:', error);
  } else {
    logger.error('Unexpected error:', error);
  }
}

main();