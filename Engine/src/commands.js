import { Log } from './logger.js';
import _ from 'lodash';

export class StepExecutor {
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
  
    async execute(step) {
      Log.debug(`Executing step: ${step.command}`);

      const handler = this.stepHandlers[step.command];

      if (handler) {
        if (step?.config?.loop) {
          for (let i = step.config.loop.from; i <= step.config.loop.to; i += step.config.loop.step) {
            // Store loop index
            this.variableManager.set(step.config.loop.index, i)

            // Execute the step
            let output = await handler.call(this, step);

            // Store the output
            let outputWithIndex = this.variableManager.replaceVariablesinString(step.output.name);
            this.variableManager.set(outputWithIndex, output);
          }
        } else {
          let output = await handler.call(this, step);
          this.variableManager.set(step.output.name, output);
        }
      } else {
        Log.warn(`Unknown step command: ${replacedStep.command}`);
      }

      Log.debug(`Step executed: ${step.command}`);
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
        // const elements = await this.browserManager.querySelectorAll(step.locator);
        // if (elements.length > 0) {
        //   const attributeValue = await elements[0].evaluate(
        //     (el, attr) => el.getAttribute(attr),
        //     step.attribute_name
        //   );
        //   const outputName = step.output.name.replace(`$${indexVariable}`, loopIndex);
        //   result[outputName] = attributeValue || '';
        //   Log.debug(`Stored attribute ${step.attribute_name} for ${outputName}: "${result[outputName]}"`);
        // } else {
        //   Log.warn(`No elements found for locator: ${step.locator}`);
        //   result[step.output.name] = '';
        // }
      }
    }
  
    async executeStoreTextStep(step, result) {
      if (step.locator && step.output) {
        // try {
        //   const elements = await this.browserManager.querySelectorAll(step.locator);
        //   if (elements.length > 0) {
        //     const text = await elements[0].evaluate(el => el.textContent);
        //     result[step.output.name] = text ? text.trim() : '';
        //     Log.debug(`Stored text for ${step.output.name}: "${result[step.output.name]}"`);
        //   } else {
        //     Log.warn(`No elements found for locator: ${step.locator}`);
        //     result[step.output.name] = '';
        //   }
        // } catch (error) {
        //   Log.error(`Error in store_text step: ${error.message}`);
        //   result[step.output.name] = '';
        // }
      } else {
        // Log.warn('store_text step is missing required properties');
        // result[step.output.name] = '';
      }
    }
  
    async executeRegexStep(step) {
      if (!step.input || !step.expression) {
        Log.warn('executeRegexStep: Missing required step properties');
        return '';
      }

      let input = this.variableManager.replaceVariablesinString(step.input);
      input = input.replace(/\\([\\/?!])/g, '$1');

      try {
        const regex = new RegExp(step.expression, 'gs');
        const matches = [...input.matchAll(regex)];

        if (matches.length === 0) {
          Log.warn(`executeRegexStep: No regex match found for expression: ${step.expression} on input: "${input}"`);
          return input;
        }

        const [fullMatch, ...captureGroups] = matches[0];
        const output = captureGroups.find(group => group !== undefined) || fullMatch;
        
        return output.trim();
      } catch (error) {
        Log.error(`executeRegexStep: Error ${error.message}`);
        return input;
      }
    }
  
    async executeStoreStep(step) {
      if (!step.input) {
        Log.warn('executeStoreStep: Missing required step properties');
        return '';
      }

      const output = this.variableManager.replaceVariablesinString(step.input);
      return output;
    }
  
    async executeApiRequestStep(step) {
      if (!step.url || !step.config) {
        Log.warn('executeApiRequestStep: Missing required step properties');
        return '';
      }

      let url = this.variableManager.replaceVariablesinString(step.url);
      const input = await fetch(url, step.config);
      const output = await input.json();
      return output;
    }
  
    async executeJsonStoreTextStep(step) {
      if (!step.input || !step.locator) {
        Log.warn('executeJsonStoreTextStep: Missing required step properties');
        return '';
      }

      const input = this.variableManager.get(step.input);
      const locator = this.variableManager.replaceVariablesinString(step.locator);
      const output = _.get(input, locator);
      return output
    }
  
    async executeUrlEncodeStep(step, result) {
      if (step.input && step.output) {
        // result[step.output.name] = encodeURIComponent(step.input);
      }
    }
  
    async executeInitializeVariablesStep(step, result) {
      if (step.variables) {
        // for (const [key, value] of Object.entries(step.variables)) {
        //   this.variableManager.set(key, value);
        //   result[key] = value;
        // }
      }
    }
  
    async executeStoreUrlStep(step, result) {
      if (step.output) {
        // result[step.output.name] = this.browserManager.page.url();
      }
    }
}