import test from 'node:test';import assert from 'node:assert/strict';import {validateDraft,propose,approve,reject,metrics} from './lib.mjs';
const sample={platform:'meta',name:'Cosmetics launch',dailyBudget:1500,copy:'Premium skincare for India'};
test('draft requires approval',()=>{const c=validateDraft(sample);assert.equal(c.status,'draft');assert.throws(()=>approve(c));assert.equal(approve(propose(c)).status,'approved_mock');assert.equal(reject(propose(c)).status,'rejected');});
test('budget boundaries enforced',()=>{for(const budget of [999,3001,1500.5])assert.throws(()=>validateDraft({...sample,dailyBudget:budget}));});
test('only supported platforms',()=>assert.throws(()=>validateDraft({...sample,platform:'other'})));
test('metrics are explicitly demonstration estimates',()=>assert.ok(metrics(validateDraft(sample)).estimatedCpa>0));
