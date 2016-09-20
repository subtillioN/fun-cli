'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        cmds: {
            help: {
                fn: help, id: "help", interface: "npm run ",
                desc: "Logs all commands and descriptions.",
                args: [{name: "[optional] You can pass in the name of the command you want to see the help for."}]
            }
        }
    }
};

let
    cmds,
    cli,
    log,
    debug,
    _ = require('ramda')
    ;

const

//TODO:: Integrate npm run help with npm help by running the 'npm help' command and parsing the output
    help = (args, onComplete) => {
        cmds = cli.getCommands();
        log.out("\n\n\n");
        if (args && args.length) {
            logHelpItem(args[0]);
        }
        else {
            _.map(logHelp, Object.keys(cmds));
        }
        onComplete();
    },

    logHelpItem = (id) => {
        const cmd = cli.getCommandNameFromId(id);
        if (cmd) {
            log.line();
            logHelp(cmd);
            log.line();
        }
        else {
            help();
            log.out("\n\n");
            log.warn(`Could not find the '${id}' command.  See the available commands above.`);
            log.out("\n\n");
        }
    },

    logHelp = (cmd) => {
        const listHelpArgs = args => {
                let arglist = "";
                _.map(arg => {
                    Object.keys(arg).forEach(key => {
                        arglist += " [" + key + "]";
                    });
                }, args);
                return arglist;
            },
            tab = "   ";
        const c = cmds[cmd];
        if (c) {
            const args = c.args;
            log.em(c.id + ":");
            log.cmd(tab + ">>>", c.interface + c.id + (args ? listHelpArgs(args) : ""));
            log.out(tab + "" + c.desc);
            if (args) {
                _.map(arg => {
                    Object.keys(arg).forEach(key => {
                        log.out(tab + "[" + key + "] " + arg[key]);
                    });
                }, args);
            }
            log.pad(0);
        }
    },

    setOpt = (opt, id) => {
        cli = opt.cli;
        log = opt.log;
        debug = log.debug(`${id}:`);
    };