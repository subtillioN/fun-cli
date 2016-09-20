# fun-cli
Fun-cli is a simple node.js command-line interface with plugin architecture useful for integrating with npm scripts.  It explores functional programming techniques with ramda.js such as curry and composition. The example provides only a reference project, not a fully working one.  And the code here has only been used on the project it was built for, and so the api is certainly not fully developed in the separation from the particular concerns of the initial project.

The following is a modified version of the documentation written for a project cli using on `fun-cli` via the plugin architecture. 




# Overview

Example-cli (cli herein) is a node.js based command-line interface for JSPM git modules.  cli is designed to facilitate the management and standardization of the setup and build procedures for the given module and its sibling module dependencies.  For example, cli is currently in use in the `example-project` module for---among other things---installation, linking, and bundling together example-project's JSPM sibling module dependencies, such as nsaccount, nscart, nscheckout, and so forth.  cli integrates with the `npm run <command>` interface.  This provides an industry standard, cross-platform command-line interface which is easily customizable through the package.json of the module.  An example command would be `npm run setup`, which will install and fully configure all module dependencies from a new example-project repository.  cli includes a set of basic utility commands (see Command API, below) along with a plugin architecture which makes it easy to extend the command functionality for the context of the module it is used within.  For example, example-project includes two plugin command modules, `start` and `local`.


# Command API

The commands are structured so that they can run other commands in sequence.  When each command runs, it will display its help data showing you how to invoke it and what it does.  It will display this at the beginning and end of the command.  This means that all the commands will display which other commands they are running, so pay attention to the console to see which commands you can also run in isolation, if needed.  

They are also documented in the `npm run help` command.  

Here is a list of some of the key commands built into the example-cli.  As discussed, all of these use the `npm run <command>` interface:

* **help**: This is the most important command.  The documentation for all of the commands is found with this command.  Note that help will not run without running `npm install`.  This will run automatically with the `npm run setup` command, the second-most important command.  So, after that, you can just run `npm run help`.

* **setup**: This command will setup the module from scratch, link all the dependencies and build the self-executing bundle.  It will walk you through the process of configuring to your local setup and it will give instructions at the end for configuring the module. Note that this is found as a plugin for the aem module, so it would have to be implemented for each.

* **clean**: This is a very useful command, but use it with caution.  It will entirely clean your module, including all your JSPM module dependencies.  That means that all your npm and jspm modules will be wiped out, along with any dependencies listed in the "deps" node (see item 2 in the installation steps below). 

    * **NOTE:** This command should be accompanied by a warning and a prompt, actually.

Run `npm run help` for documentation on all the others. 

# Installation

Installation of the cli involves:

1. adding it as a node dev dependency

2. listing the `deps` (dependencies) in the package.json "config" node

3. creating a local node file to configure and run the cli

4. adding any local custom command plugins

5. hooking it up to the npm run script interface

## Adding example-cli as Node Dev Dependency

To use the cli in your JSPM module, just add it as a dependency in your package.json like so:

**Add example-cli as Node Dependency**

    "devDependencies": {
       ...
       "example-cli": "git+ssh://git@bitbucket.example-project.net/fa/example-cli.git",
       ...
    }


## List the Dependencies in the package.json

