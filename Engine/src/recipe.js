import { BrowserManager } from './browser.js';
import { VariableManager } from './variables.js';
import { StepExecutor } from './commands.js';
import { Log } from './logger.js';

export class RecipeEngine {
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

    async updateHeadersFromRecipe(recipe) {
      await this.browserManager.setUserAgent(recipe.headers["User-Agent"]);
      await this.browserManager.setExtraHTTPHeaders({
        'Accept-Language': recipe.headers["Accept-Language"]
      });
    }

    matchLanguageAndRegion(recipe) {
      let matchedLanguage = recipe.languages_available.find(language => {
        return (language.toLowerCase() === this.variableManager.get(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE).toLowerCase().split('_')[0])
      });

      let matchedRegion = recipe.regions_available.find(region => {
        return (region.toUpperCase() === this.variableManager.get(VariableManager.VARIABLE_NAMES.SYSTEM_REGION).toUpperCase())
      });

      if (matchedLanguage) {
        this.variableManager.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, matchedLanguage);
      } else {
        this.variableManager.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, recipe.language_default.toLowerCase());
        Log.debug(`No language matched for: ${this.variableManager.get(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE)}`);
      }

      if (matchedRegion) {
        this.variableManager.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, matchedRegion);
      } else {
        this.variableManager.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, recipe.region_default.toUpperCase());
        Log.debug(`No region matched for: ${this.variableManager.get(VariableManager.VARIABLE_NAMES.SYSTEM_REGION)}`);
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
      this.updateHeadersFromRecipe(recipe);

      // Set the input from the user
      this.variableManager.setInput(input);

      await this.executeSteps(steps);

      return this.variableManager.getAllVariables();
    }
  
    async executeSteps(steps) {
      for (const step of steps) {
        await this.stepExecutor.execute(step);
      }
    }
  }