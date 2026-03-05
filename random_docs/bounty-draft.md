HN title: I vibecoded a 91k SLOC OSS tool - $1k bounty if you find ugly engineering in it

Twitter: Introducing Desloppify v.0.9! I'm convinced that this will make vibe code beautifully engineered. So, I'll put my money where my mouth is. If you can find something poorly engineered in its 91k+ lines of code, you get $1000. Details in Github issue. LLM judges. You have 48 hrs.

---

# $1,000 to the first person who finds something poorly engineered in this ~91k LOC vibe-coded codebase

Desloppify is an agent hardness to make vibe code as good as possible. I didn't write any of the ~91k lines of code in this repo and I barely understand most of it - but I believe the proof should be in the pudding.

This is a reasonably complex agent orchestration codebase made by a non-professional software engineer. There's bound to be a lot of poorly engineered stuff in here, right? This should be the easiest money ever!

## How the bounty works

- **Deadline:** Friday, March 6, 2026 at 4:00 PM UTC
- **Codebase snapshot:** Judging is based on [this commit](https://github.com/peteromallet/desloppify/tree/656240da4fd730c0e6947fb8a0e52ee0dfabaafa). Anything changed after this commit doesn't count.
- **To enter:** Comment below with a description of what you found and why it's poorly engineered. Keep it under 300 words w/ references.
- **What counts:** We're looking for things that are 'poorly engineered' — poor engineering decisions, sloppy implementations, poor abstractions. A structural decision that makes things meaningfully hard to maintain, extend, or understand. Bugs count, but they're not the primary focus - it's more about the technical decisions. Code style preferences don't count. Issues must focus on the current state of the codebase, not on previous changes or the development process itself — that part is a work in progress of my tool.
- **Judging:** "Poorly engineered" is a subjective claim, so it requires a subjective test. Modern LLMs are very good at evaluating questions like this when given tight constraints. I'll feed your description into both Claude Opus 4.6 and ChatGPT Codex 5.3. Both models must agree that it's (a) poorly engineered and (b) at least 'somewhat significant'. If they disagree, it doesn't pass.
- **First valid entry wins** - once someone's submission passes both models, the bounty closes
- **Multiple entries:** You can submit as many entries as you like - but if 3 fail in a row, further ones will be ignored.
- **Spam/low-effort:** Spam or low-quality entries won't go through the full judging process. I'll share the prompt used to filter these too.

I won't release the exact prompts I use for judging in advance - I don't want people gaming the wording. Once the deadline passes, I'll run an agent through all entries live in the thread, replying to each one with the results until we get a winner (or don't). I'll also post the prompts and most likely share my LLM logs.

If no one claims the bounty by the deadline, the $1,000 will roll into a larger bounty with an even higher bar. If no one ever claims any bounty, I'll donate it to the [Arca Gidan Prize](https://arcagidan.com/) — I consider this money gone, so I have no incentive not to reward it.

## Payment

- **Amount:** $1,000 paid out in SOL
- **How:** Provide a Solana wallet address and I'll transfer directly
- **Source:** People made tokens for this project and gave me creator fees. I don't want to profit from this, so I'm putting 100% of those fees toward making the tool better - mostly through bounties to help surface what's not working with it. Gamblers are gonna gamble so might as well put free money to good use.

Everything - the prompts, the judging, the payment - will be public so you can validate it all on the [accountability page](https://pom.voyage/assorted/accountability).
