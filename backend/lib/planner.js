// Template project planner used when no AI provider is configured (or all fail).
// Picks the closest playbook by keywords and returns ready-to-create task drafts.
const PLAYBOOKS = [
  {
    keys: ['website', 'landing', 'web app', 'webapp', 'frontend', 'redesign', 'homepage', 'ui'],
    tasks: [
      ['Audit current pages and define goals', 'List what works, what does not, and the metrics this work should move.', 'High', 2, ['research'], ['Analytics review', 'Stakeholder goals'], 2],
      ['Design wireframes and high-fidelity mockups', 'Mobile and desktop layouts for every key view.', 'High', 5, ['design'], ['Wireframes', 'Visual design', 'Design review'], 5],
      ['Set up repository, CI and preview deploys', 'Framework, linting, CI checks and a preview URL per pull request.', 'Medium', 3, ['setup'], [], 4],
      ['Build responsive layout and navigation', 'Header, footer, mobile drawer and shared layout components.', 'Medium', 5, ['frontend'], ['Desktop nav', 'Mobile drawer'], 8],
      ['Write and review page copy', 'Headlines, body copy and calls to action for each page.', 'Medium', 2, ['content'], [], 7],
      ['Accessibility and performance pass', 'Lighthouse, keyboard navigation, contrast and image weights.', 'Medium', 3, ['qa'], ['Lighthouse > 90', 'Keyboard nav'], 11],
      ['Launch checklist and go-live', 'Redirects, analytics, SEO meta and a rollback plan.', 'High', 2, ['launch'], ['Redirects', 'Analytics', 'Rollback plan'], 13]
    ]
  },
  {
    keys: ['mobile', 'ios', 'android', 'app store', 'react native', 'flutter'],
    tasks: [
      ['Define MVP scope and user stories', 'Agree the smallest feature set worth shipping.', 'High', 2, ['planning'], ['User stories', 'Out of scope list'], 2],
      ['Design core screens', 'Onboarding, home, detail and settings flows.', 'High', 5, ['design'], ['Onboarding', 'Home', 'Settings'], 6],
      ['Set up app project and CI builds', 'Signing, environments and automated builds.', 'Medium', 3, ['setup'], [], 5],
      ['Implement authentication', 'Sign up, sign in, password reset and session handling.', 'High', 5, ['backend', 'auth'], [], 10],
      ['Build core feature screens', 'Implement the MVP screens against the API.', 'High', 8, ['frontend'], [], 14],
      ['Beta test with internal users', 'TestFlight / internal track and a feedback form.', 'Medium', 3, ['qa'], ['Recruit testers', 'Collect feedback'], 17],
      ['Store listing and release', 'Screenshots, description, privacy labels and submission.', 'Medium', 2, ['launch'], [], 20]
    ]
  },
  {
    keys: ['marketing', 'campaign', 'launch', 'social', 'newsletter', 'promo', 'growth'],
    tasks: [
      ['Define audience and campaign goal', 'Personas, channels and the one metric that defines success.', 'High', 2, ['strategy'], ['Personas', 'Success metric'], 2],
      ['Draft messaging and key visuals', 'Positioning, headline options and hero visuals.', 'High', 3, ['content', 'design'], [], 5],
      ['Write email sequence', 'Announcement, value and last-call emails.', 'Medium', 3, ['email'], ['Announcement', 'Value email', 'Last call'], 7],
      ['Create social media assets', 'Posts and visuals for each channel.', 'Medium', 3, ['social'], [], 8],
      ['Set up tracking and UTM links', 'Dashboards so results are measurable from day one.', 'Medium', 1, ['analytics'], [], 6],
      ['Launch day run-sheet', 'Hour-by-hour plan, owners and response templates.', 'High', 2, ['launch'], [], 10],
      ['Post-campaign report', 'What worked, what did not, numbers vs goal.', 'Low', 2, ['analytics'], [], 17]
    ]
  },
  {
    keys: ['api', 'backend', 'database', 'server', 'migration', 'integration', 'service'],
    tasks: [
      ['Write technical design doc', 'Data model, endpoints, failure modes and rollout plan.', 'High', 3, ['planning'], ['Data model', 'Endpoints', 'Rollout'], 3],
      ['Create database schema and migrations', 'Tables/collections, indexes and a reversible migration.', 'High', 3, ['database'], [], 5],
      ['Implement endpoints with validation', 'Handlers, input validation and consistent errors.', 'High', 5, ['backend'], [], 9],
      ['Add automated tests', 'Unit and integration tests for the happy path and edge cases.', 'Medium', 3, ['qa'], [], 11],
      ['Observability: logs, metrics, alerts', 'Know when it breaks before users do.', 'Medium', 2, ['ops'], [], 12],
      ['Staged rollout and docs', 'Feature flag, staged release and API documentation.', 'Medium', 2, ['launch', 'docs'], [], 14]
    ]
  },
  {
    keys: ['event', 'meetup', 'conference', 'offsite', 'workshop', 'webinar', 'hackathon'],
    tasks: [
      ['Set goals, budget and date', 'Agree the purpose, headcount and budget ceiling.', 'High', 1, ['planning'], [], 2],
      ['Book venue and vendors', 'Venue, catering, AV and any travel.', 'High', 3, ['logistics'], ['Venue', 'Catering', 'AV'], 7],
      ['Build agenda and confirm speakers', 'Sessions, timings and speaker briefs.', 'Medium', 3, ['content'], [], 10],
      ['Send invitations and track RSVPs', 'Invite list, reminders and dietary needs.', 'Medium', 2, ['comms'], [], 9],
      ['Run-of-show and day-of checklist', 'Who does what, minute by minute.', 'High', 2, ['logistics'], [], 13],
      ['Collect feedback and share recap', 'Survey, photos and a short recap post.', 'Low', 1, ['comms'], [], 16]
    ]
  },
  {
    keys: ['hire', 'hiring', 'recruit', 'interview', 'onboard'],
    tasks: [
      ['Write role description and scorecard', 'Outcomes for the first 90 days and how candidates are assessed.', 'High', 2, ['hiring'], [], 2],
      ['Publish job post and source candidates', 'Job boards, referrals and outreach.', 'High', 3, ['hiring'], [], 5],
      ['Run screening calls', 'Shortlist against the scorecard.', 'Medium', 3, ['hiring'], [], 10],
      ['Run interview loop', 'Structured interviews and a take-home or pairing session.', 'Medium', 5, ['hiring'], [], 15],
      ['Make offer and prepare onboarding', 'Offer, paperwork, accounts and a first-week plan.', 'High', 2, ['onboarding'], ['Offer', 'Accounts', 'First-week plan'], 20]
    ]
  }
];

