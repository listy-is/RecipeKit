import { file } from 'bun';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Log } from './logger.js';

export class VariableManager {
    static VARIABLE_NAMES = {
      INPUT: 'INPUT',
      SYSTEM_LANGUAGE: 'SYSTEM_LANGUAGE',
      SYSTEM_REGION: 'SYSTEM_REGION',
    };
  
    constructor() {
      this.variables = {};
      this.loadEnvVariables();
      // Initialize with environment variables
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_LANGUAGE, process.env.SYSTEM_LANGUAGE);
      this.set(VariableManager.VARIABLE_NAMES.SYSTEM_REGION, process.env.SYSTEM_REGION);
    }
  
    async loadEnvVariables() {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const envPath = resolve(__dirname, '.env');
  
      try {
        const env = await file(envPath).text();
        const envVariables = Object.fromEntries(
          env.split('\n')
            .filter(line => line.trim() !== '' && !line.startsWith('#'))
            .map(line => line.split('=').map(part => part.trim()))
        );
  
        Object.assign(process.env, envVariables);
        Log.debug("Environment variables loaded successfully", envVariables);
      } catch (error) {
        Log.error(`Error loading .env file from ${envPath}:`, error.message);
      }
    }
  
    set(key, value) {
      this.variables[key] = value;
    }
  
    get(key, defaultValue = '') {
      const value = this.variables[key] || process.env[key] || defaultValue;
      Log.debug(`Getting variable: ${key}, Value: ${value}`);
      return value;
    }
  
    updateFromResult(result) {
      for (const [key, value] of Object.entries(result)) {
        this.set(key, value);
      }
    }
  
    replacePlaceholders(str, input, loopIndex, indexVariable) {
      const indexRegex = new RegExp(`\\$${indexVariable}`, 'g');
      return str.replace(/\$([A-Z_]+)(\$[a-z]+)?/g, (match, p1, p2) => {
        if (p1 === VariableManager.VARIABLE_NAMES.INPUT) return input;
        if (p2) {
          // Handle variables with dynamic index suffix
          const variableName = `${p1}${loopIndex}`;
          return this.get(variableName, match);
        }
        return this.get(p1, match);
      }).replace(indexRegex, loopIndex !== undefined ? loopIndex.toString() : '$' + indexVariable);
    }
  }