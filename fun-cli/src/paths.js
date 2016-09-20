'use strict';

module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        moduleDir: moduleDir,
        rootDir: rootDir,
        packagejson: packagejson,
        nodemodules: nodemodules,
        jspmpackages: jspmpackages,
        moduleName: moduleName,
        PKG_JSON_PATH: PKG_JSON_PATH,
        JSPM_CONFIG_PATH: JSPM_CONFIG_PATH,
        GIT_URL: GIT_URL,
        logDirs: logDirs,
        chdir: chdir,
        rmdir: rmdir,
        gotoRoot: gotoRoot,
        gotoModule: gotoModule,
        dirExists: dirExists,
        rootScope: rootScope,
        moduleSrc: moduleSrc,
        cwd: cwd
    };
};

let
    log,
    debug,
    utils,
    moduleDir,
    rootDir,
    nodemodules = "node_modules",
    jspmpackages = "jspm_packages",
    moduleName,
    packagejson,
    moduleSrc,
    fs = require('fs'),
    rimraf = require('rimraf'),
    path = require('path');

const
    PKG_JSON_PATH = './package.json',
    JSPM_CONFIG_PATH = './jspm.config.js',
    GIT_PROTOCOL = "ssh://git@",
    GIT_ROOT = "bitbucket.example-project.net/fa/",
    GIT_URL = GIT_PROTOCOL + GIT_ROOT,


    setupDirectories = () => {
        moduleDir = cwd();
        rootDir = chdir('../');
        nodemodules = path.join(moduleDir, nodemodules);
        jspmpackages = path.join(moduleDir, jspmpackages);
        const parr = moduleDir.toString().split(path.sep);
        moduleName = parr[parr.length - 1];
    },

    logDirs = () => {
        log.pad();
        log.out("Using the following directory mappings: ");
        log.out("moduleDir: ", moduleDir);
        log.out("rootDir: ", rootDir);
        log.out("nodemodules: ", nodemodules);
        log.out("jspmpackages: ", jspmpackages);
        log.out("___");
        log.pad();
    },

    chdir = (dir) => {
        process.chdir(dir);
        return cwd();
    },

    rmdir = (dir, callback) => {
        rimraf(dir, {}, callback || function (item) {
            });
    },

    gotoRoot = (dir) => {
        chdir(path.join(rootDir, dir || ""));
    },

    gotoModule = () => {
        chdir(moduleDir);
    },

    dirExists = (dir, p) => {
        if (p) {
            dir = path.join(dir, p);
        }
        return fs.existsSync(dir)
    },

    rootScope = d => {
        gotoRoot();
    },

    setupConfig = () => {
        gotoModule();
        packagejson = require(path.join(moduleDir, PKG_JSON_PATH));
        if (packagejson) {
            if (packagejson.jspm) {
                moduleSrc = packagejson.jspm.main;
            }
        }
    },

    cwd = () => {
        return process.cwd();
    },

    setOpt = (opt,id) => {
        log = opt.log;
        debug = log.debug(`${id}:`);
        utils = opt.utils;
        setupDirectories();
        setupConfig();
    }
    ;