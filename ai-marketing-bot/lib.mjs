import {randomUUID, timingSafeEqual} from 'node:crypto';
export const DAILY_MIN=1000, DAILY_MAX=3000;
export function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length && timingSafeEqual(x,y)}
export function validateDraft(x){
 if(!x||!['meta','google'].includes(x.platform))throw Error('Choose Meta or Google');
 if(typeof x.name!=='string'||x.name.trim().length<3||x.name.length>120)throw Error('Campaign name must be 3–120 characters');
 if(!Number.isInteger(x.dailyBudget)||x.dailyBudget<DAILY_MIN||x.dailyBudget>DAILY_MAX)throw Error('Daily budget must be ₹1,000–₹3,000');
 if(typeof x.copy!=='string'||x.copy.trim().length<5||x.copy.length>2000)throw Error('Ad copy must be 5–2000 characters');
 return {id:randomUUID(),platform:x.platform,name:x.name.trim(),dailyBudget:x.dailyBudget,copy:x.copy.trim(),status:'draft',createdAt:new Date().toISOString()};
}
export function propose(c){if(c.status!=='draft')throw Error('Only drafts can be proposed');return {...c,status:'pending_approval'};}
export function approve(c){if(c.status!=='pending_approval')throw Error('Only pending campaigns can be approved');return {...c,status:'approved_mock',approvedAt:new Date().toISOString()};}
export function reject(c){if(c.status!=='pending_approval')throw Error('Only pending campaigns can be rejected');return {...c,status:'rejected'};}
export function metrics(c){const clicks=c.platform==='meta'?140:95,conversions=c.platform==='meta'?7:5;return {impressions:c.platform==='meta'?8500:5700,clicks,conversions,ctrPercent:Number((clicks/(c.platform==='meta'?8500:5700)*100).toFixed(2)),estimatedCpa:Number((c.dailyBudget/conversions).toFixed(2))};}
