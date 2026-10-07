// Scam playbook. Edit freely: it is validated by PlaybookSchema at load time.
export default {
  "id": "family_emergency",
  "name": "Family emergency (voice clone)",
  "description": "Someone who sounds like a relative is in trouble and needs money now, often with a cloned voice.",
  "sources": [
    "https://consumer.ftc.gov/consumer-alerts/2023/03/scammers-use-ai-enhance-their-family-emergency-schemes"
  ],
  "stages": [
    {
      "id": "distress_call",
      "name": "Relative in distress",
      "description": "A caller sounding like a relative says they are in trouble: accident, arrest, hospital.",
      "weight": 1,
      "tactics": [
        "impersonation",
        "fear"
      ],
      "signals": [
        "it's me, I'm in trouble",
        "I've been in an accident",
        "I got arrested",
        "I'm in the hospital"
      ],
      "expectedAsk": "Someone sounding like a relative will say they are in trouble.",
      "breakMove": "Ask: \"What's our family safe word?\""
    },
    {
      "id": "authority_handoff",
      "name": "'Lawyer' or 'officer' takes over",
      "description": "A second voice claims to be a lawyer, police officer or doctor.",
      "weight": 1,
      "optional": true,
      "tactics": [
        "authority"
      ],
      "signals": [
        "I'm his lawyer",
        "this is officer",
        "I'm the doctor treating her",
        "I'm representing your grandson"
      ],
      "expectedAsk": "A 'lawyer', 'officer' or 'doctor' will take over the call.",
      "breakMove": "Ask for their name and call the police station or hospital yourself."
    },
    {
      "id": "keep_secret",
      "name": "Keep it secret",
      "description": "Begs you not to tell parents or other relatives.",
      "weight": 2,
      "tactics": [
        "secrecy",
        "isolation"
      ],
      "signals": [
        "please don't tell mom and dad",
        "don't tell anyone",
        "I'm so embarrassed",
        "keep this between us"
      ],
      "expectedAsk": "They will beg you not to tell anyone else in the family.",
      "breakMove": "Say: \"I'll call you back on your usual number in two minutes.\""
    },
    {
      "id": "urgent_payment",
      "name": "Urgent unusual payment",
      "description": "Asks for bail, fees or bills now via gift cards, wire, crypto or a courier.",
      "weight": 3,
      "tactics": [
        "money_movement",
        "payment_channel_switch",
        "urgency"
      ],
      "signals": [
        "I need money for bail",
        "buy gift cards",
        "send it by wire",
        "someone will come pick up the cash"
      ],
      "expectedAsk": "They will ask for money right now, by gift card, wire, crypto or courier.",
      "breakMove": "Do not pay. Call the relative on a number you already have."
    },
    {
      "id": "block_verification",
      "name": "Refuses verification",
      "description": "Gets upset at questions, refuses video or a call-back.",
      "weight": 2,
      "tactics": [
        "verification_avoidance",
        "urgency"
      ],
      "signals": [
        "there's no time for that",
        "my phone is broken",
        "I can't do video",
        "why don't you trust me"
      ],
      "expectedAsk": "They will refuse a call-back or a video call.",
      "breakMove": "Hang up and call another family member to check."
    }
  ]
}
