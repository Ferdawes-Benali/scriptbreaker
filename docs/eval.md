# Evaluation

Run on 2026-10-08 with model `openai/gpt-oss-20b` (fallback `openai/gpt-oss-120b`).
24 scripted conversations written by the team: 12 scams (4 per scam script, worded differently from the playbooks) and 12 legitimate calls chosen to look like scams (real bank alerts, relatives asking for money, tax office calls).
AI tagger calls: 79, failed and fell back to keyword rules: 0.

These are small, hand-written test sets, not real calls. They show the approach works; they are not a measure of real-world accuracy.

## AI tagger + playbook engine

| Metric | Result |
| --- | --- |
| Right scam script identified | 12/12 (100%) |
| Scams flagged | 12/12 (100%) |
| Warned before the money/code request | 8/12 (67%) |
| Next-step predictions that came true | 10/20 (50%) |
| False alarms on legitimate calls | 0/12 |

<details><summary>Per conversation</summary>

| Conversation | Type | Matched script | Max risk | Warned after line | Money asked at line |
| --- | --- | --- | --- | --- | --- |
| bank-1 | scam | bank_safe_account | 100 | 3 | 4 |
| bank-2 | scam | bank_safe_account | 61 | 3 | 3 |
| bank-3 | scam | bank_safe_account | 78 | 2 | 4 |
| bank-4 | scam | bank_safe_account | 78 | 3 | 4 |
| family-1 | scam | family_emergency | 100 | 2 | 3 |
| family-2 | scam | family_emergency | 38 | 4 | 2 |
| family-3 | scam | family_emergency | 75 | 1 | 3 |
| family-4 | scam | family_emergency | 63 | 2 | 3 |
| gov-1 | scam | government_fine | 78 | 2 | 4 |
| gov-2 | scam | government_fine | 94 | 2 | 2 |
| gov-3 | scam | government_fine | 100 | 1 | 3 |
| gov-4 | scam | government_fine | 78 | 3 | 3 |
| legit-bank-alert | legit | bank_safe_account | 19 | - | - |
| legit-bank-callback | legit | - | 11 | - | - |
| legit-relative-loan | legit | family_emergency | 30 | - | - |
| legit-tax-reminder | legit | government_fine | 22 | - | - |
| legit-delivery | legit | family_emergency | 6 | - | - |
| legit-doctor | legit | - | 0 | - | - |
| legit-police-report | legit | government_fine | 11 | - | - |
| legit-friend-urgent | legit | family_emergency | 6 | - | - |
| legit-utility | legit | - | 0 | - | - |
| legit-hr | legit | family_emergency | 6 | - | - |
| legit-bank-fee | legit | bank_safe_account | 6 | - | - |
| legit-school | legit | family_emergency | 6 | - | - |

</details>

## Baseline: keyword rules + playbook engine (no AI)

| Metric | Result |
| --- | --- |
| Right scam script identified | 10/12 (83%) |
| Scams flagged | 12/12 (100%) |
| Warned before the money/code request | 3/12 (25%) |
| Next-step predictions that came true | 6/13 (46%) |
| False alarms on legitimate calls | 0/12 |

<details><summary>Per conversation</summary>

| Conversation | Type | Matched script | Max risk | Warned after line | Money asked at line |
| --- | --- | --- | --- | --- | --- |
| bank-1 | scam | family_emergency | 38 | 4 | 4 |
| bank-2 | scam | bank_safe_account | 39 | 5 | 3 |
| bank-3 | scam | family_emergency | 69 | 4 | 4 |
| bank-4 | scam | bank_safe_account | 38 | 4 | 4 |
| family-1 | scam | family_emergency | 100 | 2 | 3 |
| family-2 | scam | family_emergency | 69 | 2 | 2 |
| family-3 | scam | family_emergency | 56 | 1 | 3 |
| family-4 | scam | family_emergency | 63 | 3 | 3 |
| gov-1 | scam | government_fine | 46 | 2 | 4 |
| gov-2 | scam | government_fine | 100 | 2 | 2 |
| gov-3 | scam | government_fine | 50 | 3 | 3 |
| gov-4 | scam | government_fine | 49 | 3 | 3 |
| legit-bank-alert | legit | bank_safe_account | 11 | - | - |
| legit-bank-callback | legit | - | 11 | - | - |
| legit-relative-loan | legit | family_emergency | 6 | - | - |
| legit-tax-reminder | legit | - | 11 | - | - |
| legit-delivery | legit | - | 0 | - | - |
| legit-doctor | legit | - | 0 | - | - |
| legit-police-report | legit | family_emergency | 6 | - | - |
| legit-friend-urgent | legit | family_emergency | 13 | - | - |
| legit-utility | legit | - | 0 | - | - |
| legit-hr | legit | - | 0 | - | - |
| legit-bank-fee | legit | family_emergency | 6 | - | - |
| legit-school | legit | family_emergency | 6 | - | - |

</details>
