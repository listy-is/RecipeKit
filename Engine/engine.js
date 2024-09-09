import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { RecipeEngine } from './recipe.js';
import { Log } from './logger.js';

async function loadRecipe(recipePath) {
  const recipeContent = await readFile(recipePath, 'utf-8');
  return JSON.parse(recipeContent);
}

async function parseArguments() {
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

function validateArguments(parsedArgs) {
  if (!parsedArgs.recipe || !parsedArgs.type) {
    Log.error('Usage: bun run engine.js --recipe <recipe_path> --type <step_type> [--input <input>]');
    process.exit(1);
  }
}

function getAdditionalOptions(parsedArgs) {
  return {
    debug: parsedArgs.debug === 'true',
    timeout: parseInt(process.env.DEFAULT_PAGE_LOAD_TIMEOUT) || 30000,
    userAgent: process.env.USER_AGENT
  };
}

function colorizeJson(obj) {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"(\w+)":/g, (match, p1) => `"${chalk.cyan(p1)}":`) // Keys
             .replace(/"([^"]+)"(?=,|\n|\s*})/g, (match, p1) => `"${chalk.green(p1)}"`) // String values
             .replace(/: (\d+)(,?)/g, (match, p1, p2) => `: ${chalk.yellow(p1)}${p2}`) // Number values
             .replace(/: (true|false)(,?)/g, (match, p1, p2) => `: ${chalk.magenta(p1)}${p2}`) // Boolean values
             .replace(/: (null)(,?)/g, (match, p1, p2) => `: ${chalk.gray(p1)}${p2}`); // Null values
}

async function executeRecipe(recipePath, stepType, input, additionalOptions) {
  const recipe = await loadRecipe(recipePath);
  Log.debug('Loaded recipe:', recipePath);

  const engine = new RecipeEngine(additionalOptions);
  await engine.initialize();

  try {
    const result = await engine.executeRecipe(recipe, getStepTypeKey(stepType), input);
    console.log(colorizeJson(result));
  } finally {
    await engine.close();
  }
}

function getStepTypeKey(stepType) {
  const stepTypeMap = {
    'autocomplete': 'autocomplete_steps',
    'url': 'url_steps'
  };
  return stepTypeMap[stepType] || stepType;
}

async function main() {
  const { parsedArgs, isDebug } = await parseArguments();
  Log.isDebug = isDebug;

  validateArguments(parsedArgs);

  const { recipe: recipePath, type: stepType, input = '' } = parsedArgs;
  const additionalOptions = getAdditionalOptions(parsedArgs);

  try {
    await executeRecipe(recipePath, stepType, input, additionalOptions);
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  if (error instanceof SyntaxError) {
    Log.error('Error parsing recipe JSON:', error);
  } else if (error instanceof TypeError) {
    Log.error('Error executing recipe steps:', error);
  } else {
    Log.error('Unexpected error:', error);
  }
}

main();