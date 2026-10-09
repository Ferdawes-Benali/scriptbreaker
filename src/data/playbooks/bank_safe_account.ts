// Scam playbook. Edit freely: it is validated by PlaybookSchema at load time.
export default {
  "id": "bank_safe_account",
  "name": "Bank 'safe account' scam",
  "description": "A fake fraud department convinces you your money is in danger and has you move it to a 'secure' account they control.",
  "sources": [
    "https://www.ftc.gov/node/333221"
  ],
  "stages": [
    {
      "id": "fraud_team_contact",
      "name": "Fake fraud team",
      "description": "Caller claims to be from your bank's fraud or security department.",
      "weight": 1,
      "tactics": [
        "authority"
      ],
      "signals": [
        "this is the fraud department",
        "calling from your bank",
        "security team at your bank",
        "fraud prevention team"
      ],
      "expectedAsk": "They will claim to be your bank's fraud team.",
      "breakMove": "Say: \"I'll call my bank back on the number printed on my card.\""
    },
    {
      "id": "account_threat",
      "name": "Account in danger",
      "description": "Reports suspicious charges, a hacked account or a compromised employee.",
      "weight": 1,
      "tactics": [
        "problem_creation",
        "fear"
      ],
      "signals": [
        "suspicious transactions",
        "your account has been compromised",
        "someone is trying to withdraw",
        "unauthorized charges"
      ],
      "expectedAsk": "They will say your account is under attack or has suspicious charges.",
      "breakMove": "Open your banking app yourself and check the charges."
    },
    {
      "id": "verify_codes",
      "name": "'Verify' with codes",
      "description": "Asks for a one-time code, PIN or card details 'to confirm it's you'.",
      "weight": 1.5,
      "optional": true,
      "tactics": [
        "credential_request",
        "reassurance"
      ],
      "signals": [
        "read me the code we just sent",
        "confirm your card number",
        "what is your PIN",
        "verify your identity"
      ],
      "expectedAsk": "They will ask you to read out a code or PIN to 'verify' you.",
      "breakMove": "Never read a code aloud. Real banks never ask for it."
    },
    {
      "id": "isolate",
      "name": "Isolation and secrecy",
      "description": "Tells you to stay on the line and not tell anyone, not even branch staff.",
      "weight": 2,
      "tactics": [
        "isolation",
        "secrecy",
        "urgency"
      ],
      "signals": [
        "don't hang up",
        "don't tell anyone at the branch",
        "an employee may be involved",
        "keep this confidential"
      ],
      "expectedAsk": "They will tell you to stay on the line and not tell anyone, not even your branch.",
      "breakMove": "Say: \"I'll hang up and call the number on the back of my card.\""
    },
    {
      "id": "safe_account_transfer",
      "name": "Move money to 'safe account'",
      "description": "Asks you to transfer, withdraw or hand over money to protect it.",
      "weight": 3,
      "tactics": [
        "money_movement",
        "urgency"
      ],
      "signals": [
        "transfer to a secure account",
        "holding account",
        "move your savings",
        "withdraw the cash and we'll collect it"
      ],
      "expectedAsk": "They will ask you to move your money to a 'secure' account.",
      "breakMove": "Stop. No real bank ever asks you to move money to protect it."
    },
    {
      "id": "block_verification",
      "name": "Blocks verification",
      "description": "Pressures you not to hang up, call back or visit the branch; coaches what to say.",
      "weight": 2,
      "tactics": [
        "verification_avoidance",
        "urgency"
      ],
      "signals": [
        "if you hang up it can't be stopped",
        "don't call the number on your card",
        "tell the bank it's for a family member",
        "there's no time to go to the branch"
      ],
      "expectedAsk": "They will stop you from checking with your real bank.",
      "breakMove": "Hang up now and call your bank's official number."
    }
  ]
}
