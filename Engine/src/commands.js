import { Log } from './logger.js';
import _ from 'lodash';

export class StepExecutor {
    constructor(BrowserManager, RecipeEngine) {
      this.BrowserManager = BrowserManager;
      this.RecipeEngine = RecipeEngine;
      this.stepHandlers = {
        load: this.executeLoadStep,
        store_attribute: this.executeStoreAttributeStep,
        store_text: this.executeStoreTextStep,
        store_array: this.executeStoreArrayStep,
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
      const storeAsArray = (step?.command === 'store_array');

      let outputValue;
      let outputKey;

      if (!handler) {
        Log.error(`execute: Unknown step command: ${step.command}`);
        return;
      }
      
      if (!step.output?.name) {
        Log.debug('execute: Step has no step.output defined');
      }

      if (isLoop) {
        for (let i = step.config.loop.from; i <= step.config.loop.to; i += step.config.loop.step) {
          // Store loop index
          this.RecipeEngine.set(step.config.loop.index, i)
          outputKey = this.RecipeEngine.replaceVariablesinString(step?.output?.name);

          if (storeAsArray) {
            outputValue = await handler.call(this, step);
            if (outputValue !== '') this.RecipeEngine.push(outputKey, outputValue);
          } else {
            outputValue = await handler.call(this, step);
            this.RecipeEngine.set(outputKey, outputValue)
          }
        }
      } else {
        outputKey = step?.output?.name;

        if (storeAsArray) {
          outputValue = await handler.call(this, step);
          if (outputValue !== '') this.RecipeEngine.push(outputKey, outputValue);
        } else {
          outputValue = await handler.call(this, step);
          this.RecipeEngine.set(outputKey, outputValue);
        }
      }

      Log.debug(`execute: Step executed: ${step.command}`);
    }
  
    async executeLoadStep(step) {
      if (!step.url ) {
        Log.error('executeLoadStep: Missing required step properties');
        return '';
      }

      const url = this.RecipeEngine.replaceVariablesinString(step.url);
      let stepTimeout = (step.config?.timeout < process.env.MIN_PAGE_LOAD_TIMEOUT) ? process.env.MIN_PAGE_LOAD_TIMEOUT : step.config?.timeout;

      const options = {
        waitUntil: step.config?.js ? 'networkidle0' : 'domcontentloaded',
        timeout: stepTimeout || parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT),
      };

      if (step.config?.headers) {
        let replacedHeaders = JSON.stringify(step.config.headers);
        replacedHeaders = this.RecipeEngine.replaceVariablesinString(replacedHeaders);
        await this.BrowserManager.setExtraHTTPHeaders(JSON.parse(replacedHeaders));
      }
      
      if (step.config?.headers?.['Cookie']) {
        let cookie = this.RecipeEngine.replaceVariablesinString(step.config.headers["Cookie"]);
        let cookieParts = cookie.split("=");
        let domain = new URL(url).hostname;

        await this.BrowserManager.setCookies([
          { name: cookieParts[0], value: cookieParts[1], domain: domain }
        ]);
      }

      await this.BrowserManager.loadPage(url, options);
      Log.debug(`executeLoadStep: Page loaded: ${url} with options: ${JSON.stringify(options)} and headers: ${JSON.stringify(step.config?.headers)}`);
    }
  
    async executeStoreAttributeStep(step) {

      if (!step.locator && !step.attribute_name) {
        Log.error('executeStoreAttributeStep: Missing required step properties');
        return '';
      }

      const locator = this.RecipeEngine.replaceVariablesinString(step.locator);
      const element = await this.BrowserManager.querySelector(locator);
      
      if (!element) {
        Log.debug(`executeStoreAttributeStep: No elements found for locator: ${locator}`);
        return '';
      }

      const attributeValue = await element.evaluate((elem, attr) => elem.getAttribute(attr), step.attribute_name);

      return attributeValue;
    }
  
    async executeStoreTextStep(step) {

      if (!step.locator) {
        Log.error('executeStoreTextStep: Missing required step properties');
        return '';
      }

      const locator = this.RecipeEngine.replaceVariablesinString(step.locator);
      const element = await this.BrowserManager.querySelector(locator);

      if (!element) {
        Log.debug(`executeStoreTextStep: No elements found for locator: ${step.locator}`);
        return '';
      }

      const textValue = await element.evaluate(el => el.textContent.trim());

      return textValue;
    }

    async executeStoreArrayStep(step) {
      if (!step.locator) {
        Log.error('executeStoreArrayStep: Missing required step properties');
        return '';
      }

      const locator = this.RecipeEngine.replaceVariablesinString(step.locator);
      const element = await this.BrowserManager.querySelector(locator);

      if (!element) {
        Log.debug(`executeStoreArrayStep: No element found for locator: ${step.locator}`);
        return '';
      }

      const textValue = await element.evaluate(el => el.textContent.trim());
      return textValue;
    }
  
    async executeRegexStep(step) {
      if (!step.input || !step.expression) {
        Log.error('executeRegexStep: Missing required step properties');
        return '';
      }

      let input = this.RecipeEngine.replaceVariablesinString(step.input);
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
        Log.error('executeStoreStep: Missing required step properties');
        return '';
      }

      const output = this.RecipeEngine.replaceVariablesinString(step.input);
      return output;
    }
  
    async executeApiRequestStep(step) {
      if (!step.url || !step.config) {
        Log.error('executeApiRequestStep: Missing required step properties');
        return '';
      }

      let url = this.RecipeEngine.replaceVariablesinString(step.url);
      try {
        const response = await fetch(url, step.config);
        if (!response.ok) {
          throw new Error(`executeApiRequestStep HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const output = await response.json();
        return output;
      } catch (error) {
        Log.error(`executeApiRequestStep: Error fetching data: ${error.message}`);
        return {};
      }
    }
  
    async executeJsonStoreTextStep(step) {
      if (!step.input || !step.locator) {
        Log.error('executeJsonStoreTextStep: Missing required step properties');
        return '';
      }

      const input = this.RecipeEngine.get(step.input);
      const locator = this.RecipeEngine.replaceVariablesinString(step.locator);
      const output = _.get(input, locator);
      return output
    }
  
    async executeUrlEncodeStep(step) {
      if (!step.input) {
        Log.error('executeUrlEncodeStep: Missing required step properties');
        return '';
      }
      return encodeURIComponent(step.input);
    }
  
    async executeStoreUrlStep(step) {
      return this.BrowserManager.page.url();
    }
}