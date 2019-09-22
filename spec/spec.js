/*global describe, it, require*/
"use strict";

const reports = {};
const report = require('ki1r0y-reporting').config({
    console: null,
    timeouts: {car: 750, bird: 500, speed: 2},
    reporter: (category, messages) => {
        reports[category] = messages;
    }
});

describe('Report', () => {
    describe('normal use', () => {
        it('is silent for initial response completed in time', (done) => {
            report.time('car');
            setTimeout(() => {
                expect(report.timeEnd('car')).toBeTruthy();
                done();
            }, report.timeouts.car - 200);
        });
        it('is not expensive to time', () => {
            function doN(n) {
                while (n-- > 0) {
                    report.time('speed');
                    report.timeEnd('speed');
                }
            }
            report.category('speed', false);
            doN(3);
            const start = Date.now();
            doN(10000);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(30);
        });
        it('supports logging by category, that can be captured', () => {
            report.capture(true);
            report.log('cat', 'some log');
            report.warn('dog', 'warning');
            report.debug('cat', 'debug this');
            report.category('cat', false);
            report.info('cat', 'not shown');
            report.info('dog', 'note this');
            report.category('cat', true);
            report.log('cat', 'more');
            var output = report.capture(false);
            function check(index, category, message) {
                expect(output[index]).toContain(category);
                expect(output[index]).toContain(message);
            }
            check(0, 'cat', 'some log');
            check(1, 'dog', 'warning');
            check(2, 'cat', 'debug this');
            check(3, 'dog', 'note this');
            check(4, 'cat', 'more');
        });
    });
    describe('error', () => {
        it('calls reporter if a measured operation takes too long', (done) => {
            report.time('bird');
            setTimeout(() => {
                expect( () => report.timeEnd('bird') ).toThrow();
                expect(reports.bird[0]).toContain('rror');
                expect(reports.bird[0]).toContain('lag')
                done();
            }, report.timeouts.bird + 10);
        });
        it('can be triggered manually', () => {
            expect( () => report.throw('bat') ).toThrow();
            expect(reports.bat[0]).toContain('error');
        });
        it('can be triggered with message', () => {
            expect( () => report.throw('squirrel', 'hello') ).toThrow();
            expect(reports.squirrel[0]).toContain('hello');
        });
        it('includes logged info backwards', () => {
            report.log('gnat', 'foo', 'bar');
            report.log('gnat', 'baz');
            expect( () => report.throw('gnat', 'hello') ).toThrow();
            report.log('gnat', 'not shown');
            function check(index, message) {
                expect(reports.gnat[index]).toContain(message);
            };
            check(0, 'hello');
            check(1, 'baz');
            check(2, 'foo');
            check(2, 'bar');
            expect(reports.gnat.length).toBe(3);
        });
    });
});
