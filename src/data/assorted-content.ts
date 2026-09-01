export interface DirectoryItem {
  href?: string;
  name: string;
  description: string;
  comingSoon?: boolean;
}

export interface CommitmentOutcome {
  variant: 'fulfilled' | 'not-fulfilled';
  title: string;
  text: string;
  href?: string;
  hrefLabel?: string;
}

export interface Commitment {
  id: string;
  title: string;
  status: string;
  dates: string;
  bullets: Array<{ label: string; text: string }>;
  onchain: Array<{ label: string; text: string; href?: string; code?: boolean }>;
  note?: string;
  outcome?: CommitmentOutcome;
}

export interface ProjectEntry {
  date: string;
  ongoing?: boolean;
  parts: Array<ProjectTextPart>;
}

export type ProjectTextPart =
  | string
  | { type: 'link'; label: string; href: string; className?: string }
  | { type: 'hover'; label: string; image: string; plain?: boolean };

export interface ConversationSummary {
  id: string;
  username: string;
  title: string;
  date: string;
}

export interface ConversationMessage {
  speaker: 'me' | 'other';
  name: string;
  handle: string;
  href: string;
  avatar: string;
  text: string;
}

export interface ConversationDetail {
  title: string;
  summaryDate: string;
  context: string;
  participants: [
    { name: string; handle: string; href: string; avatar: string },
    { name: string; handle: string; href: string; avatar: string },
  ];
  messages: ConversationMessage[];
}

export const ASSORTED_DIRECTORY_ITEMS: DirectoryItem[] = [
  {
    href: '/assorted/projects',
    name: 'Projects',
    description: "Things I've built and am building",
  },
  {
    href: '/assorted/recommendations',
    name: 'Recommendations',
    description: "Fine individuals I recommend",
  },
  {
    href: '/assorted/feedback',
    name: 'Feedback',
    description: "I'm going to allow public feedback from anyone on this website",
  },
  {
    href: '/assorted/experiments',
    name: 'Experiments',
    description: 'Testing ideas and assumptions in the open',
  },
  {
    href: '/assorted/accountability',
    name: 'Accountability',
    description: 'Public commitments and follow-through',
  },
  {
    href: '/assorted/crypto-conversations',
    name: 'Crypto conversations',
    description: 'Full transparency on any conversations related to crypto',
  },
  {
    href: '/assorted/mute-list',
    name: 'Mute list',
    description: "People and topics I'm currently ignoring",
  },
];

export const ACCOUNTABILITY_INTRO =
  "Below are commitments I've made. For each, I've included the motivation behind it. My goal is to never change any of these and to stick with them forever. In the rare case of a minor deviation, it will be tightly aligned with the stated motivation and I will explain why here. If anyone finds that I have deviated from them in a way that isn't stated, I promise to retweet their evidence.";

