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