In the package.json, within the "config" node (add it if you don't have it already), add a new node called "deps", and list each of the JSPM dependencies the module requires, delimited only by a single space.  It should look something like this.

**Add "deps" Node**

    ...
    "config": {
       "deps": "account cart checkout checkoutcommon shop util agelocme"
    },
    ...
      


## Creating Local cli Node Script

To load the example-cli dependency, configure it, and run it, we need to create a local node.js file.  It could be anywhere in the current module directory you want, such as in its own directory, ./cli.  So inside this directory, we could create a file called `example_cli.js` with the following code, which loads two command plugins which we would also need to create:

**Local cli Node File**

    "use strict";
    let cli = require('example-cli');
    cli.addPlugins(['./cli/start', './cli/local']);
    cli.run();

## Add Local Command Plugin Files

Now, inside the ./cli directory we just need to add two command plugin files.  To do this, copy the basic structure from the Command Plugin Example code block below in the Plugin Architecture section below.

## Hook Commands to the NPM Run Interface

To run our cli, and any commands, we need to hook it all into the `npm run` interface.  This means first creating a script to run our cli node file.  In the package.json, if there is not a "scripts" node, create one as shown below.  If there is already one, just add the "cli" script (you could call it whatever you want, and add whatever node flags work for your script).

**NPM cli Script**

    "scripts": {
      ...
      "cli": "node --harmony ./cli/aem_cli"
      ...
    ,

Now that we have our `npm run cli` command, we can use it to call our other commands, including any custom commands we add in our plugins.  This is how it looks with the built-in `help` command.

**Example 'help' Command**

    "scripts": {
       ...
       "cli": "node --harmony ./cli/aem_cli",
       "help": "npm run cli help -- "
       ...
    },


# Module Loading Architecture

The module loading architecture has a roll-up process which exposes all the previous modules in the initialization of the next.  It does this by assigning the currently instantiated module by name to the *opt* object which is injected into the next module in the same fashion down the line.  So each object gets access to all the objects instantiated before it.  This means that if you previously loaded a plugin module called `bob`, the next module you load, say `martha`, will have access to `bob` through opt.bob through the initialization of `martha`'s module.export function.  See the `Command Plugin With Options` code block below, in the `Plugin Architecture` section. This is used, for example, with the dependency on the exposed 'deps' commands within the 'repo' command module.  

You can always run *cli.runCommand* to run any of the loaded cli commands, or *cli.execute* to run any shell command.

# Plugin Architecture

The only requirement for a plugin command module is that in the return object of the module.exports function, there is a `cmds` object which defines the commands.  It looks like this:

**Command Plugin Example**

    module.exports = () => {
        return {
            cmds:{
                command1: {
                    fn: example, id: "command1", interface: "npm run ",
                    desc: `A simple example command....`
                },
                command2: {
                    fn: null, id: "command2", interface: "npm run ",
                    desc: `Another example which just runs an npm command, as you can see
                    with the 'null' for a command fn.
                    This command also has an example argument in the args list.`,
                    args: [{arg: "This is an argument. Pass whatever you like."}]
                }
            }
        };
    };


## Keys and IDs: Building a Command

Let's deconstruct the the command structure here.

Each command has an object key, and the command object it references.  In this case, the object keys match the command ids.  But this is not necessary.  You could name them whatever you want.  However, it is the id which determines the invocation of the command.  The command is run in the root directory and is put together from the `interface` + the `id`.  In this case the full command looks like this: `npm run command1`.  Note that you could use this `interface` + `id` structure to call any shell command.

Note also the `desc` attribute, which is the description of the command which will display in the help command.

And note as well the `args` list (array), which you can use to list all the args in order, along with their descriptions.  These also will be shown in the help command, and this is really the only reason to add them here.  All the logic for using the args will be handled in the command itself.

## NPM Run Commands in the cli?

In the `Command Plugin Module` code block above, note the `command2` command.  This is an NPM command, and is not a command run from the cli.  If you run it from the cli, since the `fn` is null, it will simply call `npm run command2` regardless.  This style of command is provided to plug into the built-in `help` command as a way to document more fully the full npm command interface for the module.

## Accessing Prior Modules

The following snippet shows how to take advantage of the plugin architecture, with its roll-up module loading process providing access to all of the previously loaded modules, including any previously loaded plugins.  Just access them by name on the opt object, as discussed in the Overview above.  This looks like so:

**Command Plugin With Options**

    module.exports = (opt, id) => {
        cli = opt.cli;
        log = opt.log;
        debug = log.debug(`${id}:`);
        paths = opt.paths;
        utils = opt.utils;
        return {
            cmds:{
                ...
                }
            }
        };
    };


# Troubleshooting

These are the steps for trouble-shooting the cli.

1. Make sure your repository is up-to-date.  The following commands can help. 

    1. Run `git pull`, or `git stash && git pull && git stash pop`.

    2. If that doesn't work, try `git fetch origin && git reset --hard origin/develop`

    3. And if that doesn't work clone the module again and run `npm run setup`

2. Anytime you are running into issues with the cli, do `npm install` to make sure the dependencies are up-to-date.

3. If all else fails, clone the module again and run `npm run setup`