export const ACCOUNTABILITY_COMMITMENTS: Commitment[] = [
  {
    id: 'artcompute',
    title: 'Donate 100% of $ArtCompute fees to the grant wallet to buy open-source compute',
    status: 'In Progress',
    dates: 'Committed: March 13, 2026',
    bullets: [
      {
        label: 'What',
        text: "The degens are at it again - they created an $ArtCompute token and gave me fees. I won't profit from this in any way. 100% of fees go to the grant wallet to pay for open-source compute. I'll post the CA whenever it pays for a shipped project. They also gave my wallet 10% ownership, which I'll lock down and sell via LP very slowly only if it hits >10M MC.",
      },
      {
        label: 'Motivation',
        text: 'Same as always - I refuse to profit from community-created tokens. The fees should go toward something useful for the open-source ecosystem.',
      },
    ],
    onchain: [
      { label: 'ArtCompute CA', text: 'aJyRJZZDTzFk1SoJKMTA9bXstpxv3u3GHK7mqgkpump', code: true },
      {
        label: 'Grant fund wallet',
        text: 'FBXSuVueW9Z1U2RmgmYazAX1GGdzay75AKHD9ijJpszq',
        href: 'https://solscan.io/account/FBXSuVueW9Z1U2RmgmYazAX1GGdzay75AKHD9ijJpszq',
        code: true,
      },
      { label: 'Grants', text: 'artcompute.org/grants', href: 'https://artcompute.org/grants' },
    ],
  },
  {
    id: 'one-crypto',
    title: 'Only ever personally launch one crypto asset - at least until 2031',
    status: 'In Progress',
    dates: 'Committed: March 13, 2026',
    bullets: [
      {
        label: 'What',
        text: 'I will only ever personally launch one crypto asset (TBA) - at least until 2031. Community-created tokens are a different thing - if degens create something and give me fees, I\'ll spend those on the project. But I will not personally create or launch another token.',
      },
      {
        label: 'Motivation',
        text: "Playing with the crypto community is fun and they can fund useful things. But I don't want to become a serial token launcher. One is enough. I'd rather focus on building real things and let the community do their thing around it.",
      },
    ],
    onchain: [{ label: 'CA', text: 'TBA' }],
  },
  {
    id: 'no-memecoins',
    title: 'Only engage with community-created crypto assets that fund something real - and only promote what they actually achieve',
    status: 'In Progress',
    dates: 'Committed: March 6, 2026 • Updated: March 13, 2026',
    bullets: [
      {
        label: 'What',
        text: "Crypto has already paid for a few real projects - random degens creating tokens has directly funded open-source work. That's inherently valuable. If the community creates assets related to what I'm building, and they give me fees and ownership to actually use on the project, I'll spend those fees on furthering whatever the project is actually about. I will never create more than one crypto asset myself ($DESLOPPIFY). I will only ever promote community-created tokens by promoting what they actually result in - shipped projects, grants funded, compute purchased - not the tokens themselves. I will not get involved in nihilistic hype or meaningless speculation. I will mute anyone who tries to promote meaningless crypto projects to me - ideally with an AI agent so I don't have to do it manually.",
      },
      {
        label: 'Motivation',
        text: "I'm choosing to dedicate my life to open-source AI. The crypto ecosystem has funded real work and I don't want to reject that - but I refuse to let it corrupt what I'm doing. The line is simple: if it funds something real, I'll engage with it by spending fees on the project and talking about what it achieves. If it's just noise, I'm out.",
      },
    ],
    onchain: [{ label: 'Twitter', text: '@peterom', href: 'https://x.com/peterom' }],
  },
  {
    id: 'pisscoin-grants',
    title: 'Use $PISSCOIN fees to fund open-source AI compute micro grants and buy $DESLOPPIFY',
    status: 'In Progress',
    dates: 'Committed: March 5, 2026',
    bullets: [
      {
        label: 'What',
        text: 'I received ~45 SOL in creator fees from $PISSCOIN trades. I bought back 5,778,223.76 $PISSCOIN tokens to hold forever and give to my grandkids as a lesson. Of the remaining ~45 SOL, I spent around a quarter (~11 SOL) buying $DESLOPPIFY - a project I actually believe in. The other three quarters (~34 SOL) will go toward starting compute micro grants - small grants to help people in the open-source ecosystem pay for compute on small projects.',
      },
      {
        label: 'Motivation',
        text: "People building in the open-source ecosystem are extremely compute constrained. This coin is obviously bullshit, but I'd rather put the money to good use. So I'm using it to start compute micro grants for open-source developers.",
      },
      {
        label: 'Transparency',
        text: 'All transfers, grantees, and grant amounts will be publicly tracked on the grant website.',
      },
    ],
    onchain: [
      { label: 'PISSCOIN CA', text: '7qdVkvsMEGg1D8H9YCEasNKYxLgfkQDXG2uvys67pump', code: true },
      { label: 'Creator wallet', text: '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu', code: true },
      {
        label: 'Grant fund wallet',
        text: 'FBXSuVueW9Z1U2RmgmYazAX1GGdzay75AKHD9ijJpszq',
        href: 'https://solscan.io/account/FBXSuVueW9Z1U2RmgmYazAX1GGdzay75AKHD9ijJpszq',
        code: true,
      },
      { label: 'Starting balance', text: '34.0001 SOL' },
    ],
    note: 'Conversions as of March 5, 2026.',
  },
  {
    id: 'pisscoin',
    title: 'Hold $PISSCOIN until the day I die',
    status: 'In Progress',
    dates: 'Committed: March 5, 2026',
    bullets: [
      { label: 'What', text: 'I received creator fees from a community-created coin called $PISSCOIN. From these fees, I bought 5,778,223.76 $PISSCOIN tokens.' },
      { label: 'Commitment', text: 'I will never sell these. I will hold $PISSCOIN until the day I die and leave it in my will to my favourite grandchild.' },
      { label: 'Motivation', text: "In the spirit of HODL - I want to follow this token wherever it goes. If it goes to zero, so be it. If it moons, my grandkids will thank me." },
    ],
    onchain: [
      { label: 'PISSCOIN CA', text: '7qdVkvsMEGg1D8H9YCEasNKYxLgfkQDXG2uvys67pump', code: true },
      { label: 'Wallet', text: '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu', code: true },
      { label: 'Holdings', text: '5,778,223.76 tokens' },
    ],
  },
  {
    id: 'pisscoin-silence',
    title: 'Never tweet about $PISSCOIN again until my official death announcement',
    status: 'In Progress',
    dates: 'Committed: March 5, 2026',
    bullets: [
      { label: 'What', text: 'POM will not tweet about $PISSCOIN again until his official death announcement.' },
      { label: 'Motivation', text: "$PISSCOIN was created by someone else based on a joke I made - nothing to do with me personally. But in practice, I have an incentive to hype it since I hold it and receive fees from trades. I'm going to reject that incentive. Though I will hold it until the day I die and give it to my grandkids, I don't want to spend my life promoting a coin called $PISSCOIN. Whatever happens with $PISSCOIN, I hope my grandkids will learn a lesson from this." },
    ],
    onchain: [
      { label: 'PISSCOIN CA', text: '7qdVkvsMEGg1D8H9YCEasNKYxLgfkQDXG2uvys67pump', code: true },
      { label: 'Twitter', text: '@peterom', href: 'https://x.com/peterom' },
    ],
  },
  {
    id: 'desloppify',
    title: 'Donate all $DESLOPPIFY creator fees to code quality bounties',
    status: 'Not Fulfilled',
    dates: 'Committed: March 3, 2026',
    bullets: [
      { label: 'What', text: 'Two community-created $DESLOPPIFY tokens based on my Desloppify project also generate Pump.fun creator fees to the same wallet.' },
      { label: 'Commitment', text: 'Starting at 100% of $DESLOPPIFY fees going to bounties for people who discover issues with code that Desloppify has approved - putting the tool\'s own money where its mouth is. Over time, I may also spend fees on improving or augmenting the Desloppify ecosystem. Aside from getting open source projects paid for, I won\'t personally profit.' },
      { label: 'Motivation', text: 'Desloppify is a project that I really believe can have a huge impact. I want to fund it and help vibe coders build things that are genuinely well-engineered - so all fees go toward bounties that stress-test the tool itself.' },
      { label: 'Current balance', text: "~72 SOL (~28 from $DESLOPPIFY #2, ~44 from $DESLOPPIFY #3) of the wallet's 752 SOL." },
      { label: 'Bounties', text: 'Announced via Desloppify GitHub Issues.' },
    ],
    onchain: [
      { label: 'DESLOPPIFY #2 CA', text: '2XZyVjE6r5p84wL8CqHKFXH2v9iTd21cBRsoPpCJpump', code: true },
      { label: 'DESLOPPIFY #3 CA', text: '6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump', code: true },
      { label: 'Creator wallet', text: '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu', code: true },
      { label: 'Fee mechanism', text: 'Same 0.05% creator fee as $DataClaw, same wallet. Full breakdown in the wallet analysis.', href: 'https://github.com/peteromallet/peteromallet.github.io/blob/main/random_docs/solana-wallet-analysis.md' },
    ],
    note: 'Conversions as of March 2, 2026.',
    outcome: {
      variant: 'not-fulfilled',
      title: 'Not Fulfilled — pivoted to Arnold',
      text: 'I decided not to continue with Desloppify as it was the wrong primitive for building a generalised platform for building pipelines. Fees will instead fund Arnold — a generalised pipeline platform — with receipts shared publicly.',
      href: 'https://github.com/peteromallet/Arnold',
      hrefLabel: 'github.com/peteromallet/Arnold',
    },
  },
  {
    id: 'tokens',
    title: 'Slowly sell gifted $DESLOPPIFY tokens to fund open source AI work',
    status: 'In Progress',
    dates: 'Committed: March 3, 2026',
    bullets: [
      { label: 'What', text: 'People have also sent me tokens from the community-created $DESLOPPIFY, based on my Desloppify project. I didn\'t own any of it, but now I hold 7%.' },
      { label: 'No sell unless', text: "I won't sell any unless the token has stayed above a $10M market cap for more than 7 days." },
      { label: 'When I sell', text: 'Slowly, responsibly, and with pre-announcement. Used to buy LLM tokens, compute, and possibly hardware.' },
      { label: 'Who benefits', text: 'This will fund open source AI development and training. Transparently, this will first fund my AI development, but will be extended to others who work on open source projects if funds allow.' },
      { label: 'Motivation', text: "I'm a big believer in open source. I want to fund the ecosystem without damaging token holders. I'll sell slowly, transparently, and in a way that makes sure the market safely absorbs it." },
      { label: 'Goal', text: 'All data released via DataClaw, all code open source, all work dedicated towards improving the open source ecosystem and tooling.' },
      { label: 'Transparency', text: 'All invoices and token sales will be published. Full ledger in the sales & spending tracker (currently empty).' },
    ],
    onchain: [
      { label: 'Wallet', text: '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu', code: true },
      { label: 'DESLOPPIFY #3 CA', text: '6mjs2797K62H8vXWUkYikdkNiP3zsfmybC9Zq6z4pump', code: true },
      { label: 'DESLOPPIFY #3 held', text: '71,200,000 tokens (~$6,644)' },
    ],
    note: 'Conversions as of March 2, 2026.',
  },
  {
    id: 'dataclaw',
    title: 'Donate all $DataClaw creator fees to The Arca Gidan Art Prize',
    status: 'Fulfilled',
    dates: 'Committed: March 2, 2026',
    bullets: [
      { label: 'What', text: 'I created an open source project called DataClaw. Random crypto people created a token around it.' },
      { label: 'Fees', text: "I didn't own any of this token, but they gave me creator tokens - which earn a 0.05% fee on every trade via Pump.fun." },
      { label: 'Commitment', text: '100% of $DataClaw fees will be donated to The Arca Gidan Art Prize, an art competition run by Banodoco that pushes open-source AI models to their limits.' },
      { label: 'Motivation', text: "I woke up one morning to find that I had accumulated a bunch of fees for a project that isn't a top priority for me. Rather than pocket it, I'm directing it all to an art competition that pushes open-source AI models to their limits." },
      { label: 'Current balance', text: "~752 SOL (~680 from $DataClaw, ~72 from $DESLOPPIFY tokens) across 126 fee claims." },
    ],
    onchain: [
      { label: 'DataClaw CA', text: 'Duxeg8HrG89Dq95oyiydrnFd8irZhjApGZu8PYrEpump', code: true },
      { label: 'Creator wallet', text: '3xDeFXgK1nikzqdQUp2WdofbvqziteUoZf6MdX8CvgDu', code: true },
      { label: 'Fee mechanism', text: '0.05% creator fee on every PumpSwap trade, auto-claimed to the wallet above. Full breakdown in the wallet analysis.', href: 'https://github.com/peteromallet/peteromallet.github.io/blob/main/random_docs/solana-wallet-analysis.md' },
    ],
    note: 'Conversions as of March 2, 2026.',
    outcome: {
      variant: 'fulfilled',
      title: 'Fulfilled — all funds paid out',
      text: 'All funds were paid out to Arca Gidan winners.',
      href: 'https://arcagidan.com/retrospective',
      hrefLabel: 'arcagidan.com/retrospective',
    },
  },
];

