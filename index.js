/*global exports*/
"use strict";

var report;
function ensureCategory(category, enabled = true) {
    const capture = report._captures[category];
    return capture || (report._captures[category] = {status: enabled, output: []});
}

function printer(logger) {
    return (category, ...args) => {
        const capture = ensureCategory(category);
        if (!capture.status) return;
        const all = ensureCategory('all', false);
        const string = [category].concat(...args).join(' '); // FIXME: there's actually more to it. Maybe don't join them?
        capture.output.push(string);
        if (all.status) all.output.push(string);
        logger(...args, category);
        return category;
    };
}

report = {
    timeouts: {},
    reporter: () => new Error(`reporter not configured in ${__filename}`),
    config: options => {
        report.reporter = options.reporter;
        report.timeouts = options.timeouts;
        var logger = options.console === undefined ? console : options.console;
        var noop = () => {};
        function getLogger(level) {
            if (!logger) return noop;
            return logger[level] || noop;
        }
        report.log = printer(getLogger('log'));
        report.debug = printer(getLogger('debug'));
        report.info = printer(getLogger('info'));
        report.warn = printer(getLogger('warn'));
        report.error = printer(getLogger('error'));
        return report;
    },
    throw: (category, throwable = 'error', ...args) => {
        report.error(category, throwable, ...args);
        const cat = report._captures[category];
        const out = cat.output;
        delete report._captures[category];
        report.reporter(category, out.reverse());
        throw throwable;
    },
    time: (category) => {
        const capture = ensureCategory(category);
        capture.start = Date.now();
    },
    timeEnd: (category) => {
        const capture = ensureCategory(category);
        if (!capture.start) report.throw(category, "timeEnd called without time");
        const elapsed = Date.now() - capture.start;
        const timeout = report.timeouts[category];
        if (timeout === undefined) return true;
        if (elapsed <= timeout) return report.log(category, elapsed);
        report.throw(category, `Error: lag ${elapsed} exceeded limit ${timeout}`, elapsed);
    },
    category: (category, enable) => {
        ensureCategory(category).status = enable;
    },
    capture: (enable) => {
        const all = ensureCategory('all');        
        all.status = enable;
        if (!enable) {
            const out = all.output
            all.output = [];
            return out;
        }
    },
    _captures: {}
};
module.exports = report;
