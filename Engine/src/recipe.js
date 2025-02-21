import { BrowserManager } from './browser.js';
import { StepExecutor } from './commands.js';
import { Log } from './logger.js';

export class RecipeEngine {

  static VARIABLE_NAMES = {
    INPUT: 'INPUT',
    SYSTEM_LANGUAGE: 'SYSTEM_LANGUAGE',
    SYSTEM_REGION: 'SYSTEM_REGION',
    VARIABLE_START_CHAR: '$'
  };

  constructor() {

    this.variables = {};
    this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_LANGUAGE, process.env.SYSTEM_LANGUAGE);
    this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_REGION, process.env.SYSTEM_REGION);
    this.set(RecipeEngine.VARIABLE_NAMES.INPUT, '');

    this.browserManager = new BrowserManager();
    this.stepExecutor = new StepExecutor(this.browserManager, this);
  }

  push(key, value) {
    // Initialize the array if it doesn't exist
    if (!this.variables[key]) {
      this.variables[key] = [];
    }
    this.variables[key].push(value);
  }

  set(key, value) {
    this.variables[key] = value;
  }

  get(key, defaultValue = '') {
    const rawKey = key.replace(RecipeEngine.VARIABLE_NAMES.VARIABLE_START_CHAR, '');
    const value = this.variables[rawKey] ?? process.env[rawKey] ?? defaultValue;
    return value;
  }

  getAllVariables() {
    return this.variables;
  }

  setInput(input) {
    let sanitizedInput = input.replace(/\\/g, '');
    this.set(RecipeEngine.VARIABLE_NAMES.INPUT, sanitizedInput);
  }

  replaceVariablesinString(str) {     
    Log.debug(`replaceVariablesinString: Checking and replacing variables in: ${str}`);
    return Object.keys(this.variables).reduce((result, variable) => {
      if (result.includes(`$${variable}`)) Log.debug(`Attempting to replace variable: ${variable} with value: ${this.get(variable)}`);
      return result.replace(`$${variable}`, this.get(variable));
    }, str);
  } 

  async initialize() {
    await this.browserManager.initialize();
  }

  async close() {
    await this.browserManager.close();
  }

  async updateHeadersFromRecipe(recipe) {
    await this.browserManager.setUserAgent(recipe.headers["User-Agent"]);
    await this.browserManager.setExtraHTTPHeaders({
      'Accept-Language': recipe.headers["Accept-Language"]
    });
  }

  matchLanguageAndRegion(recipe) {
    let matchedLanguage = recipe.languages_available.find(language => {
      return (language.toLowerCase() === this.get(RecipeEngine.VARIABLE_NAMES.SYSTEM_LANGUAGE).toLowerCase().split('_')[0])
    });

    let matchedRegion = recipe.regions_available.find(region => {
      return (region.toUpperCase() === this.get(RecipeEngine.VARIABLE_NAMES.SYSTEM_REGION).toUpperCase())
    });

    if (matchedLanguage) {
      this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_LANGUAGE, matchedLanguage);
    } else {
      this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_LANGUAGE, recipe.language_default.toLowerCase());
      Log.debug(`No language matched for: ${this.get(RecipeEngine.VARIABLE_NAMES.SYSTEM_LANGUAGE)}`);
    }

    if (matchedRegion) {
      this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_REGION, matchedRegion);
    } else {
      this.set(RecipeEngine.VARIABLE_NAMES.SYSTEM_REGION, recipe.region_default.toUpperCase());
      Log.debug(`No region matched for: ${this.get(RecipeEngine.VARIABLE_NAMES.SYSTEM_REGION)}`);
    }
  }

  async executeRecipe(recipe, stepType, input = '') {
    Log.debug(`Executing recipe for step type: ${stepType}`);
    const steps = recipe[stepType] || [];

    if (steps.length === 0) {
      Log.warn(`No steps found for step type: ${stepType}`);
      return {};
    }

    if (stepType != 'autocomplete_steps' && stepType != 'url_steps') {
      Log.warn(`Unknown step type: ${stepType}`);
      return {};
    }
    
    // When available, match the language and region of the recipe with the user ones
    if (recipe.languages_available && recipe.regions_available) this.matchLanguageAndRegion(recipe);

    // Override headers .env for recipe ones
    if (recipe.headers) this.updateHeadersFromRecipe(recipe);

    // Set the input from the user
    this.setInput(input);

    await this.executeSteps(steps);

    return this.getAllVariables();
  }

  async executeSteps(steps) {
    for (const step of steps) {
      await this.stepExecutor.execute(step);
    }
  }
}