const GENERIC = [
  ['Kick-off: define scope and success criteria', 'Agree what done looks like and what is out of scope.', 'High', 2, ['planning'], ['Goals', 'Out of scope', 'Owners'], 2],
  ['Research and gather requirements', 'Collect inputs from stakeholders and existing material.', 'High', 3, ['research'], [], 4],
  ['Break work into milestones', 'Milestones with owners and dates.', 'Medium', 1, ['planning'], [], 5],
  ['Execute milestone 1', 'Deliver the first meaningful slice of the work.', 'High', 5, ['delivery'], [], 10],
  ['Review and quality check', 'Peer review against the success criteria.', 'Medium', 2, ['qa'], [], 12],
  ['Wrap-up and retrospective', 'Ship, share results and capture lessons learned.', 'Low', 1, ['retro'], [], 14]
];

function planFromTemplates(prompt) {
  const p = String(prompt || '').toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const book of PLAYBOOKS) {
    // Whole words only: "relaunch" must not count as "launch", "build" must not count as "ui".
    const score = book.keys.reduce((n, k) => n + (new RegExp(`\\b${k}\\b`).test(p) ? 1 : 0), 0);
    if (score > bestScore) {
      best = book;
      bestScore = score;
    }
  }
  const rows = best ? best.tasks : GENERIC;
  return rows.map(([title, description, priority, estimate, tags, subtasks, dueInDays]) => ({
    title, description, priority, estimate, tags, subtasks, dueInDays
  }));
}

function sanitisePlan(raw) {
  const list = Array.isArray(raw?.tasks) ? raw.tasks : Array.isArray(raw) ? raw : [];
  return list.slice(0, 10).map((t) => ({
    title: String(t?.title || '').trim().slice(0, 120),
    description: String(t?.description || t?.title || '').trim().slice(0, 600),
    priority: ['Low', 'Medium', 'High'].includes(t?.priority) ? t.priority : 'Medium',
    estimate: Math.max(0, Math.min(21, parseInt(t?.estimate, 10) || 0)),
    tags: Array.isArray(t?.tags) ? t.tags.filter((x) => typeof x === 'string').slice(0, 4) : [],
    subtasks: Array.isArray(t?.subtasks) ? t.subtasks.filter((x) => typeof x === 'string').slice(0, 6).map((s) => s.slice(0, 120)) : [],
    dueInDays: parseInt(t?.dueInDays, 10) > 0 ? Math.min(180, parseInt(t.dueInDays, 10)) : 7
  })).filter((t) => t.title);
}

module.exports = { planFromTemplates, sanitisePlan };
