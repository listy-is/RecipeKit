<a href="https://listy.is">
    <img src="https://listy.is/shared/app-icon.png" alt="Listy logo" title="Listy" align="right" height="48"/>
</a>

# Listy's RecipeKit
Listy is a mobile app that allows you to keep track of your favorite things in a private and organized manner. The app lets you create lists to store your favorite movies, books, TV shows, links, video games, and wines all in one place. With Listy, you can easily manage and track your favorite things without having to navigate multiple apps or websites.

<p float="center">
<a href="https://listy.is/download/ios"><img src="https://listy.is/index/badge-appstore.png" height="48"></a>
<a href="https://listy.is/download/android"><img src="https://listy.is/index/badge-googleplay.png"  height="48"></a>
</p>

This public GitHub repository contains the list of recipes manages by the app and allows you to collaborate and integrate new content providers for Lisy using our guides and tools.

## About

This RecipeKit is a step based system for dynamic scrapping that guides the clients in the process of extracting information from different webpages in order to obtain information to enrich your content in Listy.

This proposal is based on Selenium IDE, the web testing tool, and uses some of its [commands](https://docs.seleniumhq.org/selenium-ide/docs/en/api/commands/).

### Understanding Recipes in Listy

In Listy, a recipe is a step-by-step process that enables the app to extract relevant information of a particular type from various websites or online sources. These recipes guide the app to obtain the desired data and seamlessly add it to your lists, making the process automated and effortless.

This GitHub repository contains folders that categorize different types of content, such as movies, anime, books, beers, and more. Within each folder, you'll find JSON files, which represent individual recipes for extracting information of the corresponding type from a specific online source or webpage. For instance, the "Movies" folder may include recipes for popular websites like IMDb, TMDb, and Filmaffinity.

### How do Recipes work?

Recipes in Listy are comprised of a series of commands that allow the app to extract information from specific websites or internet sources. These instructions guide the app in navigating to a website, identifying and clicking specific elements, and extracting relevant text to add to your lists. With these recipes in place, adding new items to your list is a simple and streamlined process, as the app automatically gathers the necessary information without you having to manually search multiple websites.

## Contributing

We're thrilled to welcome you to the Listy community of developers! With your contributions, we can continue to provide a platform that helps users keep track of their favorite things in the most flexible and efficient way possible.

Creating new recipes for Listy is a great way to show your support for the project and make it even better. If you encounter any issues while using Listy, we would be grateful if you could share your feedback with us by submitting a detailed issue.

If you're ready to start contributing, simply head to our repository and create a pull request with your new recipe. Our team will review your contribution as soon as possible and provide feedback if needed.

Don't be afraid to reach out to us if you have any questions or suggestions. We're here to help and look forward to working together to make Listy even better!

# Implementation details

A recipe in the app is a set of instructions that have single responsibility for extracting information from specific websites or internet sources. It helps the app gather the right data and add it to your lists in an automated way.

## Recipe Properties

- `list_type`: Specifies the relationship between the recipe and the content type (e.g. movie).
- `title`: The title of the recipe.
- `description`: Describes the purpose and details of the recipe.
- `engine_version`: Ensures compatibility with different iterations, not all the engines support all the commands and all the content types.
- `url_available`: An array of URLs where the recipe is able to extract data.
- `autocomplete_steps`: Steps used to list related content. It should enumerate content that match the user input.
- `url_steps`: Steps to retrieve all the specific information and hydrate the item, starting from a URL.

## Steps of a recipe

A recipe in Listy consists of a series of `commands` that are executed in a specific order. The steps of a recipe can range from navigating to a website, to finding and clicking specific elements, or extracting text from a page. These steps work together to automate the process of gathering information.

Each command has its name and an optional description to document the step. The `store` actions have a field called `output` to save the field into the dictionary of variables. If an `output` name already exists, it will be overwritten.

The recipe has a reference to the latest loaded HTML and a dictionary of variables. User-entered text is added to the dictionary as the first variable, `INPUT`. In each step, marked variables are replaced with the dictionary of variables.

Even if this will be the first commands available, the list of commands will be open to be increased:

### Load resources:

<details><summary>load: Load a website from an URL.</summary>
<p>
Loads a URL in a WebView in the background and updates the stored HTML in the recipe with every redirection.
The `load` command takes a `url` parameter, which is the URL to be loaded. It also has a description field that provides a brief summary of what the command does.

The `config` field has two properties:

- `js`: Indicates if JavaScript should be executed in the loaded URL. Defaults to `false`.
- `timeout`: The timeout defines in milliseconds the timeout during the recipe will re-try in order to extract data. Defaults to 0 which means no timeout.
- `headers`: A dictionary of key-value pairs for the request headers.

Launches a URL in background. It runs in a WebView. Every time there is a redirection, the HTML stored in the recipe is updated.

```json
{  
  "command": "load",
  "url": "https:\/\/www.imdb.com\/find?ref_=nv_sr_fn&q=$INPUT&s=tt",
  "description": "Searches movies by title",
  "config": {
		"js": true,
    "timeout": 200,
    "headers": {
      "Authorization": "Bearer 1Zv7ttfk8LF81IUq1",
      "Client-Language": "en",
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N)"
    }
  }
}
```
</p>
</details>
<details><summary>api_request: Load data from an API.</summary>
<p>
Makes an API request using the specified `method` (default is "GET") and stores the response in the specified `output` variable. The `url` for the request is taken from the input provided, which can be populated with variables from the recipe context.

The request can be configured with `headers` parameter, if needed. The `headers` parameter is a dictionary of key-value pairs for the request headers.

Here is an example of how to use the api_request command in a recipe:

```json
{
  "command": "api_request",
  "output": {
    "name": "JSON"
  },
  "url": "https://itunes.apple.com/search?media=software&limit=6&explicit=YES&term=$INPUT",
  "config": {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer 1Zv7ttfk8LF81IUq1",
      "Client-Language": "en"
    }
  },
  "description": "Retrieves a JSON response from the iTunes API with information on software matching the search term provided in the input."
}
```
</p>
</details>

### Store information:

<details><summary>store: Save any text.</summary>
<p>
Saves a text.
Specific inputs: input (text to be stored), output (dictionary name for the output)

```json
{  
  "command": "store",
  "input": "This text has the variable $URL",
  "output":{  
     "name":"DESCRIPTION2"
  },
  "description":"Saves the text defined by the recipe creator"
}
```
</p>
</details>

<details><summary>store_attribute: Save an attribute of a CSS selector</summary>
<p>
Saves the attribute indicated associated to the html node.
Specific inputs: locator (css selector), attribute_name (attribute to retrieve), output (dictionary name for the output)

```json
{  
  "command":"store_attribute",
  "locator":"#main > div > div.findSection > table > tbody > tr:nth-child(1) > td.result_text > a",
  "attribute_name":"href",
  "output":{  
     "name":"URL1"
  }
}
```
</p>
</details>

<details><summary>store_text: Save the text on a CSS selector</summary>
<p>
Saves the full text of the html node. It removes every html tag retrieving the full text the user would see opening the website.
Specific inputs: locator (css selector), output (dictionary name for the output)

```json
{  
  "command":"store_text",
  "locator":"#main > div > div.findSection > table > tbody > tr:nth-child(1) > td.result_text",
  "output":{  
     "name":"TITLE1"
  }
}
```
</p>
</details>

<details><summary>store_array: Saves an array of text from a CSS selector</summary>
<p>
Saves the full text of the html node. It removes every html tag retrieving the full text the user would see opening the website. Keep the text into an array
Specific inputs: locator (css selector), output (dictionary name for the output)

```json
{
	"command": "store_array",
	"locator": "#main > div > div.findSection > table > tbody > tr:nth-child(1) > td.result_text",
	"output": {
		"name": "TAGS"
	},
  "description": "Find a variable and keep it in an array"
}
```
</p>
</details>

<details><summary>store_url: Save url currently loaded on the webview</summary>
<p>
Saves the url that is currently opened.
Specific inputs: output (dictionary name for the output)

```json
{  
  "command":"store_url",
  "output":{  
     "name":"URL"
  },
  "description":"Saves the URL of the detail"
}
```
</p>
</details>

<details><summary>json_store_text: Save the text on a JSON path</summary>
<p>
The json_store_text command allows to extract data from a JSON and store it in a specified output.

- `locator`: A string that represents the location of the data within the JSON structure. It follows a dot notation (e.g. `results.[0].artistName`) to access values inside nested objects.
- `input`: The input variable that contains the JSON data. By default, this variable is set to $JSON, which means it will use the output of the previous command as input.

```json
{
  "command": "json_store_text",
  "locator": "results.[0].artistName",
  "input": "$JSON",
  "output": {
    "name": "AUTHOR",
    "type": "string",
    "show": true
  },
  "description": "Saves the first artist."
}
```

### Transform information:

<details><summary>regex: Execute a regex</summary>
<p>
Check if a pattern is found in a variable. Returns the first item if its found.
Specific inputs: pattern, output (dictionary name for the output)

```json
{  
   "command":"regex",
	 "input":"$TEXT",
   "expression":"\/img alt=\"(Netflix)\" title=\"\/",
   "output": {  
      "name":"Netflix"
   },
   "description":""
}
```
</p>
</details>

<details><summary>url_encode: Encodes an URL</summary>
<p>
Check if a pattern is found in a website. Returns the first item if its found.
Specific inputs: pattern, output (dictionary name for the output)

```json
{
	"command": "url_encode",
	"input": "$TITLE",
	"output": {
		"name": "TITLE"
	},
  "description": "Apply url encode to the variable"
}
```
