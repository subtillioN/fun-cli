'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        cmds: {
            newrelease: {
                fn: newrelease, id: "new-release", interface: "npm run ",
                desc: "Creates a new release branch via git flow",
                args: [{name: "Pass in the name of the release branch."}]
            },
            switchdev: {
                fn: null, id: "switch-dev", interface: "npm run ",
                desc: "Switches all jspm-git registry module dependencies to the 'develop' branch."
            },
            switchmaster: {
                fn: null, id: "switch-master", interface: "npm run ",
                desc: "Switches all jspm-git registry module dependencies to the 'master' branch."
            },
            switchrelease: {
                fn: null, id: "switch-release", interface: "npm run ",
                desc: "Switches all jspm-git registry module dependencies to the 'release' branch. Release branch names are non-standard and must be passed in as an extra flag.",
                args: [{name: "Pass in the name of the release branch."}]
            },
            switchbranch: {
                fn: null, id: "switch-branch", interface: "npm run ",
                desc: "Base command for switching jspm-git branches across dependencies.",
                args: [{name: "Pass in the name of the branch to switch to."}]
            },
            writedepsfiles: {
                fn: writedepsfiles, id: "write-deps-files", interface: "npm run ",
                desc: "Writes the dependencies into the files for switching jspm-git branches.",
                args: [{name: "Pass in the name of the branch to switch to."}]
            }
        }
    };
};

let
    cli,
    log,
    debug,
    paths,
    deps,
    utils,
    path = require('path'),
    _ = require('ramda'),
    jsonfile = require('jsonfile'),
    fs = require('fs');


const
    GIT_NEW_RELEASE_CMD = "git flow release start {{release}} {{base}}",
    GIT_BRANCH_DEVELOP = "develop",
    GIT_BRANCH_MASTER = "master",
    GIT_BRANCH_HOTFIX = "{{name}}",
    GIT_BRANCH_RELEASE = "{{name}}",
    GIT_BRANCH_FEATURE = "{{name}}",
    GIT_NEW_BRANCH_CMD = "git checkout -b {{branch}} {{origin}}",
    GIT_SWITCH_BRANCH_CMD = "git checkout {{branch}}",
    GIT_CHECK_BRANCH_CMD = "git ls-remote --heads {{GIT_URL}}{{module}}.git {{branch}}",
    GITFLOW_START_FEATURE_CMD = "",


    newrelease = (args, onComplete) => {
        const
            release = args.shift(),
            base = args.shift(),
            c = GIT_NEW_RELEASE_CMD
                .replace("{{release}}", release)
                .replace("{{base}}", base ? base : "");

        deps.commandIterateIn(deps.all, c,
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
                        //log.out("stdout is ... ", stdout);
                    }, completed);
                    log.out("updateDeps: cloneDeps completed: completed.length is ... ", completed.length);
                    log.out("updateDeps: cloneDeps completed: error.length is ... ", errored.length);
                    //callback();
                }
            }, false);

        //onComplete();

    },

