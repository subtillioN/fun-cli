"use strict";
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        cmds: {
            setup: {
                fn: null, id: "setup", interface: "npm run ",
                desc: "From a freshly cloned copy of 'fun' module, runs the complete install and setup process, start to finish.  Can also be used to refresh dependencies and links.  Run 'update' for complete refresh, including of the fun module itself and its repository updates."
            },
            installall: {
                fn: null, id: "install-all", interface: "npm run ",
                desc: "See 'start'. Runs the following shell script:\n npm install && npm run prereqs && npm run install-deps && npm run install-jspm && npm run link-all && npm run local-setup"
            },
            prereqs: {
                fn: prereqs, id: "prereqs", interface: "npm run ",
                desc: "Logs versions and explains prerequisites for installation."
            },
            installjspm: {
                fn: null, id: "install-jspm", interface: "npm run ",
                desc: "Installs all JSPM package dependencies via the following shell script:\n npm install jspm@beta -g && npm install jspm-git@beta -g && jspm install && npm run reg"
            },
            jspmcreatereg: {
                fn: null, id: "jspm-create-reg", interface: "npm run ",
                desc: "Creates the jspm-git registry for local development linking via the following shell script:\n jspm registry create jspmRegistry jspm-git"
            },
            jspmconfigreg: {
                fn: null, id: "jspm-config-reg", interface: "npm run ",
                desc: "Updates the jspm-git registry for local development linking via the following shell script:\n jspm registry config jspmRegistry"
            },
            update: {
                fn: null, id: "update", interface: "npm run ",
                desc: "Completely refreshes 'fun' jspm-git registry module and npm and jspm package dependencies.  Similar to 'start', but also updates 'fun' module repository."
            }
        }
    }
};


let cli,
    log,
    debug,
    utils,
    prompt = require('prompt')
    ;

const
    PRE_REQ_CMD = "git --version && echo 'node version: ' && node -v",


    prereqs = (args, onComplete) => {
        let callPrompt = v => {
            promptPrereqs(utils.stripArray(v), stdout => {
                onComplete(stdout);
            });
        };
        getPrereqVersions(stdout => {
            callPrompt(stdout)
        });
    },

    getPrereqVersions = (callback) => {
        cli.execute(PRE_REQ_CMD,
//SUCCESS
            stdout => {
                callback(stdout);
            },
//ERROR
            err => {
                log.out(err);
            }, true)
    },

    promptPrereqs = (v, callback) => {
        log.out("Your OS is: " + utils.osType);
        log.pad(0);
        log.out("Your current versions are:");
        log.pad(0);
        log.out(v);
        log.out("Make sure you have git version of at least 2.0, and node.js version of at least 4.x, and no greater than 5.x (see above).  Node 6.x breaks JSPM.");
        log.out("If these requirements are not met, please update your versions before proceeding.");
        log.pad(0);

        prompt.get(['ready? [enter]'], (err, result) => {
            cli.runFn(callback);
        });
    },

    setOpt = (opt, id) => {
        log = opt.log;
        debug = log.debug(`${id}:`);
        cli = opt.cli;
        log = opt.log;
        utils = opt.utils;
        //cli.addCommands(cmds());
    }
    ;
