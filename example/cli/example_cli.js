"use strict";

let cli = require(`nsjs-cli`);
cli.addPlugins(['./cli/start', './cli/local']);
//cli.log.setDebug(true);
cli.run();