export const CRYPTO_CONVERSATIONS_INTRO =
  "I believe that back rooms are the seed of corruption, and I'd rather not get corrupted. So I'm going to share any conversations I have related to any crypto token that I'm involved in publicly here. Mostly, I hope, with nice friendly people who have no desire for corruption!";

export const CRYPTO_CONVERSATIONS: ConversationSummary[] = [
  {
    id: 'quanatee',
    username: '@quanatee',
    title: 'Quanatee explains liquidity pools & LP positions',
    date: 'March 2-3, 2026',
  },
];

export const MUTE_LIST_INTRO =
  "People and topics I'm currently muting or ignoring. Nothing personal - just managing attention.";
export const MUTE_LIST_NOTE =
  'A lot of these have been done automatically by AI. Please DM me if you want to be removed - I will remove anyone, no questions asked. I\'m going to automate this soon.';

export const PROJECTS: ProjectEntry[] = [
  {
    date: 'Mar 2026-now',
    ongoing: true,
    parts: [
      'Claude is very good for high-level thinking and strategy, while GPT is extremely good for detail-oriented execution. To combine both their strengths, I built ',
      { type: 'link', label: 'Megaplan', href: 'https://github.com/peteromallet/megaplan', className: 'project-link' },
      " to allow them to create better plans together than either can individually. It works as a loop until both are satisfied that the plan is extremely robust — which I think correlates with being generally much better in reality.",
    ],
  },
  {
    date: 'Feb 2026-now',
    ongoing: true,
    parts: [
      'I want to release every bit of data I produce for AIs to train on. As a start, I built ',
      { type: 'link', label: 'dataclaw', href: 'https://github.com/peteromallet/dataclaw', className: 'project-link' },
      ' to export AI coding conversations to HuggingFace.',
    ],
  },
  {
    date: 'Feb 2026-now',
    ongoing: true,
    parts: [
      'I was concerned the code I was writing was a bit shit, so I built an open source agent harness called ',
      { type: 'link', label: 'desloppify', href: 'https://github.com/peteromallet/desloppify', className: 'project-link' },
      " that hunts down bad software engineering in all its forms. Gives your codebase a health score you can't game.",
    ],
  },
  {
    date: 'Jan 2026-now',
    ongoing: true,
    parts: [
      "I've become too agent-brained to use interfaces that abstract away code, so I built ",
      { type: 'link', label: 'VibeComfy', href: 'https://github.com/peteromallet/VibeComfy', className: 'project-link' },
      ' to bridge Claude Code and ComfyUI via MCP. You talk, Claude manipulates the workflow.',
    ],
  },
  {
    date: 'Nov 2025-now',
    ongoing: true,
    parts: [
      "I'm building ",
      { type: 'link', label: 'Reigh', href: 'https://reigh.art/', className: 'project-link' },
      ' - an art tool that unleashes the technical potential of the open source AI art space. Naturally, it\'s ',
      { type: 'link', label: 'open source', href: 'https://github.com/banodoco/reigh', className: 'project-link' },
      '.',
    ],
  },
  {
    date: 'Nov 2025-now',
    ongoing: true,
    parts: [
      'Banodoco runs ',
      { type: 'link', label: 'The Arca Gidan Prize', href: 'https://arcagidan.com/', className: 'project-link' },
      ' - an art competition pushing open-source AI models to their limits.',
    ],
  },
  {
    date: '2025-now',
    ongoing: true,
    parts: [
      'I believe providing reference images is the best way to control image generation, so I\'m training the InX series - LoRAs for various image editing models. So far: ',
      { type: 'link', label: 'Flux-Kontext-InScene', href: 'https://huggingface.co/peteromallet/Flux-Kontext-InScene', className: 'project-link' },
      ' for ',
      { type: 'hover', label: 'scene-consistent variations', image: '/assets/projects/flux-kontext-inscene.png' },
      ', and QwenEdit LoRAs for surgical editing - ',
      { type: 'hover', label: 'preserving the scene', image: '/assets/projects/qwen-inscene.png' },
      ', the subject, or ',
      { type: 'hover', label: 'transferring the style', image: '/assets/projects/qwen-instyle.png' },
      '. Trained on curated datasets that I\'ll all release publicly, including ~4,000 ',
      { type: 'link', label: 'Midjourney style references', href: 'https://huggingface.co/datasets/peteromallet/high-quality-midjouney-srefs', className: 'project-link' },
      '.',
    ],
  },
  {
    date: '2024',
    parts: [
      'I built ',
      { type: 'link', label: 'Dough', href: 'https://github.com/banodoco/Dough', className: 'project-link' },
      ' to bring the AnimateDiff ecosystem to artists. I believe the direction was right but it was early and the execution was sloppy. People still made ',
      { type: 'link', label: 'beautiful work', href: '/posts/5-artworks-from-dough', className: 'project-link' },
      ' with it.',
    ],
  },
  {
    date: '2023-now',
    ongoing: true,
    parts: [
      'I like to train Motion LoRAs to get video models to do interesting things. For AnimateDiff, I trained ',
      { type: 'link', label: 'WAS26', href: 'https://huggingface.co/peteromallet/ad_motion_loras/tree/main', className: 'project-link' },
      ' (community art), ',
      { type: 'link', label: 'Smoooth', href: 'https://huggingface.co/peteromallet/ad_motion_loras/tree/main', className: 'project-link' },
      ' (smooth motion), ',
      { type: 'link', label: 'LiquidAF', href: 'https://huggingface.co/peteromallet/ad_motion_loras/tree/main', className: 'project-link' },
      ' (liquid sims), and others. For Wan, I trained ',
      { type: 'link', label: 'There Will Be Bloom', href: 'https://huggingface.co/peteromallet/There_Will_Be_Bloom', className: 'project-link' },
      ' - ',
      { type: 'hover', label: 'timelapse growth videos', image: '/assets/projects/there-will-be-bloom.gif' },
      '.',
    ],
  },
  {
    date: 'Nov 2023',
    parts: [
      'I believe ',
      { type: 'link', label: 'Steerable Motion', href: 'https://github.com/banodoco/Steerable-Motion', className: 'project-link' },
      ' was the first streamlined method for controlling video models using key frames. Evolved from Creative Interpolation. People used it for festival visuals, which was surreal.',
    ],
  },
  {
    date: '2023',
    parts: [
      'I believe the image version of ',
      { type: 'link', label: 'Steerable Motion', href: 'https://huggingface.co/peteromallet/steerable-motion', className: 'project-link' },
      ' was the first approach for creating key frames from a single image. Fine-tuned SD 1.5 on motion data, built on InstructPix2Pix. Magnetron collected the data for it.',
    ],
  },
  {
    date: 'Aug 2023',
    parts: [
      'I built ',
      { type: 'link', label: 'Magnetron', href: 'https://github.com/peteromallet/magnetron', className: 'project-link' },
      ' to collect precisely-tagged motion data for training video models. It ran as a Discord bot.',
    ],
  },
  {
    date: '2023-now',
    ongoing: true,
    parts: [
      'Together with my wife Hannah, I run ',
      { type: 'link', label: 'ADOS', href: 'https://ados.events/', className: 'project-link' },
      ' - a real-world gathering for people who are passionate about open source AI.',
    ],
  },
  {
    date: '2022-now',
    ongoing: true,
    parts: [
      'I started ',
      { type: 'link', label: 'Banodoco', href: 'https://banodoco.ai', className: 'project-link' },
      ' as a parent organisation for open source AI art. This is what I wanted to do with my life, so I figured I might as well make it official. I also just like the name.',
    ],
  },
  {
    date: '2022-ongoing',
    ongoing: true,
    parts: [
      'Knowing how little I knew about AI, I started the ',
      { type: 'link', label: 'Banodoco Discord', href: 'https://discord.gg/acg8aNBTxd', className: 'project-link' },
      ' as a space for people to learn together.',
    ],
  },
  {
    date: '2022',
    parts: ['The first art tool I made was the Banodoco Tool. It also very much went nowhere.'],
  },
  {
    date: '2018-2023',
    parts: [
      'I spent five years building ',
      { type: 'link', label: 'Advisable', href: 'https://github.com/peteromallet/Advisable', className: 'project-link' },
      ' - a misguided startup that ultimately went nowhere, wasting millions of investor dollars along the way. Though it wasn\'t all bad - I learned a lot, got to work with some great people, and open-sourced the 9,321-commit codebase for AIs to learn from.',
    ],
  },
  {
    date: '2012-2019',
    parts: ['I worked for various startups, a few of which were reasonably successful.'],
  },
];

