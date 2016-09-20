"use strict";
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        execProcess: execProcess,
        child_process: child_process,
        run: run,
        runCommand: runCommand,
        execute: execute,
        buildCommandFromArray: buildCommandFromArray,
        logCommandComplete: logCommandComplete,
        getCommandNameFromId: getCommandNameFromId,
        getCommandFromId: getCommandFromId,
        addCommands: addCommands,
        getCommands: getCommands,
        runFn: runFn
    };
};

let
    cmds = {},
    execProcess = null,
    utils,
    log,
    debug,
    paths,
    char_width,
    SCRIPT_ID = ">>> {{id}} cli >>> ",
    _ = require('ramda');


const
    child_process = require('child_process'),
    colors = require('colors'),
    exec = child_process.exec,
    cwd = process.cwd,

    run = (args) => {
        // initialize commands
        args = args || cleanArgs(process.argv);
        const cmdId = args.shift();
        runCommand(cmdId, args);
    },

    runCommand = (id, args) => {
        args = args || [];
        if (!utils.isArray(args)) {
            args = [args];
        }
        const
            cmd = getRunCommand(id),
            r = (cmd, args) => {
                logCommandBegin(cmd, args);
                if (utils.isFunction(cmd.fn)) {
                    cmd.fn(args, stdout => {
                        process.exit();
                        logCommandComplete(cmd.id, stdout);
                    });
                }
                else {
                    paths.gotoModule();
                    execute(cmd.cmd + " " + cmd.id, stdout => {
                        logCommandComplete(cmd.id, stdout)
                    }, stderr => {
                        log.out(stderr);
                    })
                }
            }
            ;
        if (cmd) {
            r(cmd, args);
        }
        else {
            log.out(`The '${id} ${args}' command was not found.`);
            r(getRunCommand('help'), ['help']);
        }
    },

    execute = (command, onComplete, onError, shhh) => {
        let l = _.curry(log.shhh)(shhh);
        l("");
        l("Executing the following command in " + cwd() + " :");
        l("");
        l(command);
        l("");

        try {
            execProcess = exec(command, (err, stdout, stderr) => {
                if (err) {
                    runFn(onError, err);
                    log.error("execute err: " + err, ['execute err: Error:', 'error:', 'error'], char_width);
                }

                if (stderr) {
                    runFn(onError, "stderr: in " + cwd() + " : \n" + stderr);
                }

                runFn(onComplete, stdout);
            });
            if (!shhh) {
                pipeExecProcess();
            }
        }
        catch (ex) {
            log.out("ex is ... ", ex);
        }

        return execProcess;
    },

    pipeExecProcess = () => {
        process.stdin.pipe(execProcess.stdin);
        execProcess.stdout.pipe(process.stdout);
        execProcess.stdin.pipe(process.stdin);
        execProcess.stderr.pipe(process.stderr);
    },

    buildCommandFromArray = (arr, cmdfn) => {
        let cmd = "",
            i = 0,
            l = arr.length;
        _.map(item => {
            cmd += cmdfn(item);
            if (i < l - 1) {
                cmd += " && ";
            }
            i++;
        }, arr);
        return cmd;
    },

    getRunCommand = (id) => {
        let cmd = cmds[id] || getCommandFromId(id);
        if (cmd) {
            return cmd;
        }
        return false;
    },

    getCommandNameFromId = (id) => {
        let cmd;
        for (let key in cmds) {
            if (cmds.hasOwnProperty(key)) {
                cmd = cmds[key];
                if (cmd.id == id) {
                    return key;
                }
            }
        }
        return false;
    },

    getCommandFromId = (id) => {
        let cmd = null;
        Object.keys(cmds).forEach(key => {
            if (cmds[key].id == id) {
                cmd = cmds[key];
            }
        });
        return cmd;
    },

    runFn = (cb, ...args) => {
        if (utils.isFunction(cb)) {
            cb.call(this, utils.stripArray(args));
        }
    },

    logCommandBegin = (cmd, args) => {
        if (!(args && args.length)) {
            args = "";
        }
        log.cmd(" EXECUTING " + SCRIPT_ID, "'npm run " + cmd.id + " " + args + "' ");
        log.info(" - " + cmd.desc, char_width);
        log.pad();
    },

    logCommandComplete = (cmd, txt) => {
        log.pad();
        log.cmd(" COMPLETE " + SCRIPT_ID, "'npm run " + cmd + "'", true);
        if (txt) {
            log.info(utils.stripArray(txt), char_width);
        }
        log.pad(1);
    },


    cleanArgs = (args) => {
        for (let i = 0; i < 2; i++) {
            args.shift();
        }
        return args;
    },

    setScriptId = (id) => {
        if (id.indexOf("ns") == 0) {
            id = id.replace("ns", "");
        }
        SCRIPT_ID = SCRIPT_ID.replace("{{id}}", id);
    },

    addCommands = (x) => {
        cmds = Object.assign(cmds, x);
        return getCommands();
    },

    getCommands = () => {
        return cmds;
    },

    setOpt = (opt, id) => {
        utils = opt.utils;
        paths = opt.paths;
        log = opt.log;
        debug = log.debug(`${id}:`);
        char_width = opt.char_width;
        setScriptId(paths.moduleName);
    };