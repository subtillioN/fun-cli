'use strict';
module.exports = (opt, id) => {
    setOpt(opt, id);
    return {
        isArray: isArray,
        stripArray: stripArray,
        replaceAll: replaceAll,
        getIterator: getIterator,
        logChoices: logChoices,
        isFunction: isFunction,
        osType: os.type()
    };
};

let os = require('os'),
    _ = require('ramda'),
    log,
    debug
    ;

const


    isFunction = (fn) => {
        return (fn && {}.toString.call(fn) === '[object Function]');
    },

    isArray = (obj) => {
        return Array.isArray(obj);
    },

    stripArray = (obj) => {
        if (isArray(obj)) {
            obj = obj.join(", ");
            stripArray(obj);
        }
        return obj;
    },

    replaceAll = (find, replace, str) => {
        if (str && str != "") {
            let f = find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            str = str.replace(new RegExp(f, 'g'), replace);
        }
        return str;
    },

    logChoices = (p, choices) => {
        log.out(p);
        _.map(key => {
            log.out("  - " + key + ") " + choices[key]);
        }, Object.keys(choices));
    }
    ;

function* getIterator(d) {
    let index = 0;
    while (true)
        yield d[index++];
}

const setOpt = (opt, id) => {
    log = opt.log;
    debug = log.debug(`${id}:`);
};