export const CONVERSATION_DETAILS: Record<string, ConversationDetail> = {
  quanatee: {
    title: 'Quanatee explains liquidity pools & LP positions',
    summaryDate: 'March 2-3, 2026',
    context:
      "Quanatee reached out to explain how single-sided liquidity pool positions work for the $DESLOP token. This conversation has been shared with Quanatee's knowledge and consent. A screenshot from Quanatee's initial outreach has been omitted at their request.",
    participants: [
      {
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
      },
      {
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
      },
    ],
    messages: [
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Hey POM, i wanted to give you a simple brief of what a single sided LP position looks like. Its idea because you can provide the tokens to the LP without having to front USDC or SOL. The only difference is that you only earn fees from the upside of the token. This is a good trade-off for not having to provide "cash" and aligns with token value.',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: '[Screenshot omitted at Quanatee\'s request]',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: "Happy to chat here if you're happy for me to screenshot share it all",
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'Or for it to be all shared on my website is probably better',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'lol this is not so serious',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'do you know anything about LP, AMM?',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'I know nothing',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'but in general, the path to corruption is backroom so I wwant to eliminate the possibility of that',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'So am going to want everything public i do in crypto as a rule',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'you dont know how green flag that is',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Alright, i know where to start. So in traditional stock markets, you have an order book, bid/ask spread and limit orders?',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Crypto didnt start with ANY of that, so we invented this thing called an Automated Market Maker (AMM) which replicates somewhat what a traditional market maker would do in the stock market',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'If i bought 5 deslop using sol, i bought from a liquidity pool that has deslop/sol. The pool manages liquidity so there is enough across the price range.',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'who owns the liquidity pool?',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Launchpads like pump.fun launch decentralized liquidity pools that are immutable once launched, so some of the risk vectors are mitigated.',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'There are 2 types of liquidity pools, standard and concentrated. Standard LPs use both tokens in the pair. Concentrated LPs let you choose a price range and can enable single-sided liquidity.',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Providing liquidity is kind of like selling your tokens plus earning a fee, but if the price comes back down you can become a buyer again.',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: "Crypto people are 80% idiots. When they see dev selling, they panic. Which is why I hope you'll consider liquidity provisioning instead of direct sales.",
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: "That makes sense! And if you were completely transparent about what's happening, would it not in effect be the same as the graph?",
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'The psychological impact is important, and providing liquidity is itself a net positive because crypto is such an illiquid market.',
      },
      {
        speaker: 'me',
        name: "Peter O'Malley",
        handle: '@peterom',
        href: 'https://x.com/peterom',
        avatar: 'P',
        text: 'Thank you so much for the explanation! Think will almost certainly do this.',
      },
      {
        speaker: 'other',
        name: 'Quanatee',
        handle: '@quanatee',
        href: 'https://x.com/quanatee',
        avatar: 'Q',
        text: 'Happy to have helped! Standard LP can also be called Balanced AMM or DAMM. Concentrated LP can also be called Single Sided, CLMM, or DLMM.',
      },
    ],
  },
};
