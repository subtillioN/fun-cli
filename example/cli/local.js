// an example plugin
'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        cmds:{
            localsetup: {
                fn: localsetup, id: "local-setup", interface: "npm run ",
                desc: `Sets up local development environment and gives directions for '${paths.moduleName}' configuration.`
            },
            build: {
                fn: null, id: "build", interface: "npm run ",
                desc: `Creates a local self-executing bundle, named ${SFX_BUNDLE_FILE_NAME}, for faster load of local development environment (localhost).`
            }
        }
    };
};


let
    cli,
    log,
    debug,
    paths,
    utils,
    baseURL,
    char_width,
    _ = require('ramda'),
    fs = require('fs'),
    jsonfile = require('jsonfile'),
    prompt = require('prompt'),
    path = require('path')
    ;

const
    BUNDLE_CMD = "jspm bundle {{src}} bundle.js",
    SFX_BUILD_CMD = "npm run build",
    DEFAULT_BASE_URL = "https://localhost/js/{{moduleName}}/",
    JSPM_BROWSER_TMPL = "jspm.browser.tmpl",
    JSPM_BROWSER = "jspm.browser.js",
    SFX_BUNDLE_FILE_NAME = "fun-bundle-sfx.js",
    WINDOWS_BUNDLE_PATCH_PATH = "jspm_packages/github/imskojs/ngIOS9UIWebViewPatch@master.json",
    WINDOWS_BUNDLE_PATCH_VALUE = "ngIOS9UIWebViewPatch.js",
    MARKET_CONFIGURATION_URL_EG = "https://localhost/cf#/content/configuration/global/markets.html",


    localsetup = (args, onComplete) => {
        windowsBundlePatch(() => writeLocalConfig(stdout => {
            runSFXBuild(stdout => {
                logSetupConfiguration(onComplete);
            });
        }));
    },

    bundle = (args, onComplete) => {
        let src = path.join(paths.moduleDir, paths.moduleSrc);
        cli.execute(BUNDLE_CMD.replace("{{src}}", src),
//SUCCESS
            stdout => {
                cli.runFn(onComplete);
                process.exit();
            },
//ERROR
            err => {
                log.out("bundle: " + err);
            },
            false)
    },

    writeLocalConfig = (callback) => {
        const filepath = paths.moduleDir + '/' + JSPM_BROWSER,
            defaultBaseURL = DEFAULT_BASE_URL.replace("{{moduleName}}", paths.moduleName);
        fs.readFile(paths.moduleDir + '/' + JSPM_BROWSER_TMPL, (err, data) => {
            if (err) {
                throw err;
            }
            const fileString = data.toString();
            log.out("Please enter the base URL of your local development setup.");
            log.out("Or hit 'enter' to use default: " + defaultBaseURL);
            prompt.get(['url'], (err, result) => {
                baseURL = result.url.toString();
                if (baseURL == "") {
                    baseURL = defaultBaseURL;
                }
                else if (baseURL[baseURL.length - 1] != "/") {
                    baseURL = baseURL + "/";
                }
                log.out("baseURL: ", baseURL);
                paths.rmdir(filepath, stdout => {
                    fs.writeFile(filepath, fileString.replace("{{baseurl}}", baseURL), null, stdout => {
                        cli.runFn(callback, stdout);
                    })
                });
            });
        });
    },

    runSFXBuild = (callback) => {
        paths.gotoModule();
        cli.execute(SFX_BUILD_CMD, (stdout) => {
                log.out("stdout is ... ", stdout);
                cli.runFn(callback, stdout);
            },
            (error) => {
                log.out("error is ... ", error);
            },
            false
        );
    },

    windowsBundlePatch = (callback) => {
        if (utils.osType.indexOf("Windows") > -1) {
            log.out("running windows bundle patch");
            paths.gotoModule();
            let imskojsPath = path.join(paths.moduleDir, WINDOWS_BUNDLE_PATCH_PATH);
            fs.readFile(imskojsPath, (err, data) => {
                if (err) {
                    throw err;
                }
                data = JSON.parse(data);
                if (data.main != WINDOWS_BUNDLE_PATCH_VALUE) {
                    data.main = WINDOWS_BUNDLE_PATCH_VALUE;
                    jsonfile.writeFile(imskojsPath, data, {spaces: 2}, (err) => {
                        if (err) {
                            throw err;
                        }
                        log.info('Windows bundle patch complete\n\n\n');
                        cli.runFn(callback);
                    });
                }
                else {
                    cli.runFn(callback);
                }
            });
        } else {
            cli.runFn(callback);
        }
    },

    logSetupConfiguration = (callback) => {
        let ln = log.line('info', char_width);
        ln(`-`);
        ln(` `);
        log.info(` Setup '${paths.moduleName}' Configuration:`);
        ln(` `);
        log.info(` Open browser to your local '${paths.moduleName}' configuration e.g.:`);
        log.info(` ${MARKET_CONFIGURATION_URL_EG}`);
        log.info(` Open the market configuration.`);
        log.info(` In the 'Development' tab, set your bundle path to:`);
        ln(` `);
        ln(` `);
        log.info(` Code Bundle:${baseURL + SFX_BUNDLE_FILE_NAME}`);
        ln(` `);
        ln(` `);
        ln(` `);
        log.info(` 'npm start' complete`);
        ln(` `);
        ln(` `);
        log.info(`Once configuration is setup (see above market configuration instructions), your local development environment for '${paths.moduleName}' should be ready to go.`);
        ln(` `);
        ln(` `);
        ln(`-`);
        log.out('\n\n\n');
        cli.runFn(callback);
    },

    setOpt = (opt, id) => {
        cli = opt.cli;
        log = opt.log;
        debug = log.debug(`${id}:`);
        paths = opt.paths;
        utils = opt.utils;
        char_width = opt.char_width;
    }
    ;
