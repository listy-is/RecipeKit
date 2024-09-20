import { BrowserManager } from './browser.js';
import { VariableManager } from './variables.js';
import { StepExecutor } from './commands.js';
import { Log } from './logger.js';

export class RecipeEngine {
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