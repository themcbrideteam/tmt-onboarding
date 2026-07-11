// Resource library — static seed (versioned in git). Admin-added items live in
// the library_items table and are merged in at render time.
export type LibraryEntry = {
  id: string;
  type: "doc" | "link" | "video" | "book";
  title: string;
  desc: string;
  tags: string[];
  url?: string;
  body?: string; // trusted HTML authored in this repo
};

export const LIBRARY_SEED: LibraryEntry[] = [
  {
    id: "lib-scripts", type: "doc", title: "Script Booklet — Golden Text, ALM & LPMAMA", tags: ["Scripts", "Leads", "Zillow"],
    desc: "The team's core conversion scripts: the Zillow Golden Text, ten micro-scripts, the ALM and LPMAMA frameworks, and five roleplay warm-up drills.",
    body: `<h4>Zillow Golden Text</h4><blockquote>“Hey [BUYER], this is [AGENT] with The McBride Team. Zillow sent me your tour on [ADDRESS] on [DAY] at [TIME]. Does that time still work best?”</blockquote>
<h4>Micro-scripts</h4><ul>
<li><b>No answer — voicemail:</b> “Zillow asked me to follow up about your request. I'll text you now — reply whenever is easiest!”</li>
<li><b>Texts instead of calling:</b> “No problem! I can help here. Zillow sent me your request — when would you like to go see it?”</li>
<li><b>Driving / busy:</b> “Totally fine — I'll keep it quick. What time works best to see it?”</li>
<li><b>“Who is this?”:</b> “Zillow connected us — I'm the local agent assigned. What caught your eye about the home?”</li>
<li><b>Seen homes already:</b> “Which home has been closest to what you're looking for?”</li>
<li><b>Talking to several agents:</b> “Totally normal. What do you want the RIGHT agent to do for you today?”</li>
<li><b>Wants only price:</b> “Pulling it up — what stood out about the home?”</li>
<li><b>Financing concern:</b> “Totally get it — most buyers do. Would you like a quick, no-pressure payment breakdown?”</li>
<li><b>Wants to see immediately:</b> “Great news — I can make that happen. What's the earliest you can be there?”</li></ul>
<h4>ALM — Appointment · Location · Motivation</h4>
<p><b>A — Appointment.</b> Always ask and set. Confirm address and time, confirm contact info, and get backup times.</p>
<p><b>L — Location.</b> “As your Zillow agent I can show you any properties in the area — are there other homes or neighborhoods you're interested in?” Offer comparable homes. Get the best email.</p>
<p><b>M — Motivation.</b> Only if they're chatty: how long they've been looking, what started the search, when they hope to be in.</p>
<h4>Key rules</h4><ul>
<li>Your goal is an appointment — financing comes later.</li>
<li>Don't pitch being their agent early; it turns people off.</li>
<li>Never ask “do you have an agent” — it triggers a defensive yes.</li>
<li>Say “Seller,” never “Listing Agent.”</li>
<li>Smile, laugh, be fun. Buyers are buying an experience.</li></ul>
<h4>LPMAMA</h4>
<p>Location → Price → Motivation → Agent (optional) → Mortgage → Appointment. Full question banks live in the source booklet.</p>
<h4>Warm-up drills</h4><ul>
<li><b>20-second appointment set:</b> Golden Text only, appointment set in under 20 seconds. 5 rounds, switch partners.</li>
<li><b>Objection snap:</b> coach calls an objection, agent answers in 3 seconds.</li>
<li><b>ALM drill:</b> any scenario, ALM in order. Failure = restart.</li>
<li><b>EWTS call-and-response:</b> “We're not ready yet” → “What would make you feel ready?”</li></ul>`,
  },
  {
    id: "lib-zhl", type: "doc", title: "Zillow Home Loans — Lender Directory", tags: ["Zillow", "Lenders"],
    desc: "Direct lines for all 15 ZHL loan officers. You call two of these during the Certification Sprint (Day 5).",
    url: "/agent/lenders",
    body: `<p>The live directory (tap-to-call) is at <a href="/agent/lenders">/agent/lenders</a>. Build a personal relationship with at least two, then submit their names on your checklist.</p>`,
  },
  {
    id: "lib-standards", type: "doc", title: "Team Performance Standards & Accountability Policy", tags: ["Policy", "Zillow", "FUB"],
    desc: "The floor, not the ceiling: Zillow Preferred metrics, CRM non-negotiables, attendance, and the 12-closing minimum.",
    body: `<h4>Zillow Preferred standards (rolling, reviewed monthly)</h4>
<table><tr><th>Metric</th><th>Standard</th></tr>
<tr><td>Call answer rate</td><td>80%</td></tr><tr><td>Appointment set rate</td><td>70%</td></tr>
<tr><td>Met with</td><td>45%</td></tr><tr><td>Show rate</td><td>30%</td></tr>
<tr><td>Offer rate</td><td>15%</td></tr><tr><td>Conversion rate</td><td>10%+</td></tr>
<tr><td>ZHL pre-approval rate</td><td>10%</td></tr></table>
<h4>CRM accountability</h4>
<blockquote>Follow Up Boss is the system of record. If it is not in FUB, it did not happen.</blockquote>
<ul><li>Manage FUB every business day — no rolling 24-hour blackouts.</li>
<li>Clear all assigned Smart Lists by end of day, every day.</li>
<li>Document every client communication; update lead stage immediately.</li></ul>
<h4>Attendance & production</h4>
<ul><li>All 1:1s and the weekly team meeting are expected; 5 unexcused meeting absences in 12 months triggers a formal review.</li>
<li>Minimum production: <b>12 closed transactions per calendar year</b> on team-provided business.</li>
<li>Reviews escalate: 1-week lead pause + skills assessment → 30-day pause + 2 shadow tours → removal from Zillow Preferred.</li></ul>
<p>You sign this policy during Pre-Flight — it renders and e-signs right in the app.</p>`,
  },
  {
    id: "lib-about", type: "doc", title: "About The McBride Team — Story & Core Values", tags: ["Culture", "Onboarding"],
    desc: "Where the team came from, where it's going (1,000 transactions by 2030), and the five values you'll hear on Day 1.",
    body: `<h4>The short version</h4>
<p>Started in 2019 at a kitchen table with Noah's grandfather — a 50-year real estate veteran. Noah closed 25 homes his first full year, 45 the second, 75 the third, and bought the brokerage exactly three years to the day after getting licensed. In 2025 the focus sharpened: Zillow Preferred partnership, back into production, and building the most dominant team in the CSRA.</p>
<h4>Core values</h4>
<ul><li><b>Relentless Growth</b> — we don't coast. Ever.</li>
<li><b>Excellence in Execution</b> — the plan only matters if it gets done right.</li>
<li><b>Ownership & Accountability</b> — we answer for our work, our wins, and our misses.</li>
<li><b>Innovation & Adaptability</b> — the market changes. So do we.</li>
<li><b>Legacy Through Service</b> — we're building something that outlasts us, one client at a time.</li></ul>
<h4>The goal</h4>
<p>Not a top team in the CSRA. Number one — not close, not contested. 1,000 transactions per year by 2030.</p>
<blockquote>Guiding you home.</blockquote>`,
  },
  {
    id: "lib-zlinks", type: "doc", title: "Zillow Preferred Onboarding — Link Directory", tags: ["Zillow", "Setup"],
    desc: "Every link for Zillow Preferred onboarding in one place: team invite, learning plan, agreement, Premier Agent app, and the Ylopo form.",
    body: `<h4>Zillow Preferred</h4><ul>
<li><a href="https://www.zillow.com/onboarding/flex/team-lead/landing" target="_blank" rel="noopener">Flex team invite ↗</a></li>
<li><a href="https://academy.zillowgroup.com/learn/learning-plans/439/zillow-preferred-onboarding-learning-plan?generated_by=190880&hash=22ff444808bc8a71daf44de54cc7b4ea730ca4cd" target="_blank" rel="noopener">Mandatory 4-unit onboarding learning plan ↗</a></li>
<li><a href="https://www.zillow.com/pbflex/agent" target="_blank" rel="noopener">Preferred Agent Agreement ↗</a></li>
<li><a href="https://academy.zillowgroup.com/learn/courses/850/zillow-premier-agent-connections-support-services" target="_blank" rel="noopener">Premier Agent app course ↗</a></li></ul>
<h4>Website</h4><ul>
<li><a href="https://ylopo.formstack.com/forms/agent_profile_page_questionnaire" target="_blank" rel="noopener">Ylopo agent profile questionnaire ↗</a></li></ul>`,
  },
  { id: "lib-grec", type: "link", title: "GREC Online Services", tags: ["Licensing", "Compliance"], desc: "Georgia Real Estate Commission portal — license transfers, change applications, wall certificates.", url: "https://ata.grec.state.ga.us" },
  { id: "lib-fairhaven", type: "link", title: "NAR Fairhaven — Fair Housing Simulation", tags: ["Compliance", "Training"], desc: "Required pre-start: the fair housing simulation plus NAR Code of Ethics training.", url: "https://fairhaven.realtor" },
  {
    id: "lib-ewts", type: "book", title: "Exactly What to Say — Phil M. Jones", tags: ["Book", "Scripts"],
    desc: "Chapters 1–8 are pre-start reading. Three phrases get role-played in every weekly 1:1.",
    body: `<h4>The eight magic-word frameworks</h4>
<ul><li><b>Ch. 1</b> — “I'm not sure if it's for you, but…”</li><li><b>Ch. 2</b> — “How open-minded are you?”</li>
<li><b>Ch. 3</b> — “What do you know?”</li><li><b>Ch. 4</b> — “How would you feel?”</li>
<li><b>Ch. 5</b> — “Just imagine…”</li><li><b>Ch. 6</b> — “When would be a good time?”</li>
<li><b>Ch. 7</b> — “I'm guessing you haven't got around to…”</li><li><b>Ch. 8</b> — Simple swaps</li></ul>
<h4>Call-and-response practice</h4>
<blockquote>“We're not ready yet.” → “What would make you feel ready?”</blockquote>
<blockquote>“We're waiting for the market to cool.” → “What do you think cooling looks like for you?”</blockquote>
<blockquote>“We're just looking.” → “Totally — while you're looking, what homes have stood out so far?”</blockquote>`,
  },
  // ---- Training videos (Looms) ----
  { id: "lib-v-welcome", type: "video", title: "Welcome to The McBride Team — Fast Track", tags: ["Videos", "Day 1", "Culture"], desc: "Start here. The fast-track welcome to the team — watch before anything else on Day 1.", url: "https://www.loom.com/share/3bc97297c79342cd988947af80ae6d63" },
  { id: "lib-v-vision", type: "video", title: "Vision for The McBride Team", tags: ["Videos", "Culture"], desc: "Where the team is going and why — the 1,000-transaction 2030 target and what it means for you.", url: "https://www.loom.com/share/080af4b88f6345138d8df3a55e814607" },
  { id: "lib-v-values", type: "video", title: "Core Values for The McBride Team", tags: ["Videos", "Day 1", "Culture"], desc: "Relentless Growth · Ownership & Accountability · Innovation & Adaptability · Excellence in Execution · Legacy Through Service.", url: "https://www.loom.com/share/3a988f376a0f45e1ac4d92e63ae7ee9a" },
  { id: "lib-v-roles", type: "video", title: "Team Roles & Responsibilities", tags: ["Videos", "Day 1"], desc: "Who does what on the team and how to reach them.", url: "https://www.loom.com/share/b1c8e53a87d04ce893b56928f476ce47" },
  { id: "lib-v-stack", type: "video", title: "Overview of the Tech Stack", tags: ["Videos", "Systems"], desc: "The core tools you'll use day to day — CRM, website, and more.", url: "https://www.loom.com/share/df630df8b0c14c598c0bfc4f090dc713" },
  { id: "lib-v-fub101", type: "video", title: "Follow Up Boss 101", tags: ["Videos", "FUB", "Systems"], desc: "Team stages, ponds, conventions — how we use FUB.", url: "https://www.loom.com/share/8a5266a1ea3e462090a291882f800371" },
  { id: "lib-v-fubsetup", type: "video", title: "Setting Up Your Follow Up Boss Account", tags: ["Videos", "FUB"], desc: "Login, profile, notifications, and installing the mobile app.", url: "https://www.loom.com/share/e5cfc1761bca411898dc31b2c9fa99cc" },
  { id: "lib-v-morning", type: "video", title: "The Best Morning Workflow", tags: ["Videos", "FUB", "Leads"], desc: "Smart lists, action plans, logging, tasks — the daily FUB rhythm.", url: "https://www.loom.com/share/8d008261cdc54051aaaea4e886b8ba06" },
  { id: "lib-v-dotloop1", type: "video", title: "Setting Up Your Dotloop Account", tags: ["Videos", "Dotloop"], desc: "Account setup and team expectations in Dotloop.", url: "https://www.loom.com/share/c327fbc4797c43c6bb4aaac6620a006b" },
  { id: "lib-v-dotloop2", type: "video", title: "How to Build an Offer in Dotloop", tags: ["Videos", "Dotloop", "Contracts"], desc: "Loop creation to submission — pairs with your practice offers.", url: "https://www.loom.com/share/c849f1d3ba3b47c8a02bfc8c9b8a8b49" },
  { id: "lib-v-ylopo", type: "video", title: "Intro to Ylopo Stars", tags: ["Videos", "Systems", "Leads"], desc: "Your agent website and Ylopo's lead intelligence.", url: "https://www.loom.com/share/035fea52e7504ee4ad35942e15191741" },
  { id: "lib-v-zmetrics", type: "video", title: "Zillow Metrics Standards", tags: ["Videos", "Zillow"], desc: "Response-time and performance standards for Zillow leads.", url: "https://www.loom.com/share/dd1c966700c54ed28d7666dc12afa7b2" },
  { id: "lib-v-premier", type: "video", title: "Setting Up Your Premier Agent Account", tags: ["Videos", "Zillow"], desc: "Create your Premier Agent account, then confirm it so Noah can add you to the team.", url: "https://www.loom.com/share/81f19e3c7e784116a7cfd97f1f7678b1" },
  { id: "lib-v-contracts", type: "video", title: "Purchase & Sale Agreement — Key Fields", tags: ["Videos", "Contracts"], desc: "The fields that matter in the GAR purchase and sale agreement.", url: "https://www.loom.com/share/bca3845a4f3e4026a719e62d89532894" },
  // ---- Import pending (full docs live in the AIOS knowledge base) ----
  { id: "lib-showing", type: "doc", title: "How to Show a Home — SOP", tags: ["SOP", "Showings"], desc: "The team's showing standard, start to finish. Full import pending — ask Tiffany for the current copy.", body: `<p>Full SOP import pending from the team knowledge base.</p>` },
  { id: "lib-leadplay", type: "doc", title: "Lead Conversion Playbook", tags: ["Leads", "Scripts", "FUB"], desc: "The deep playbook behind the scripts: speed-to-lead, nurture cadences, stage-by-stage conversion standards. Full import pending.", body: `<p>Full playbook import pending from the team knowledge base.</p>` },
  { id: "lib-listing", type: "doc", title: "Listing Presentation Master", tags: ["Listings", "Sellers"], desc: "The standardized 14-slide listing system. Covered in Week 3 training. Full import pending.", body: `<p>Full system import pending from the team knowledge base.</p>` },
];
