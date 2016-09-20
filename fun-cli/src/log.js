"use strict";


module.exports = (opt) => {
    defaultWidth = opt.char_width;
    return {
        out: log,
        cmd: logCmd,
        help: logHelp,
        info: logInfo,
        prompt: logPrompt,
        em: logEmphasis,
        warn: logWarn,
        error: logError,
        applyStyle: applyStyle,
        applyStyleToTerms: pick,
        styleSelect: logStyleSelect,
        line: logLine,
        multiline: printLines,
        custom: customLog,
        getLine: getLine,
        shhh: logShhh,
        debug: logDebug,
        pad: logPad,
        setDebug: val => doDebug = val
    };
};

let doDebug = false,
    _ = require('ramda'),
    newLine = "\n",
    colors = require('colors'),
    defaultWidth;

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: ['bgBlack', 'white'],
    data: 'grey',
    help: 'cyan',
    warn: ['bgYellow', 'black'],
    debug: ['bgBlack', 'cyan'],
    error: ['bgBlack', 'red']
});

const

    log = console.log,

    customLog = _.curry((style, width, txt) => {
        width = width || defaultWidth;
        let l = log;
        if (!width) {
            l(applyStyle(style, txt))
        }
        else if (txt.length > width) {
            printLines(style, width, applyWidth(width, txt))
        }
        else {
            txt = applyWidth(width, txt);
            l(applyStyle(style, txt));
        }
    }),

    applyStyle = _.curry((style, txt) => {
        if (style) {
            return txt[style]
        }
        return txt
    }),

    logCmd = (txt, cmd, complete) => {
        let cmdStyle = complete ? 'green' : 'cyan';
        customLog(null, defaultWidth, colors.bgBlack(txt[cmdStyle] + " " + (cmd != undefined ? cmd.yellow : "")))
    },

    logHelp = (txt, cmd) => log(colors.bgBlack(txt.cyan + " " + (cmd ? cmd.yellow : ""))),

    logInfo = (txt, width) => customLog('info', width, txt),

    logPrompt = txt => log(txt.prompt),

    logEmphasis = txt => log(` ${txt} `.inverse),

    logWarn = customLog('warn', null),

    logError = (txt, pickErrors, width) => {
        if (!pickErrors.length) {
            txt = txt.red;
        }
        else {
            txt = pick(txt, 'error', pickErrors);
        }

        log(txt);
    },

    logShhh = (shhh, txt) => {
        if (!shhh)log(txt);
    },

    logDebug = (data)=>(...txt)=> {
        if (!doDebug)return;
        log.apply(this, [data.inverse, txt ? txt.join(" ").debug : ""]);
    },

    logPad = (amt) => {
        if (amt == 0) {
            log("");
            return;
        }
        let str = _.map((item) => newLine, new Array(amt || 2)).join("");
        log(str);
    },

    logStyleSelect = (txt, style, pickTerms) => {
        log(pick(txt, style, pickTerms));
    },

    pick = (txt, style, strings) => {
        _.map((err) => {
            txt = txt.split(err).join(` ${err} `[style]);
        }, strings);
        return txt;
    },

    getLine = _.curry((style, width, el) => {
        width = width || 100;
        el = el || "-";
        let ln = "";
        for (var i = 0; i < width; i++) {
            ln += el;
        }
        return style ? ln[style] : ln;
    }),

    logLine = _.curry((style, width, el) => {
        let line = getLine(style, width, el);
        log(line);
    }),

    applyWidth = (width, txt) => {
        if (!width)return txt;
        if (txt.length > width) {
            txt = breakLine(width, txt);
            return txt;
        }
        return width ? txt + getLine(null, width - txt.length, ` `) : txt;
    },

    breakLine = (width, txt) => {
        let cLine = 0,
            l = "",
            lines = _.reduce((acc, c) => {
                c = " " + c;
                l = acc[cLine] || "";
                if ((l.length + c.length) < width - 1) {
                    l += c;
                }
                else {
                    l = "" + c;
                    cLine++;
                }
                acc[cLine] = l;
                return acc;
            }, [], txt.split(" "));
        return lines;
    },

    printLines = (style, width, lines) => {
        _.map((txt) => {
            log(applyStyle(style, applyWidth(width, txt.replace('\n', ''))));
        }, lines);
    },

    setWidth = (w) => {
        defaultWidth = w;
    }
    ;