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
        store_url: this.executeStoreUrlStep,
      };
    }
  
    async execute(step) {
      Log.debug(`Executing step: ${step.command}`);

      const handler = this.stepHandlers[step.command];
      const isLoop = (step?.config?.loop);

      let outputValue;
      let outputKey;

      if (!handler) {
        Log.warn(`execute: Unknown step command: ${step.command}`);
        return;
      }
      
      if (!step.output?.name) {
        Log.debug('execute: Step has no step.output defined');
      }

      if (isLoop) {
        for (let i = step.config.loop.from; i <= step.config.loop.to; i += step.config.loop.step) {
          // Store loop index
          this.variableManager.set(step.config.loop.index, i)
          
          outputKey = this.variableManager.replaceVariablesinString(step?.output?.name);
          outputValue = await handler.call(this, step);
          this.variableManager.set(outputKey, outputValue)
        }
      } else {
        outputKey = step?.output?.name;
        outputValue = await handler.call(this, step);
        this.variableManager.set(outputKey, outputValue)
      }

      Log.debug(`execute: Step executed: ${step.command}`);
    }
  
    async executeLoadStep(step) {
      if (!step.url ) {
        Log.warn('executeLoadStep: Missing required step properties');
        return '';
      }

      const url = this.variableManager.replaceVariablesinString(step.url);
      let stepTimeout = (step.config?.timeout < process.env.MIN_PAGE_LOAD_TIMEOUT) ? process.env.MIN_PAGE_LOAD_TIMEOUT : step.config?.timeout;

      const options = {
        waitUntil: step.config?.js ? 'networkidle0' : 'domcontentloaded',
        timeout: stepTimeout || parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT),
      };
      await this.browserManager.loadPage(url, options);
      
      if (step.config?.headers) await this.browserManager.setExtraHTTPHeaders(step.config.headers);
    }
  
    async executeStoreAttributeStep(step) {

      if (!step.locator && !step.attribute_name) {
        Log.warn('executeStoreAttributeStep: Missing required step properties');
        return '';
      }

      const locator = this.variableManager.replaceVariablesinString(step.locator);
      const element = await this.browserManager.querySelector(locator);
      
      if (!element) {
        Log.warn(`executeStoreAttributeStep: No elements found for locator: ${step.locator}`);
        return '';
      }

      const attributeValue = await element.evaluate((elem, attr) => elem.getAttribute(attr), step.attribute_name);

      return attributeValue;
    }
  
    async executeStoreTextStep(step) {

      if (!step.locator) {
        Log.warn('executeStoreTextStep: Missing required step properties');
        return '';
      }

      const locator = this.variableManager.replaceVariablesinString(step.locator);
      const element = await this.browserManager.querySelector(locator);

      if (!element) {
        Log.warn(`executeStoreTextStep: No elements found for locator: ${step.locator}`);
        return '';
      }

      const textValue = await element.evaluate(el => el.textContent.trim());

      return textValue;
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
          Log.debug(`executeRegexStep: No regex match found for expression: ${step.expression} on input: "${input}"`);
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
  
    async executeUrlEncodeStep(step) {
      if (!step.input) {
        Log.warn('executeUrlEncodeStep: Missing required step properties');
        return '';
      }
      return encodeURIComponent(step.input);
    }
  
    async executeStoreUrlStep(step) {
      return this.browserManager.page.url();
    }
}