'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        cmds:{
            example1: {
                fn: example, id: "example1", interface: "npm run ",
                desc: `An example command for use in the '${paths.moduleName}' module context.`
            },
            example2: {
                fn: null, id: "example2", interface: "npm run ",
                desc: `Another example which just runs an npm command, as you can see with the 'null' for a command fn. This command also has an example argument in the args list.`,
                args: [{arg: "This is an argument. Pass whatever you like."}]
            }
        }
    };
};


let
    cli,
    log,
    debug,
    paths,
    utils
    ;

const
    example = (args, onComplete) => {
        console.log(`Running example command with these args ... ${args}`);
        onComplete();
    },

    setOpt = (opt, id) => {
        cli = opt.cli;
        log = opt.log;
        debug = log.debug(`${id}:`);
        paths = opt.paths;
        utils = opt.utils;
    }
    ;
