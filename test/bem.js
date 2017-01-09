'use strict';

const assert = require('assert');
const parse = require('@emmetio/abbreviation');
require('babel-register');
const bem = require('../lib/bem').default;
const stringify = require('./assets/stringify').default;

describe('BEM transform', () => {
	const expand = abbr => stringify( bem( parse(abbr) ) );

    it('modifiers', () => {
		assert.equal(expand('div.b_m'), '<div class="b b_m"></div>');
		assert.equal(expand('div.b._m'), '<div class="b b_m"></div>');
		assert.equal(expand('div.b_m1._m2'), '<div class="b b_m1 b_m2"></div>');
		assert.equal(expand('div.b>div._m'), '<div class="b"><div class="b b_m"></div></div>');
		assert.equal(expand('div.b>div._m1>div._m2'), '<div class="b"><div class="b b_m1"><div class="b b_m2"></div></div></div>');
    });

	it('elements', () => {
		assert.equal(expand('div.b>div.-e'), '<div class="b"><div class="b__e"></div></div>');
		assert.equal(expand('div.b>div.-e>div.-e'), '<div class="b"><div class="b__e"><div class="b__e"></div></div></div>');

		// get block name from proper ancestor
		assert.equal(expand('div.b1>div.b2_m1>div.-e1+div.--e2_m2'), '<div class="b1"><div class="b2 b2_m1"><div class="b2__e1"></div><div class="b1__e2 b1__e2_m2"></div></div></div>');
	});
});