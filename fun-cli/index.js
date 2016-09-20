"use strict";
let
    _ = require('ramda'),
    path = require('path'),
    cwd = process.cwd(),
    cli
    ;

const
    app = {char_width: 81},
    appModules = [
        'log',
        'utils',
        'paths',
        'cli'
    ],
    cmdModules = [
        'deps',
        'repo',
        'help'
    ],
    addPlugins = (plugins) => {
        plugins.map(addCmdModule(addModule(path.join(cwd, './'))));
    },
    foldModule = (dir, modId) => app[modId] = require(dir + modId)(app, modId),
    addModule = _.curry(dir => modId => foldModule(dir, modId)),
    addCmdModule = _.curry((foldFn, modId) => cli.addCommands(foldFn(modId)['cmds'])),
    rollApp = addModule('./src/'),
    rollCmds = addModule('./src/commands/')
    ;


appModules.map(rollApp);
cli = app['cli'];
cmdModules.map(addCmdModule(rollCmds));

module.exports = {
    run: cli.run,
    log: app['log'],
    addPlugins: addPlugins
};