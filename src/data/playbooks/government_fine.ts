// Scam playbook. Edit freely: it is validated by PlaybookSchema at load time.
export default {
  "id": "government_fine",
  "name": "Government, tax or toll threat",
  "description": "A fake official says you owe a fine, tax or toll and must pay today in an unusual way.",
  "sources": [
    "https://www.ftc.gov/node/333221"
  ],
  "stages": [
    {
      "id": "official_contact",
      "name": "Fake official",
      "description": "Claims to be from a tax office, police, customs or a toll agency.",
      "weight": 1,
      "tactics": [
        "authority"
      ],
      "signals": [
        "this is the tax office",
        "calling from the police",
        "customs department",
        "toll services"
      ],
      "expectedAsk": "They will claim to be from a government agency.",
      "breakMove": "Ask for a reference number, then look up the agency's official number yourself."
    },
    {
      "id": "violation",
      "name": "You owe money",
      "description": "Says you have an unpaid tax, fine, toll or a legal problem.",
      "weight": 1,
      "tactics": [
        "problem_creation",
        "fear"
      ],
      "signals": [
        "unpaid toll",
        "you owe back taxes",
        "a warrant in your name",
        "your package was seized"
      ],
      "expectedAsk": "They will say you owe a fine, tax or toll.",
      "breakMove": "Log in to the official government website yourself to check."
    },
    {
      "id": "threat_deadline",
      "name": "Threat and deadline",
      "description": "Threatens arrest, licence suspension or extra fees unless you pay now.",
      "weight": 2,
      "tactics": [
        "urgency",
        "fear"
      ],
      "signals": [
        "you will be arrested today",
        "your licence will be suspended",
        "late fees double tonight",
        "pay within the hour"
      ],
      "expectedAsk": "They will threaten arrest or penalties unless you pay today.",
      "breakMove": "Real agencies send letters and never demand payment on the phone."
    },
    {
      "id": "stay_on_line",
      "name": "Stay on the line",
      "description": "Tells you not to hang up or contact anyone while you pay.",
      "weight": 1,
      "optional": true,
      "tactics": [
        "isolation",
        "secrecy"
      ],
      "signals": [
        "stay on the line",
        "do not contact a lawyer",
        "don't discuss this case",
        "this call is being recorded for court"
      ],
      "expectedAsk": "They will tell you to stay on the line and not contact anyone.",
      "breakMove": "Say you will call back through the official number."
    },
    {
      "id": "unusual_payment",
      "name": "Unusual payment",
      "description": "Demands gift cards, crypto, a wire or payment through a text link.",
      "weight": 3,
      "tactics": [
        "payment_channel_switch",
        "money_movement"
      ],
      "signals": [
        "pay with gift cards",
        "bitcoin ATM",
        "pay through this link",
        "wire the amount"
      ],
      "expectedAsk": "They will demand payment by gift card, crypto, wire or a link.",
      "breakMove": "Stop. Government agencies never take gift cards or crypto."
    },
    {
      "id": "block_verification",
      "name": "Blocks verification",
      "description": "Refuses to let you check through the official website or number.",
      "weight": 2,
      "tactics": [
        "verification_avoidance"
      ],
      "signals": [
        "the website won't show it",
        "if you hang up the warrant is issued",
        "don't go to the office",
        "this is your only chance"
      ],
      "expectedAsk": "They will refuse to let you check the official website or number.",
      "breakMove": "Hang up and report it."
    }
  ]
}
