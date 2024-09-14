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
        if (step.config.loop) {
          for (let i = step.config.loop.from; i <= step.config.loop.to; i += step.config.loop.step) {
            // Store and retrieve loop index
            this.variableManager.set(step.config.loop.index, i)

            // Execute the step
            let output = await handler.call(this, step);

            // Store the output
            let outputWithIndex = this.variableManager.checkAndReplaceLoopVariable(step.output.name, step.config.loop.index);
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
        const elements = await this.browserManager.querySelectorAll(step.locator);
        if (elements.length > 0) {
          const attributeValue = await elements[0].evaluate(
            (el, attr) => el.getAttribute(attr),
            step.attribute_name
          );
          const outputName = step.output.name.replace(`$${indexVariable}`, loopIndex);
          result[outputName] = attributeValue || '';
          Log.debug(`Stored attribute ${step.attribute_name} for ${outputName}: "${result[outputName]}"`);
        } else {
          Log.warn(`No elements found for locator: ${step.locator}`);
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
            Log.debug(`Stored text for ${step.output.name}: "${result[step.output.name]}"`);
          } else {
            Log.warn(`No elements found for locator: ${step.locator}`);
            result[step.output.name] = '';
          }
        } catch (error) {
          Log.error(`Error in store_text step: ${error.message}`);
          result[step.output.name] = '';
        }
      } else {
        Log.warn('store_text step is missing required properties');
        result[step.output.name] = '';
      }
    }
  
    async executeRegexStep(step, result, loopIndex, indexVariable) {
      if (step.input && step.expression && step.output) {
        const resolvedInput = this.variableManager.replacePlaceholders(step.input, '', loopIndex, indexVariable);
        const input = resolvedInput;
  
        const expression = step.expression.replace(/\\\\/g, '\\');
        Log.debug(`Regex step - Input: "${input}", Expression: "${expression}"`);
        
        if (input === '') {
          Log.warn(`Input for regex step is empty: ${step.input}`);
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
            Log.debug(`Regex match found for ${outputName}: "${result[outputName]}"`);
          } else {
            Log.warn(`No regex match found for expression: ${expression} on input: "${input}"`);
            result[step.output.name] = input;
          }
        } catch (error) {
          Log.error(`Error in regex step: ${error.message}`);
          result[step.output.name] = input;
        }
      } else {
        Log.warn('Regex step is missing required properties');
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
              Log.warn(`Variable not found: ${variableName}`);
            }
          }
        }
        
        const outputName = step.output.name.replace('$i', step.loopIndex || '');
        result[outputName] = inputValue;
        Log.debug(`Store step executed successfully. Output: ${outputName} = ${inputValue}`);
      }
    }
  
    async executeApiRequestStep(step) {
      if (step.url && step.output) {
        let url = this.variableManager.checkAndReplaceGenericVariables(step.url);
        const input = await fetch(url, step.config);
        const output = await input.json();
        return output;
      }
    }
  
    async executeJsonStoreTextStep(step) {
      if (step.input && step.locator && step.output) {
        const input = this.variableManager.get(step.input);
        const locator = this.variableManager.checkAndReplaceLoopVariable(step.locator, step.config.loop.index);
        const output = _.get(input, locator);
        return output
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