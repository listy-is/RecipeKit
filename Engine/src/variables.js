import { file } from 'bun';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
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
      this.loadEnvVariables();
      // Initialize with environment variables
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, process.env.SYSTEM_LANGUAGE);
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, process.env.SYSTEM_REGION);
      this.set(VariableManager.VARIABLE_NAMES.INPUT, '');
    }
  
    async loadEnvVariables() {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const envPath = resolve(__dirname, '../.env');
  
      try {
        const env = await file(envPath).text();
        const envVariables = Object.fromEntries(
          env.split('\n')
            .filter(line => line.trim() !== '' && !line.startsWith('#'))
            .map(line => line.split('=').map(part => part.trim()))
        );
  
        Object.assign(process.env, envVariables);
        Log.debug("loadEnvVariables: Environment variables loaded successfully", envVariables);
      } catch (error) {
        Log.error(`loadEnvVariables: Error loading .env file from ${envPath}:`, error.message);
      }
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