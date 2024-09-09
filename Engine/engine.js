import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { RecipeEngine } from './src/recipe.js';
import { Log } from './src/logger.js';

class ArgumentParser {
  async parse() {
    const args = Bun.argv.slice(2);
    const parsedArgs = {};
    let isDebug = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--debug') {
        isDebug = true;
      } else if (args[i].startsWith('--')) {
        parsedArgs[args[i].replace('--', '')] = args[i + 1];
        i++;
      }
    }

    return { parsedArgs, isDebug };
  }

  validate(parsedArgs) {
    if (!parsedArgs.recipe || !parsedArgs.type) {
      Log.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
      process.exit(1);
    }
  }
}

class JsonColorizer {
  colorize(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"(\w+)":/g, (match, p1) => `"${chalk.cyan(p1)}":`)
               .replace(/"([^"]+)"(?=,|\n|\s*})/g, (match, p1) => `"${chalk.green(p1)}"`)
               .replace(/: (\d+)(,?)/g, (match, p1, p2) => `: ${chalk.yellow(p1)}${p2}`)
               .replace(/: (true|false)(,?)/g, (match, p1, p2) => `: ${chalk.magenta(p1)}${p2}`)
               .replace(/: (null)(,?)/g, (match, p1, p2) => `: ${chalk.gray(p1)}${p2}`);
  }
}

class Engine {
  constructor() {
    this.argumentParser = new ArgumentParser();
    this.jsonColorizer = new JsonColorizer();
  }

  async loadRecipe(recipePath) {
    const recipeContent = await readFile(recipePath, 'utf-8');
    return JSON.parse(recipeContent);
  }

  getAdditionalOptions(parsedArgs) {
    return {
      debug: parsedArgs.debug === 'true',
      timeout: parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT) || 30000,
      userAgent: process.env.USER_AGENT
    };
  }

  getStepTypeKey(stepType) {
    const stepTypeMap = {
      'autocomplete': 'autocomplete_steps',
      'url': 'url_steps'
    };
    return stepTypeMap[stepType] || stepType;
  }

  async executeRecipe(recipePath, stepType, input, additionalOptions) {
    const recipe = await this.loadRecipe(recipePath);
    Log.debug('Loaded recipe:', recipePath);

    const engine = new RecipeEngine(additionalOptions);
    await engine.initialize();

    try {
      const result = await engine.executeRecipe(recipe, this.getStepTypeKey(stepType), input);
      console.log(this.jsonColorizer.colorize(result));
    } finally {
      await engine.close();
    }
  }

  handleError(error) {
    if (error instanceof SyntaxError) {
      Log.error('Error parsing recipe JSON:', error);
    } else if (error instanceof TypeError) {
      Log.error('Error executing recipe steps:', error);
    } else {
      Log.error('Unexpected error:', error);
    }
  }

  async run() {
    const { parsedArgs, isDebug } = await this.argumentParser.parse();
    Log.isDebug = isDebug;

    this.argumentParser.validate(parsedArgs);

    const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;
    const additionalOptions = this.getAdditionalOptions(parsedArgs);

    try {
      await this.executeRecipe(recipePath, stepType, input, additionalOptions);
    } catch (error) {
      this.handleError(error);
    }
  }
}

// Main execution
const engine = new Engine();
engine.run();