# RecipeKit
Integrate different content providers in Listy using our guides and tools.

## About

A step based system for dynamic scrapping (recipes) that guides the clients in the process of extracting information from different webpages in order to obtain information to enrich your content in Listy.

This proposal is based on Selenium IDE, the web testing tool, and uses some of its [commands](https://docs.seleniumhq.org/selenium-ide/docs/en/api/commands/).

## Main concepts

* **Server**: Hosts and serves the different recipes.
* **Clients**: Download updated versions of the recipes on boot, if internet is not available or the server doesn't respond the app is initialized with the latest stored version of the recipes.
* **Type**: There are several types of recipes. Ex: movies, books, etc. Each type have several recipes that hydrate the list. Relation is 1-N.

## **Recipe**

The recipe is an array that contains inside one or several steps that have single responsibility.  

### Implementation details

A recipe has an unique **id** to differentiate it from other recipes, a **type** to know the relationship between the recipe and the actual content (a movie) from the user, a **version** to compare with the latest local copy, a **description** to describe the details and purpose of that recipe, the **engine_version** to ensure the compatibility with the different iterations, **url_available** that contains an array of urls that are available with this recipe, and finally two lists of commands: **autocomplete_steps**,  a list of steps used when the user writes directly in the list to add a new item, and **url_steps**, a bunch of steps starting from a url that retrieves the information needed to hydrate the list.  

The following example uses five different commands: **load, store_attribute, store_text, store_url** and **store**. Each of the commands will have an optional description to document the step.

The store actions always have an field called "output" used to save the field into the dictionary of variables. This output names will overwrite an existing one with the same name.

More complex recipes could require additional commands like **type,** **submit** or **sendkeys**. Every command has a unique id, the necessary parameters and a description. Also another future feature of the recipe would be to execute other recipes as commands.

The recipe has a reference to the latest loaded HTML and a dictionary with variables. Text introduced by the user will be added to that dictionary as the first variable called INPUT. In each step, the first task is always to replace the marked variables with the character $ by the dictionary with variables.

Even if this will be the first commands available, the list of commands will be open to be increased:

### `load`
Launches a URL in background. It runs in a WebView. Every time there is a redirection, the HTML stored in the recipe is updated.
Specific inputs: url (url to be launch)

```json
{  
  "command":"load",
  "url":"https:\/\/www.imdb.com\/find?ref_=nv_sr_fn&q=$INPUT&s=tt",
  "description":"Searches movies by title",
  "config": {
		"js": true,
    "timeout": 200
  }
}
```

### `store_text` 
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

### `store_attribute`
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

### `store_url`
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

### `store`
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

### `regex`
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

### `url_encode`
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

### `store_array`
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