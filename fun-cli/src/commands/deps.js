'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        other: deps,
        all: allDeps,
        missing: missingDeps,
        existing: existingDeps,
        getCurrentGitBranch: getCurrentGitBranch,
        clean: cleanDeps,
        clone: cloneDeps,
        update: updateDeps,
        iterate: iterateDeps,
        commandIterate: commandIterateDeps,
        commandIterateIn: commandIterateInDeps,
        commandIterateOver: commandIterateOverDeps,
        cmds: {
            installdeps: {
                fn: installdeps, id: "install-deps", interface: "npm run ",
                desc: "Installs dependent jspm-git registry modules. Prompts the user with a choice to update or clone fresh copies overwriting current copies."
            },
            linkall: {
                fn: linkall, id: "link-all", interface: "npm run ",
                desc: "Links all jspm-git registry module dependencies into the parent module. This should be run when changes to package dependencies in the package.json have been made in any of the module dependencies of the parent module."
            },
            clean: {
                fn: null, id: "clean", interface: "npm run ",
                desc: "Removes all module dependencies including npm and jspm modules, as well as the jspm-git registry module dependencies. Runs 'clean-deps' and 'clean-pkgs'"
            },
            cleanpkgs: {
                fn: cleanpkgs, id: "clean-pkgs", interface: "npm run ",
                desc: "Deletes local project npm and jspm packages: npm_modules and jspm_packages directories."
            },
            cleandeps: {
                fn: cleandeps, id: "clean-deps", interface: "npm run ",
                desc: "Deletes all dependent jspm-git registry module dependencies. Can be used with clone-deps to restore fresh copies."
            },
            clonedeps: {
                fn: clonedeps, id: "clone-deps", interface: "npm run ",
                desc: "Clones all dependent jspm-git registry module dependencies in the root directory as siblings of the project module. Can be used with clean-deps to restore fresh copies.",
                args: [{branch: "[optional] You can pass in the name of the branch you want to clone for all the deps.  Defaults to whatever the current branch is for project."}]
            },
            resetdeps: {
                fn: null, id: "reset-deps", interface: "npm run ",
                desc: "Clones all dependent jspm-git registry module dependencies in the root directory as siblings of the project module. Can be used with clean-deps to restore fresh copies.",
                args: [{branch: "[optional] You can pass in the name of the branch you want to clone for all the deps.  Defaults to whatever the current branch is for project."}]
            },
            refreshdeps: {
                fn: null, id: "refresh-deps", interface: "npm run ",
                desc: "Runs 'clean-deps' and 'clone-deps' for the current branch checked out for project",
                args: [{branch: "[optional] You can pass in the name of the branch you want to clone for all the deps.  Defaults to whatever the current branch is for project."}]
            },
            deps: {
                fn: iteratedeps, id: "deps", interface: "npm run ",
                desc: `Executes any command within each of the dependency directories specified for the module.\n
                Just put the command to run in single quotes as such: 'npm run deps 'echo running deps...'`,
                args: [{command: "You can pass in any command that can run in your terminal.  Just make sure to put it in single quotes."}]
            }
        }
    };
};


let
    cli,
    utils,
    log,
    debug,
    paths,
    deps,
    allDeps,
    missingDeps,
    existingDeps,
    char_width,
    colors = require('colors'),
    path = require('path'),
    prompt = require('prompt'),
    _ = require('ramda')
    ;

const

    DEP_UPDATE_CMD = "git stash && git pull && git stash pop",
    DEP_CLONE_CMD = "git clone -b {{branch}} {{GIT_URL}}{{module}}.git",
    DEP_LINK_CMD = "jspm link ../{{module}} -y ",


// COMMANDS

    cleanpkgs = (args, onComplete) => {
        let doneCount = 0,
            done = 2,
            onDeleteComplete = stdout => {
                doneCount++;
                if (doneCount >= done) {
                    cli.runFn(onComplete, stdout);
                }
            };
        paths.rmdir(paths.jspmpackages, onDeleteComplete);
        paths.rmdir(paths.nodemodules, onDeleteComplete);
    },

    installdeps = (args, onComplete) => {
        if (depsExist(deps)) {
            promptDepsInstall(onComplete)
        }
        else {
            cloneDeps(deps, stdout => {
                onComplete(stdout);
            });
        }
    },

    cleandeps = (args, onComplete) => {
        cleanDeps(stdout => {
            onComplete(stdout);
        });
    },

    clonedeps = (args, onComplete) => {
        cloneDeps(deps, stdout => {
            onComplete(stdout);
        }, args);
    },

    linkall = (args, onComplete) => {
        paths.gotoModule();
        cli.execute(
            cli.buildCommandFromArray(deps, getLinkCmd),
            stdout => {
                cli.runFn(onComplete);
            });
    },

    iteratedeps = (args, onComplete) => {
        if (!args.length) {
            log.out("You need to pass in a command to run in all deps.");
            cli.runCommand('help', ['deps']);
            onComplete();
            return;
        }
        let cmd = utils.replaceAll("'", "", args.join(" "));
        commandIterateInDeps(allDeps, cmd, (errored, completed) => {
            if (errored.length) {
                log.multiline(null, null, errored);
            }
            else if (completed.length) {
                log.multiline(null, null, completed)
            }
            onComplete();
        }, true);
    },


