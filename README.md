# Scriptbreaker

**Scams follow a script. Scriptbreaker reads ahead.**

Scriptbreaker listens to a phone call (or reads a chat), works out which known scam script the caller is following, **predicts what they will ask for next before they say it**, and gives you a line that breaks the script.

**Live demo:** https://scriptbreaker-iota.vercel.app (no login; press *Play call*)
**Demo video:** 
**Track:** ForgeHacks 2026, AI + Cybersecurity

![Scriptbreaker predicting the next demand of a fake bank call](docs/screenshot.png)

---

## The problem

Impersonation scams are the most reported fraud in the US. In 2025 people reported losing **$3.5 billion** to imposters, and **$16 billion** to fraud overall, a record ([FTC](https://www.ftc.gov/node/333221)). The costliest ones start with a call from "your bank" saying your money is in danger. Voice cloning now lets a scammer sound like your grandson, so "I'd recognise the voice" no longer protects anyone ([FBI advice via TRM Labs](https://www.trmlabs.com/resources/blog/how-deepfakes-are-used-to-commit-crimes-and-how-to-spot-them)).

These calls are not improvised. They follow the same steps every time: claim authority, invent a problem, isolate you, rush you, take the money. By the time the money is asked for, the victim already trusts the caller.

## Existing approaches

| Approach | Examples | What it does | What it misses |
| --- | --- | --- | --- |
| Paste-and-check chatbots | Bitdefender Scamio, Norton Genie, McAfee Scam Detector | Verdict on one message, link or screenshot | You must already be suspicious; one snapshot, no sense of where the con is going |
| On-device call alerts | Google Pixel Scam Detection | Warns during a call | Pixel only; a yes/no warning, no explanation, no next step |
| Hackathon projects | Many "upload / paste, get a scam score" apps | Classify content | Same snapshot verdict |
| Advice | Family safe word, call-back rule | Out-of-band verification | People forget it under pressure |

## Our innovation

Every tool above asks **"is this a scam?"**. Scriptbreaker asks **"what happens next, and what do I do about it?"**

1. **It predicts the next move.** Each scam is modelled as an ordered script (a "crime script"). As the call unfolds, Scriptbreaker places it on the script and shows the next demand *before it is spoken*. When the caller then says it, the line is stamped **"Called it"**. A prediction that comes true is far more convincing to a frightened person than any score.
2. **It turns you into the verifier.** At each step it gives you one sentence that a real organisation will accept and a scammer cannot ("I'll hang up and call the number on my card"). Then it **judges the caller's reaction**: pushing back raises the alarm, a calm "of course" lowers it.
3. **It is hands-free.** In live mode you press Start once. The AI works out who is speaking from the words, and a single red bar appears only when the call clearly matches a scam.

## How it works

```mermaid
flowchart LR
  A[Call on speaker\nor pasted chat] --> B[Speech to text\nbrowser Web Speech API]
  B --> C[AI tagger\nopen model via Groq]
  C -->|tactics, stage ids,\nwho spoke| D[Playbook engine\nplain TypeScript]
  P[(3 scam playbooks\nordered stages)] --> D
  D --> E[Next-step prediction\n+ risk score]
  D --> F[Reaction judge\nafter you verify]
  E --> G[Screen: script position,\nnext ask, break move]
  F --> G
```

**The AI never decides "scam or not".** It does one narrow, checkable job per line: label the social-engineering tactics (authority, isolation, secrecy, urgency, unusual payment...), the playbook stages the line performs, and who said it. Everything after that is deterministic, unit-tested code:

- **Playbook engine** (`src/engine/engine.ts`) scores each playbook with order-aware rules: stages reached in order count fully, out-of-order hits count half, an "official channel" signal ("check in your banking app") lowers the score.
- **Predictor** shows the next unreached stage of the leading playbook, only above a risk threshold (35) so ordinary calls stay quiet.
- **Reaction judge** looks at the caller's first reply after you try to verify them and labels it *deflect* or *accept*.

## AI usage

| Where | Model | What it does | Why AI |
| --- | --- | --- | --- |
| `src/server/tagger.ts` via `/api/tag` | `openai/gpt-oss-20b` on Groq (fallback `openai/gpt-oss-120b`) | Labels each line with tactics, stage ids and speaker as strict JSON | Scammers paraphrase endlessly; keyword rules miss most of it (see evaluation) |

- Strict JSON output, validated with Zod; unknown labels are dropped, one retry, then the fallback model.
- The conversation is treated as untrusted data; the prompt tells the model to ignore instructions inside it.
- If the AI is unreachable, a keyword tagger takes over and the UI says so ("keyword rules") rather than pretending.

## Cybersecurity methodology

- **Crime-script modelling:** each scam is an ordered sequence of stages with weights, based on public descriptions from the FTC ([imposter scams](https://www.ftc.gov/node/333221), [AI family-emergency scams](https://consumer.ftc.gov/consumer-alerts/2023/03/scammers-use-ai-enhance-their-family-emergency-schemes)). Related research: [crime-script-aware LLM scam detection](https://arxiv.org/pdf/2601.13581), [anticipating scammer responses](https://arxiv.org/html/2507.17543v2).
- **Social-engineering tactic taxonomy:** 13 manipulation tactics plus one legitimate signal (`official_channel`).
- **Out-of-band verification:** every break move sends you to a channel the scammer does not control (the number on your card, a known family number, the official website).
- **Challenge-response:** the reaction judge treats your verification attempt as a challenge and the caller's reply as the response.

## Evaluation

24 scripted conversations written by the team (`eval/conversations.ts`): **12 scams** (4 per script, worded differently from the playbooks) and **12 legitimate calls chosen to look like scams** (a real bank alert, a son asking his mum for money, the tax office, the police about a stolen bike). Run with `npm run eval`; full results in [docs/eval.md](docs/eval.md).

| Metric | Keyword rules (no AI) | **AI tagger** |
| --- | --- | --- |
| Right scam script identified | 10/12 | **11/12** |
| Scams flagged | 12/12 | **12/12** |
| Warned **before** the money or code request | 3/12 | **9/12** |
| Next-step predictions that came true | 6/13 | **12/21** |
| False alarms on legitimate calls | 0/12 | 1/12 |

_Run on Oct 8, 2026 with `openai/gpt-oss-20b`._

**Read this honestly:** the test set is small, hand-written and was used while building, so these numbers show the approach works, not real-world accuracy. The AI's one false alarm was a tax-office reminder ("the deadline is the end of the month") read as pressure; we then clarified in the prompt that a deadline weeks away is not urgency. The one missed script (`gov-4`, a fake police money-laundering call) was matched to the bank script with low risk.

## What works

| Feature | Status |
| --- | --- |
| Replay of 3 demo calls (fake bank, grandson in trouble, real bank alert) | Works, no microphone needed |
| Paste a chat ("Them:" / "Me:" optional) | Works |
| Live listening with automatic speaker detection | Works in Chrome and Edge |
| Next-step prediction and "Called it" stamp | Works |
| Break-move suggestion and reaction judge | Works |
| "Hang up" alert at high risk | Works |
| Keyword fallback when the AI is unreachable | Works, clearly labelled |
| Evaluation harness (`npm run eval`) and 26 unit tests | Works |

## What doesn't (yet)

- **Live listening needs Chrome or Edge** (Web Speech API). Firefox and Safari can use Replay and Paste.
- **It runs next to the call, not inside it.** You put the phone on speaker beside the laptop. A real product would run on the phone itself.
- **Only 3 scam scripts.** A scam that follows a different script (romance, investment, tech support) will mostly not be recognised.
- **English only.**
- **Speaker detection is guessed from the words**, not the voice. It can be wrong; you can click a name to swap it.
- **Free-tier rate limits:** under heavy use the AI may be throttled and the keyword fallback takes over.

## Privacy

Audio is turned into text by the browser's speech service; Scriptbreaker never records audio. Each line of text is sent once to `/api/tag` for labelling and not stored. There are no accounts and no database.

## Tech stack

React 19 + TypeScript + Vite, Tailwind CSS v4, Zod, Vitest · Vercel (static site + serverless function) · Groq API (OpenAI-compatible) with open-weight gpt-oss models · Web Speech API · GitHub Actions (build, tests, gitleaks secret scan).

## Run it locally

```bash
git clone https://github.com/Ferdawes-Benali/scriptbreaker
cd scriptbreaker
npm install
cp .env.example .env.local      # then put your Groq API key in LLM_API_KEY
npm run dev                     # app + /api/tag on http://localhost:5173
npm test                        # unit tests
npm run eval                    # evaluation with the AI tagger (a few minutes)
```

Without an API key the app still runs on the keyword fallback.

## AI disclosure

- **Built with AI assistance:** Claude (Anthropic) helped with research, planning, and writing most of the code, tests, evaluation conversations and this README. The team chose the idea, reviewed and tested every change, ran the evaluation and recorded the demo. Details in [docs/ai-usage.md](docs/ai-usage.md).
- **AI inside the product:** open-weight gpt-oss models on Groq label each line (see AI usage).
- **Demo calls and evaluation calls are scripted role-plays**, not recordings of real people.

## Future work

- More scripts: tech support, romance-to-investment, job and task scams, delivery fees.
- Run on the phone itself, with an on-device model.
- French and Arabic.
- Email channel: forward a suspicious email to an Agentboxd inbox and run it through the same engine.
- Alert a trusted family member when risk is high.
