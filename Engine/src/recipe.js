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

      // Store command INPUT
      this.variableManager.setInput(input);

      switch(stepType) {
        case 'autocomplete_steps':
          await this.executeAutocompleteSteps(steps);
        case 'url_steps':
          await this.executeUrlSteps(steps);
        default:
          Log.warn(`Unknown step type: ${stepType}`);
      }

      return this.variableManager.getAllVariables();
    }
  
    async executeAutocompleteSteps(steps) {
      for (const step of steps) {
        await this.stepExecutor.execute(step);
      }
    }
  
    async executeUrlSteps(steps) {
      for (const step of steps) {
        await this.stepExecutor.execute(step)
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
  
    cleanupResult(result) {
      return result;
    }
  }