//TODO :: This is working, but since the names of the repos switched from camelcase eg 'nsAem' to lowercase, 'nsaem', it has broken.
    writedepsfiles = (args, onComplete) => {
        if (args.length) {
            let branch = args[0];
            writeGitSwitchFiles(branch, stdout => {
                log.out("writeGitSwitchFiles: " + stdout);
                cli.runFn(onComplete, stdout);
            }, branch);
        }
        else {
            cli.runCommand('help', ['write-deps-files']);
        }

    },

    switchDepBranch = (dep, branch, callback) => {
        const cmd = GIT_SWITCH_BRANCH_CMD.replace("{{branch}}", branch.name);
        paths.gotoRoot(dep);
        cli.execute(cmd,
            (stdout) => {
                log.out("stdout is ... ", stdout);
                cli.runFn(callback);
            },
            (stderr) => {
                log.out("stderr is ... ", stderr);
                cli.runFn(callback);
            }, false)
    },

    switchBranch = (branch, callback) => {
        log.out("branch is ... ", branch);
        const cmd = GIT_SWITCH_BRANCH_CMD.replace("{{branch}}", branch.name);
        log.out("cmd is ... ", cmd);
        deps.commandIterateIn(deps.all, cmd,
            (errored, completed) => {
            }, false);
    },

    setGitBranchObject = (flag, name) => {
        let branches = {
                "-d": {
                    type: "develop",
                    origin: "develop",
                    name: GIT_BRANCH_DEVELOP
                },
                "-m": {
                    type: "master",
                    origin: "master",
                    name: GIT_BRANCH_MASTER
                },
                "-h": {
                    type: "hotfix",
                    origin: "master",
                    name: GIT_BRANCH_HOTFIX
                },
                "-r": {
                    type: "release",
                    origin: "develop",//TODO: this should be different... eventually
                    name: GIT_BRANCH_RELEASE
                },
                "-f": {
                    type: "feature",
                    origin: "develop",
                    name: GIT_BRANCH_FEATURE
                }
            },
            branch = branches['-f'],
            updateBranchName = name => branch.name = branch.name.replace("{{name}}", name),
            getBranchFromFlag = flag => {
                _.map(b => {
                        if (b.type == flag) {
                            branch = b;
                        }
                    }, branches
                );

                return branch;
            },
            setBranch = (flag, name) => {
                if (flag && name) {
                    branch = branches[flag];
                    updateBranchName(name);
                }
                else if (flag) {
                    branch = getBranchFromFlag(flag);
                    updateBranchName(flag);
                }
                return branch;
            };

        setBranch(flag, name);

        return branch;
    },

    checkBranchExistsForDep = (branch, depCallback) => {
        log.out("checkBranchExistsForDep");
        const filterOutput = stdout => {
                stdout = utils.replaceAll("\n", "", stdout);
                const headIndex = stdout.split(" ").join("").indexOf("refs/heads");
                return headIndex > 0;
            },
            checkSuccess = stdout => {
                //log.out("checkSuccess:: stdout is ... ", stdout);
                return filterOutput(stdout);
            };

        let cmd = getCheckBranchCmd(branch.name);

        deps.iterate(paths.rootScope, deps.all, (dep, success, error) => {
                let c = cmd.replace("{{module}}", dep);
                log.out("c is ... ", c);
                cli.execute(
                    c,
                    //SUCCESS
                    stdout => {
                        depCallback({dep, exists: checkSuccess(stdout)});
                        success(stdout);
                    },
                    //ERROR
                    err => {
                        error(err);
                    },
                    true
                );
            }, (errored, completed) => {
                log.pad();
                log.pad(0);
                if (errored) {
                    _.map(error => {
                        log.out("error" + error);
                    }, errored);
                }
                if (completed) {
                    log.out("completed.length is ... ", completed.length);
                }
            }
            , true);
    },

    startDepFeatureBranch = (dep, branch, callback) => {
        paths.gotoRoot(dep);
        const cmd = GITFLOW_START_FEATURE_CMD.replace("{{branch}}", branch.name).replace("{{origin}}", branch.origin);
        cli.execute(cmd,
//SUCCESS
            stdout => {
                callback(stdout);
            },
//ERROR
            err => {
                log.out("createDepBranch: " + err);
            }, false);
    },

    createDepBranch = (dep, branch, callback) => {
        paths.gotoRoot(dep);
        const cmd = GIT_NEW_BRANCH_CMD.replace("{{branch}}", branch.name).replace("{{origin}}", branch.origin);
        cli.execute(cmd,
//SUCCESS
            stdout => {
                callback(stdout);
            },
//ERROR
            err => {
                log.out("createDepBranch: " + err);
            }, false);
    },

    refreshBranch = (branch, callback) => {
        deps.clean(stdout => {
            log.out("cleanDeps: stdout is ... ", stdout);
            //TODO: when dev gets to master, set to deps.all so that we iterate over the root module as well
            deps.clone(deps.other, stdout => {
                log.out("cloneDeps: stdout is ... ", stdout);
                writeGitSwitchFiles(branch.name, stdout => {
                    log.out("writeGitSwitchFiles: " + stdout);
                    cli.runFn(callback, stdout);
                }, branch.name);
            }, branch.name);
        }, "Are you sure you want to reinstall your dependencies to the '" + branch.name + "' branch?");
    },

    writeGitSwitchFiles = (branchName, callback) => {
        deps.getCurrentGitBranch(b => {
            console.log("current b is ... ", b);
            writeGitSwitchPkgjson(branchName, b, err => {
                log.out("writeGitSwitchPkgjson: complete");
                writeGitSwitchJSPMConfig(branchName, b, err => {
                    log.out("writeGitSwitchJSPMConfig: complete");
                    cli.runFn(callback);
                });
            });

        });
    },

    writeGitSwitchPkgjson = (newBranchId, currentBranchId, callback) => {
        let currentBranch;
        let newBranch;
        let pjsonDeps = JSON.stringify(paths.packagejson.jspm.dependencies);
        _.map(dep => {
            currentBranch = dep + "@" + currentBranchId;
            newBranch = dep + "@" + newBranchId;
            pjsonDeps = utils.replaceAll(currentBranch, newBranch, pjsonDeps);
        }, deps.other);

        paths.packagejson.jspm.dependencies = JSON.parse(pjsonDeps);
        paths.gotoModule();
        let p = path.join(paths.cwd(), paths.PKG_JSON_PATH);
        jsonfile.writeFile(p, paths.packagejson,
            {spaces: 2},
            err => {
                if (err) {
                    throw err;
                }
                cli.runFn(callback);
            });
    },

    writeGitSwitchJSPMConfig = (newBranchId, currentBranchId, callback) => {
        const filePath = paths.JSPM_CONFIG_PATH,
            writeFile = content => {
                fs.writeFile(filePath, content, err => {
                    if (err) {
                        log.out("yes, witeFile erred: " + err);
                        return log.out(err);
                    }
                    cli.runFn(callback);
                });
            },
            processFile = content => {
                let currentBranch;
                let newBranch;
                _.map(dep => {
                    currentBranch = dep + "@" + currentBranchId;
                    newBranch = dep + "@" + newBranchId;
                    content = utils.replaceAll(currentBranch, newBranch, content);
                }, deps.other);
                writeFile(content);
            },
            readFile = () => {
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        throw err;
                    }
                    processFile(data.toString());
                });
            };

        readFile();
    },

    getSwitchBranchCmd = (branch) => {
        return GIT_SWITCH_BRANCH_CMD.replace("{{branch}}", branch);
    },

    getCheckBranchCmd = (branch) => {
        return GIT_CHECK_BRANCH_CMD
            .replace("{{branch}}", branch)
            .replace("{{GIT_URL}}", paths.GIT_URL);
    },

    checkGitFlow = () => {

    },

    setOpt = (opt, id) => {
        log = opt.log;
        debug = log.debug(`${id}:`);
        cli = opt.cli;
        paths = opt.paths;
        deps = opt.deps;
        utils = opt.utils;
    }
    ;