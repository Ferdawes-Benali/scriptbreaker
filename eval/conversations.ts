/**
 * Evaluation set: scripted conversations written by the team, NOT real calls.
 * Scams use different wording from the playbook signals on purpose, so the tagger has to generalise.
 * Legitimate calls are deliberately close to scams (banks, relatives asking for money, tax offices).
 *
 * `money` marks the line where the caller first asks for money, codes or payment:
 * a good result warns BEFORE that line.
 */
export interface EvalLine {
  speaker: 'them' | 'me'
  text: string
  money?: boolean
}

export interface EvalConversation {
  id: string
  isScam: boolean
  /** Expected playbook for scams, null for legitimate calls. */
  playbookId: string | null
  lines: EvalLine[]
}

const T = (text: string, money = false): EvalLine => ({ speaker: 'them', text, money })
const M = (text: string): EvalLine => ({ speaker: 'me', text })

export const EVAL_SET: EvalConversation[] = [
  // ---------- Bank "safe account" scams ----------
  {
    id: 'bank-1',
    isScam: true,
    playbookId: 'bank_safe_account',
    lines: [
      T('Good afternoon, I am calling from the security team at your bank, my name is Sarah.'),
      T('Someone in another country just tried to take 1,800 euros out of your current account.'),
      M('What? I did not do that.'),
      T('I believe you. This is confidential, so please do not discuss it with branch staff, we think someone inside is involved.'),
      T('We have opened a protected account in your name. You need to send your balance there today so the fraudster cannot reach it.', true),
      M('Can I call the bank back first?'),
      T('If you end this call the protection is cancelled and the money will be gone.'),
    ],
  },
  {
    id: 'bank-2',
    isScam: true,
    playbookId: 'bank_safe_account',
    lines: [
      T('Hello, fraud prevention here, from your bank. Am I speaking to the account holder?'),
      M('Yes, speaking.'),
      T('We have blocked three unusual card payments made this morning.'),
      T('To confirm it is really you, please read me the six digit code we just texted you.', true),
      M('Okay, one moment.'),
      T('Thank you. Now, stay on the line with me while we secure your savings.'),
    ],
  },
  {
    id: 'bank-3',
    isScam: true,
    playbookId: 'bank_safe_account',
    lines: [
      T("This is the bank's investigations unit calling about your account."),
      T('Your account was accessed from a new device and funds are at risk.'),
      T('Keep this between us for now, the investigation is ongoing and staff at your branch are under review.'),
      M('That is scary. What do I do?'),
      T('Withdraw the cash and our courier will collect it from your home this afternoon for safekeeping.', true),
    ],
  },
  {
    id: 'bank-4',
    isScam: true,
    playbookId: 'bank_safe_account',
    lines: [
      T('Hi, I work in the anti-fraud department of your bank.'),
      T('A loan of 5,000 euros was just requested in your name.'),
      M('I never asked for a loan.'),
      T('Then we must act fast. Do not hang up and do not call anyone else.'),
      T('I will guide you to move your money into a holding account where it is insured.', true),
    ],
  },

  // ---------- Family emergency scams ----------
  {
    id: 'family-1',
    isScam: true,
    playbookId: 'family_emergency',
    lines: [
      T("Mum? It's me. I crashed the car and I'm at the police station."),
      M('Oh my god, are you okay?'),
      T("I'm okay but I'm in so much trouble. Please don't tell dad."),
      T('They say I need 1,500 for bail today. Can you send it by wire right now?', true),
      M("Let me call you back on your phone."),
      T("You can't, they took my phone. Please, there's no time."),
    ],
  },
  {
    id: 'family-2',
    isScam: true,
    playbookId: 'family_emergency',
    lines: [
      T('Grandpa, it is me. I am in the hospital, I was in an accident abroad.'),
      T('Hello sir, I am the doctor treating your grandson. He needs surgery before we can continue.'),
      T('The hospital needs payment now. Gift cards are the fastest way, you can buy them at any supermarket.', true),
      M('Can I speak to his parents first?'),
      T('Please, he begged us not to worry his parents. There is no time.'),
    ],
  },
  {
    id: 'family-3',
    isScam: true,
    playbookId: 'family_emergency',
    lines: [
      T("Hey, it's your nephew. I got arrested last night and I'm really scared."),
      T("Please keep this between us, I'm so embarrassed."),
      M('What do you need?'),
      T('My lawyer says 2,000 in Bitcoin will sort it out today.', true),
    ],
  },
  {
    id: 'family-4',
    isScam: true,
    playbookId: 'family_emergency',
    lines: [
      T("Hi auntie, it's me, I'm in big trouble and I need your help."),
      T('This is officer Ben Ali. Your niece has been detained after a traffic incident.'),
      T('She asked us not to inform her parents.'),
      T('A courier will pass by your house to pick up the cash for her release.', true),
      M('Can we do a video call so I can see her?'),
      T('That is not possible in custody. Why do you not trust us?'),
    ],
  },

  // ---------- Government / tax / toll scams ----------
  {
    id: 'gov-1',
    isScam: true,
    playbookId: 'government_fine',
    lines: [
      T('This is the national tax administration calling about your file.'),
      T('Our records show unpaid tax of 900 dinars from last year.'),
      T('If this is not settled within one hour, a warrant will be issued for your arrest.'),
      M("I didn't receive any letter."),
      T('You can settle it immediately with prepaid vouchers from any shop.', true),
    ],
  },
  {
    id: 'gov-2',
    isScam: true,
    playbookId: 'government_fine',
    lines: [
      T('Hello, motorway toll services. You passed a toll without paying.'),
      T('Your driving licence will be suspended tonight unless the fine is paid.'),
      T('I am sending you a payment link by text, please pay through it now.', true),
      M('Can I check this on the official website?'),
      T('The website will not show it yet. This is your only chance to avoid the penalty.'),
    ],
  },
  {
    id: 'gov-3',
    isScam: true,
    playbookId: 'government_fine',
    lines: [
      T('This is customs. A parcel in your name was seized with illegal items inside.'),
      T('You are facing charges unless you pay a release fee today.'),
      T('Stay on the line, do not contact a lawyer, this call is recorded for the court.'),
      T('Transfer the fee to the account I give you, or pay with cryptocurrency.', true),
    ],
  },
  {
    id: 'gov-4',
    isScam: true,
    playbookId: 'government_fine',
    lines: [
      T('Calling from the police financial crimes unit.'),
      T('Your identity was used in a money laundering case and there is a warrant in your name.'),
      M('That cannot be right.'),
      T('To clear your name today you must buy gift cards and read me the numbers.', true),
    ],
  },

  // ---------- Legitimate calls (should stay quiet) ----------
  {
    id: 'legit-bank-alert',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hello, this is the fraud team at your bank about a card payment.'),
      T('We saw a payment of 60 euros at an online shop, was that you?'),
      M('No, it was not.'),
      T('No problem, we have blocked the card. A new one will arrive by post.'),
      T('We will never ask for your PIN or codes. You can see everything in your banking app.'),
    ],
  },
  {
    id: 'legit-bank-callback',
    isScam: false,
    playbookId: null,
    lines: [
      T('Good morning, your bank here, calling about a suspicious login.'),
      M("I'll hang up and call the number on the back of my card."),
      T('Of course, please do that. Ask for the security team and mention this alert.'),
    ],
  },
  {
    id: 'legit-relative-loan',
    isScam: false,
    playbookId: null,
    lines: [
      T("Hi mum, it's me. My car broke down on the way to work."),
      M('Oh no, where are you?'),
      T("I'm at the garage near the station. Could you lend me 200 until payday?"),
      M('Sure, I will transfer it tonight.'),
      T('Thanks, see you on Sunday for lunch.'),
    ],
  },
  {
    id: 'legit-tax-reminder',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hello, I am calling from the tax office about your annual declaration.'),
      T('We have not received it yet, the deadline is the end of the month.'),
      T('You can submit it on the official website or visit your local office.'),
      M('Thank you, I will do it this week.'),
    ],
  },
  {
    id: 'legit-delivery',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hi, delivery driver here. I have a parcel for you but nobody answered the door.'),
      T('I can leave it with your neighbour or bring it back tomorrow.'),
      M('Leave it with the neighbour please.'),
    ],
  },
  {
    id: 'legit-doctor',
    isScam: false,
    playbookId: null,
    lines: [
      T("Hello, this is the clinic calling to confirm tomorrow's appointment at ten."),
      T('Please bring your insurance card and arrive ten minutes early.'),
      M('Yes, I will be there.'),
    ],
  },
  {
    id: 'legit-police-report',
    isScam: false,
    playbookId: null,
    lines: [
      T('Good afternoon, police station here, about the bike theft you reported.'),
      T('We found a bike that matches your description.'),
      T('You can come to the station with your ID to identify it, no fee is needed.'),
    ],
  },
  {
    id: 'legit-friend-urgent',
    isScam: false,
    playbookId: null,
    lines: [
      T("Hey, it's Amine. I'm stuck at the airport, my flight got cancelled."),
      M('Oh no, are you okay?'),
      T("Yes, just annoyed. Can you pick me up tonight? I'll pay for the fuel."),
    ],
  },
  {
    id: 'legit-utility',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hello, electricity company here. There will be a planned outage in your street tomorrow.'),
      T('Power will be off from nine to noon for maintenance.'),
      T('Your next bill is available in your online account as usual.'),
    ],
  },
  {
    id: 'legit-hr',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hi, this is HR from your company. Your new contract is ready.'),
      T('Please come to the office on Monday to sign it.'),
      M('Great, thank you.'),
    ],
  },
  {
    id: 'legit-bank-fee',
    isScam: false,
    playbookId: null,
    lines: [
      T('Hello, your bank advisor here. Your account went slightly overdrawn this week.'),
      T('A small fee may apply. You can top up your account in the app or at the branch.'),
      M('Okay, I will add money today.'),
      T('Perfect. Have a good day.'),
    ],
  },
  {
    id: 'legit-school',
    isScam: false,
    playbookId: null,
    lines: [
      T("Hello, this is your son's school. He has a fever and needs to be picked up."),
      M("I'm on my way."),
      T('Thank you, he is with the nurse.'),
    ],
  },
]