// HELPER FUNCTIONS

    updateDeps = (callback) => {
        cloneDeps(missingDeps, stdout => {
            log.out("updateDeps:  cloned missing deps.");
            log.out("now updating existing deps... ");

            commandIterateInDeps(
                existingDeps,
                DEP_UPDATE_CMD,
                (errored, completed) => {
                    log.pad();
                    log.pad(0);
                    if (errored) {
                        _.map(error => {
                            //log.out(error);
                        }, errored);
                    }
                    if (completed) {
                        _.map(stdout => {
                        }, completed);
                    }
                },
                true);
        });
    },

    iterateDeps = (scope, d, fn, callback) => {
        let
            errored = [],
            completedNum = 0,
            completed = [],
            dir
            ;

        const l = d.length,
            infoFormat = (dep, dir) => {
                dep = '- ' + dep + ' -';
                dir = '- ' + dir + ' ';
                return [dep.yellow.bgBlack, dir.bgBlack.cyan];
            },
            errorFormat = (err) => {
                err = log.applyStyleToTerms(err, 'error', ['Error:']);
                return err.split("error:");
            },
            addError = (dep, dir, error) => {
                error = infoFormat(dep, dir).concat(errorFormat(error));
                error.push('');
                errored = errored.concat(error);
            },
            addCompleted = (dep, dir, out) => {
                completedNum++;
                completed = completed.concat(infoFormat(dep, dir)).concat(out);
            },
            getDone = type => {
                return () => {
                    if (completedNum >= l) {
                        if (utils.isFunction(callback)) {
                            callback(errored ? errored : null, completed.length ? completed : null);
                        }
                    }
                }
            },
            checkSuccess = getDone("success"),
            checkError = getDone("error")
            ;

        let getNextDep = utils.getIterator(d);

        let runNext = () => {
            let d = getNextDep.next().value;
            if (d) {
                scope(d);
                dir = paths.cwd();
                fn(d,
                    (out) => {
                        addCompleted(d, dir, out, ' ');
                        checkSuccess();
                        runNext();
                    },
                    (err) => {
                        if (err.indexOf("stderr")) {
                            addError(d, dir, err);
                        }
                        checkError();
                    });
            }
        };
        runNext();
    },

    /**
     *
     * @param scope
     * @param deps
     * @param c
     * @param callback
     * @param shhh
     */
    commandIterateDeps = (scope, deps, c, callback, shhh) => {
        iterateDeps(scope, deps, (dep, success, error) => {
            c = c.replace("{{module}}", dep);
            cli.execute(
                c,
                //SUCCESS
                stdout => {
                    success(stdout);
                },
                //ERROR
                err => {
                    error(err);
                },
                shhh
            );
        }, callback);
    },

    /**
     *
     * @param d
     * @param cmd
     * @param callback
     * @param shhh
     */
    commandIterateInDeps = (d, cmd, callback, shhh) => {
        commandIterateDeps(paths.gotoRoot, d, cmd, callback, shhh);
    },

    /**
     *
     * @param d
     * @param cmd
     * @param callback
     * @param shhh
     */
    commandIterateOverDeps = (d, cmd, callback, shhh) => {
        commandIterateDeps(paths.rootScope, d, cmd, callback, shhh);
    },

    cleanDepsInstall = (callback) => {
        cleanDeps(stdout => {
            log.out(stdout);
            cloneDeps(deps, stdout => {
                cli.runFn(callback, stdout);
            })
        });
    },

    cloneDeps = (d, onComplete, branch, shhh) => {
        branch = utils.stripArray(branch);
        log.out("Cloning the following dependencies:");
        log.out(d);
        log.out("...");
        const clone = branch => {
            const cloneCmd = getCloneCmd('master');
            paths.gotoRoot();
            cli.execute(
                cli.buildCommandFromArray(d, cloneCmd),
                stdout => {
                    paths.gotoModule();
                    cli.execute('npm run switch-dev',
//SUCCESS
                        stdout => {
                            cli.runFn(onComplete);
                        },
//ERROR
                        err => {
                            console.log("bundle: " + err);
                        })
                },
                error => {
                },
                shhh
            );
        };
        if (branch) {
            clone(branch);
        }
        else {
            getCurrentGitBranch(clone);
        }
    },

    cleanDeps = (callback, doPrompt) => {
        const removeDeps = () => {
            const d = existingDeps;
            log.pad();
            log.out("Deleting the following dependencies:");
            log.out(d);
            log.out("...");
            let p,
                i = 0,
                l = d.length || 0,
                cb,
                getCb = dep => {
                    return stdout => {
                        i++;
                        log.out("done removing: " + dep);
                        if (i >= l) {
                            cli.logCommandComplete("clean-deps");
                            cli.runFn(callback, stdout);
                        }
                    }
                };
            if (d && d.length) {
                _.map(dep => {
                    p = path.join(paths.rootDir, dep);
                    cb = getCb(p);
                    if (paths.dirExists(p)) {
                        paths.rmdir(p, cb);
                    }
                    else {
                        cb();
                    }
                }, d);
            }
            else {
                cli.runFn(callback);
            }
        };
        if (doPrompt) {
            log.out(doPrompt + " (y/n) [y is default]");
            prompt.get(['remove'], (err, result) => {
                result = result.remove.toString().toLowerCase();
                if (result == "" || result == "y" || result == "yes") {
                    removeDeps();
                }
                else {
                    cli.runFn(callback);
                }
            });
        } else {
            removeDeps();
        }
    },

    promptDepsInstall = (callback) => {
        const choices = {
            a: "Remove and re-install dependency repos.",
            b: "Update dependency repos.",
            c: "Hard reset dependency repos.",
            d: "(or 'exit') Exit install-deps and move to the next command."
        };
        log.out("You currently have the following module dependencies installed in '" + paths.rootDir + "'.");
        log.out("The next action could overwrite any uncommitted changes to these directories.");
        log.out(existingDeps);
        log.pad(0);

        utils.logChoices("Please answer 'a', 'b', c, or 'd' (d is default)",
            choices);

        prompt.get(['answer'], (err, result) => {
            let answer = result.answer.toString().toLowerCase();
            if (choices[answer]) {
                log.out(choices[answer]);
            }
            switch (answer) {
                case "a":
                    cleanDepsInstall(callback);
                    break;
                case "b":
                    updateDeps(callback);
                    break;
                case "c":
                    cli.runCommand('reset-deps');
                    break;
                case "d":
                case "exit":
                case "":
                    process.exit();
                    cli.runFn(callback);
                    break;


                default:
            }
        });
    },


    depsExist = (deps) => {
        existingDeps = [];
        missingDeps = [];
        _.map(dep => {
            if (paths.dirExists(paths.rootDir, dep)) {
                existingDeps.push(dep);
            }
            else {
                missingDeps.push(dep);
            }
        }, deps);
        return existingDeps.length ? true : false;
    },

    getCloneCmd = (branch) => {
        let c = DEP_CLONE_CMD
            .replace("{{branch}}", branch)
            .replace("{{GIT_URL}}", paths.GIT_URL);
        return module => {
            return c.replace("{{module}}", module);
        }
    },

    getLinkCmd = (module) => {
        return DEP_LINK_CMD.replace("{{module}}", module);
    },

    getCurrentGitBranch = (callback) => {
        paths.gotoModule();
        cli.execute("git branch",
            //SUCCESS
            stdout => {
                let b = stdout.toString().split("\n");
                b = b[0].toString();
                b = utils.replaceAll("*", "", utils.replaceAll(" ", "", b));
                cli.runFn(callback, b);
            },
            //ERROR
            err => {
                log.out(err);
            })
    },

    configDeps = () => {
        let config;
        paths.gotoModule();
        if (paths.packagejson) {
            if (paths.packagejson.config) {
                config = paths.packagejson.config;
                if (config.deps) {
                    deps = config.deps.split(" ");
                    depsExist(deps);
                    allDeps = deps.slice();
                    allDeps.push(paths.moduleName);
                }
            }
        }
    },

    setOpt = (opt, id) => {
        char_width = opt.char_width;
        cli = opt.cli;
        utils = opt.utils;
        log = opt.log;
        debug = log.debug(
            `${id}:`
        );
        paths = opt.paths;
        configDeps();
    };
