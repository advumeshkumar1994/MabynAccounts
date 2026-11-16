import test from 'node:test';
import assert from 'node:assert/strict';
import {botNames, runBot} from './cli.mjs';

test('all starter bots require approval', () => {
  const sample = {
    leads: [{id: '1', firstName: 'Test', interest: 'product', consentToContact: false}],
    campaigns: [{name: 'test', spend: 100, conversions: 2}],
    stories: [{title: 'Demo', genre: 'Drama'}]
  };
  for (const bot of botNames) {
    assert.equal(runBot(bot, sample).requiresApproval, true);
  }
});
test('campaign handles zero conversions safely', () => {
  assert.equal(runBot('campaign-review', {campaigns: [{spend: 200, conversions: 0}]}).costPerConversion, null);
});
test('unknown bot is rejected', () => {
  assert.throws(() => runBot('unknown', {}), /Unknown bot/);
});
