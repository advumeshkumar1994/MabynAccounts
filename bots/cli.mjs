import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const botNames = ['lead-followup', 'campaign-review', 'content-planner'];

export function runBot(name, data) {
  switch (name) {
    case 'lead-followup': {
      const lead = data.leads?.[0];
      if (!lead) return {status: 'no-data', message: 'No leads supplied'};
      return {
        status: 'draft-only',
        leadId: lead.id,
        consentToContact: lead.consentToContact === true,
        draft: `Hello ${lead.firstName || 'there'}, thanks for your interest in ${lead.interest || 'MABYN'}. Would you like more information?`,
        requiresApproval: true
      };
    }
    case 'campaign-review': {
      const campaign = data.campaigns?.[0];
      if (!campaign) return {status: 'no-data', message: 'No campaigns supplied'};
      const spend = Number(campaign.spend) || 0;
      const conversions = Number(campaign.conversions) || 0;
      return {
        status: 'analysis-only',
        name: campaign.name,
        spend,
        conversions,
        costPerConversion: conversions ? Number((spend / conversions).toFixed(2)) : null,
        recommendation: conversions ? 'Review conversion quality before increasing budget' : 'Investigate tracking and creative relevance before spending more',
        requiresApproval: true
      };
    }
    case 'content-planner': {
      const story = data.stories?.[0];
      if (!story) return {status: 'no-data', message: 'No stories supplied'};
      return {
        status: 'draft-only',
        plan: [
          `Day 1: Introduce ${story.title} with a short teaser`,
          `Day 2: Share a behind-the-scenes post about ${story.genre}`,
          'Day 3: Ask followers to vote on the next episode theme'
        ],
        requiresApproval: true
      };
    }
    default:
      throw new Error(`Unknown bot: ${name}`);
  }
}

async function main() {
  const [action, name] = process.argv.slice(2);
  if (action === 'list') {
    console.log(botNames.join('\n'));
    return;
  }
  if (action !== 'run' || !botNames.includes(name)) {
    console.error('Usage: node bots/cli.mjs list | run <bot-name>');
    process.exitCode = 1;
    return;
  }
  const dir = dirname(fileURLToPath(import.meta.url));
  const data = JSON.parse(await readFile(join(dir, 'sample-data.json'), 'utf8'));
  console.log(JSON.stringify(runBot(name, data), null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.cwd(), process.argv[1]).replace(/\\/g, '/')) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
