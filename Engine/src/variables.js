import { Log } from './logger.js';

export class VariableManager {
    static VARIABLE_NAMES = {
      INPUT: 'INPUT',
      SYSTEM_LANGUAGE: 'SYSTEM_LANGUAGE',
      SYSTEM_REGION: 'SYSTEM_REGION',
      VARIABLE_START_CHAR: '$'
    };
  
    constructor() {
      this.variables = {};

      // Initialize with environment variables
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, process.env.SYSTEM_LANGUAGE);
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, process.env.SYSTEM_REGION);
      this.set(VariableManager.VARIABLE_NAMES.INPUT, '');
    }
  
    set(key, value) {
      this.variables[key] = value;
    }
  
    get(key, defaultValue = '') {
      const rawKey = key.replace(VariableManager.VARIABLE_NAMES.VARIABLE_START_CHAR, '');
      const value = this.variables[rawKey] ?? process.env[rawKey] ?? defaultValue;
      return value;
    }

    getAllVariables() {
      return this.variables;
    }

    setInput(input) {
      this.set(VariableManager.VARIABLE_NAMES.INPUT, input);
    }

    replaceVariablesinString(str) {     
      Log.debug(`replaceVariablesinString: Checking and replacing variables in: ${str}`);
      return Object.keys(this.variables).reduce((result, variable) => {
        if (result.includes(`$${variable}`)) Log.debug(`Attempting to replace variable: ${variable} with value: ${this.get(variable)}`);
        return result.replace(`$${variable}`, this.get(variable));
      }, str);
    } 
}