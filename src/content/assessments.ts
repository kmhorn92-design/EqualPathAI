/** Original practice content written for EqualPath AI. Not drawn from any employer's live assessment. */
export type MCQ = { id: string; q: string; options: string[]; answer: number; why: string };
export type Module = { id: string; title: string; kind: "mcq" | "typing" | "interview"; minutes: number; blurb: string; questions?: MCQ[]; passages?: string[]; prompts?: { q: string; tip: string }[] };

export const MODULES: Module[] = [
  {
    id: "numerical", title: "Numerical Reasoning", kind: "mcq", minutes: 10, blurb: "Percentages, ratios, rates and reading tables.",
    questions: [
      { id: "n1", q: "A clinic sees 240 patients a week. 15% are new patients. How many new patients per week?", options: ["24", "36", "40", "15"], answer: 1, why: "15% × 240 = 0.15 × 240 = 36." },
      { id: "n2", q: "A shirt costs $40 and is discounted 25%, then an extra 10% off the sale price. Final price?", options: ["$26.00", "$27.00", "$28.00", "$30.00"], answer: 1, why: "$40 × 0.75 = $30; $30 × 0.90 = $27." },
      { id: "n3", q: "A team packs 450 boxes in 6 hours. At that rate, how many in an 8-hour shift?", options: ["560", "580", "600", "640"], answer: 2, why: "450 ÷ 6 = 75 per hour; 75 × 8 = 600." },
      { id: "n4", q: "Sales rose from $12,000 to $15,000. Percentage increase?", options: ["20%", "25%", "30%", "3%"], answer: 1, why: "(15,000 − 12,000) ÷ 12,000 = 0.25 = 25%." },
      { id: "n5", q: "The ratio of full-time to part-time staff is 3:2. There are 30 staff. How many are part-time?", options: ["10", "12", "15", "18"], answer: 1, why: "2 ÷ (3+2) = 2/5; 2/5 × 30 = 12." },
      { id: "n6", q: "Q1 calls: 1,200. Q2: 1,500. Q3: 1,350. Average calls per quarter?", options: ["1,300", "1,350", "1,400", "1,450"], answer: 1, why: "(1,200 + 1,500 + 1,350) ÷ 3 = 4,050 ÷ 3 = 1,350." },
      { id: "n7", q: "You earn $18/hour and work 32 hours. Overtime isn't involved. Gross pay?", options: ["$556", "$576", "$596", "$612"], answer: 1, why: "$18 × 32 = $576." },
      { id: "n8", q: "A delivery route is 84 miles. A van gets 21 miles per gallon. Gas is $3.50/gal. Fuel cost?", options: ["$12.00", "$14.00", "$16.50", "$18.00"], answer: 1, why: "84 ÷ 21 = 4 gallons; 4 × $3.50 = $14.00." },
    ],
  },
  {
    id: "verbal", title: "Verbal Reasoning", kind: "mcq", minutes: 10, blurb: "Reading comprehension, vocabulary in context, and logic.",
    questions: [
      { id: "v1", q: "Passage: 'All shift leads must complete safety training before supervising. Dana supervised the morning shift.' What can be concluded?", options: ["Dana is a manager", "Dana completed safety training (if the rule was followed)", "Dana skipped training", "Cannot be determined at all"], answer: 1, why: "If the policy was followed, supervising requires completed training." },
      { id: "v2", q: "Choose the word closest in meaning to 'expedite' as in 'please expedite the order.'", options: ["Delay", "Speed up", "Cancel", "Inspect"], answer: 1, why: "To expedite is to make something happen faster." },
      { id: "v3", q: "Passage: 'Remote staff may choose their hours, provided they attend the 10 a.m. team call.' Which is TRUE?", options: ["Remote staff have no requirements", "Remote staff must attend the 10 a.m. call", "Everyone works 9–5", "The call is optional"], answer: 1, why: "'Provided' sets a required condition." },
      { id: "v4", q: "Which sentence is most professional for an email to a hiring manager?", options: ["hey, any update??", "Following up on my application for the Billing Specialist role — I'm still very interested.", "Why haven't you called me", "Update pls"], answer: 1, why: "Clear, polite, and specific." },
      { id: "v5", q: "'The policy was ambiguous.' Ambiguous means…", options: ["Clear", "Open to more than one interpretation", "Illegal", "Old"], answer: 1, why: "Ambiguous = can be understood in more than one way." },
      { id: "v6", q: "Passage: 'Returns are accepted within 30 days with a receipt. Store credit is offered without a receipt.' A customer has no receipt on day 10. They can get…", options: ["A cash refund", "Store credit", "Nothing", "A refund after 30 days"], answer: 1, why: "Without a receipt, the policy offers store credit." },
      { id: "v7", q: "Identify the error: 'Each of the nurses have completed their certification.'", options: ["'Each' should be 'All'", "'have' should be 'has'", "No error", "'nurses' should be 'nurse'"], answer: 1, why: "'Each' is singular, so the verb should be 'has'." },
      { id: "v8", q: "Which is an opinion rather than a fact?", options: ["The office opens at 8 a.m.", "Our new scheduling system is the best on the market.", "The team has 12 members.", "The report is due Friday."], answer: 1, why: "'Best on the market' is a judgment, not a verifiable fact." },
    ],
  },
  {
    id: "situational", title: "Situational Judgment", kind: "mcq", minutes: 8, blurb: "Choose the most effective response to workplace scenarios.",
    questions: [
      { id: "s1", q: "You notice a coworker made an error on a report due to your manager in an hour. Most effective response?", options: ["Ignore it", "Tell the manager immediately without talking to the coworker", "Let the coworker know privately and offer to help fix it", "Fix it yourself without telling anyone"], answer: 2, why: "Respectful, collaborative, and gets the problem fixed before the deadline." },
      { id: "s2", q: "You're given two urgent tasks by two supervisors that can't both be finished today.", options: ["Pick the easier one", "Ask both supervisors to help prioritize", "Do half of each", "Stay silent and work late"], answer: 1, why: "Transparent prioritization prevents surprises." },
      { id: "s3", q: "On your first week, you don't understand a process your trainer explained once.", options: ["Guess", "Ask a clarifying question and take notes", "Wait until you make a mistake", "Complain to HR"], answer: 1, why: "Asking early is expected of new hires and prevents errors." },
      { id: "s4", q: "A teammate repeatedly takes credit for your work in meetings.", options: ["Confront them publicly", "Document your contributions and raise it calmly with them, then your manager if needed", "Stop contributing", "Post about it online"], answer: 1, why: "Professional escalation with documentation is most effective." },
      { id: "s5", q: "You realize you'll miss a deadline due to an unexpected issue.", options: ["Say nothing", "Notify stakeholders early with a revised timeline", "Blame another team", "Submit incomplete work silently"], answer: 1, why: "Early, honest communication preserves trust." },
      { id: "s6", q: "A customer shares private health information with you at a pharmacy counter where others can hear.", options: ["Repeat it loudly to confirm", "Move the conversation somewhere more private if possible", "Ignore privacy", "Ask them to come back tomorrow"], answer: 1, why: "Protecting privacy while still helping is the best practice." },
    ],
  },
  {
    id: "customer-service", title: "Customer Service Scenarios", kind: "mcq", minutes: 8, blurb: "De-escalation, empathy and problem-solving.",
    questions: [
      { id: "c1", q: "An upset customer says their order arrived broken. Best first response?", options: ["That's not our fault", "I'm sorry that happened — let's get this fixed. Can I get your order number?", "Calm down", "Read them the return policy"], answer: 1, why: "Acknowledge, empathize, then move to resolution." },
      { id: "c2", q: "A caller asks something you don't know the answer to.", options: ["Make up an answer", "Tell them you'll find out, put them on a brief hold or follow up by a set time", "Hang up", "Transfer randomly"], answer: 1, why: "Honest answers with a clear follow-up build trust." },
      { id: "c3", q: "A customer uses abusive language repeatedly.", options: ["Yell back", "Calmly set a boundary and follow your company's escalation policy", "Cry", "Agree with them"], answer: 1, why: "Boundaries plus policy protect you and the customer relationship." },
      { id: "c4", q: "The system is down and a line is forming.", options: ["Disappear", "Inform customers honestly, give an estimate, and offer alternatives", "Pretend nothing is wrong", "Close the store"], answer: 1, why: "Transparency reduces frustration." },
      { id: "c5", q: "A customer requests a refund outside policy. You can't approve it.", options: ["Approve anyway", "Explain the policy kindly and offer what you can (e.g., escalate to a manager or store credit)", "Say no and walk away", "Argue"], answer: 1, why: "Respectful explanation plus available options." },
      { id: "c6", q: "After resolving an issue, best closing?", options: ["Next!", "Is there anything else I can help you with today?", "Silence", "Please don't call again"], answer: 1, why: "Confirms resolution and leaves a positive impression." },
    ],
  },
  {
    id: "technical", title: "Technical Screening Basics", kind: "mcq", minutes: 10, blurb: "IT fundamentals, spreadsheets, SQL and web basics.",
    questions: [
      { id: "t1", q: "In Excel, which formula adds values in A1 through A10?", options: ["=ADD(A1:A10)", "=SUM(A1:A10)", "=TOTAL(A1-A10)", "=PLUS(A1,A10)"], answer: 1, why: "SUM adds a range." },
      { id: "t2", q: "In SQL, which keyword filters rows?", options: ["ORDER BY", "WHERE", "GROUP", "SELECT"], answer: 1, why: "WHERE filters rows that meet a condition." },
      { id: "t3", q: "What does HTTPS add compared to HTTP?", options: ["Speed", "Encryption in transit", "Images", "Cookies"], answer: 1, why: "TLS encrypts data between browser and server." },
      { id: "t4", q: "A user can't connect to Wi-Fi but others can. Good first troubleshooting step?", options: ["Replace the router", "Check whether Wi-Fi is enabled on their device and restart it", "Call the ISP", "Reinstall the OS"], answer: 1, why: "Start with the simplest, most local causes." },
      { id: "t5", q: "In JavaScript, what does `[1,2,3].length` return?", options: ["2", "3", "4", "undefined"], answer: 1, why: "The array has three elements." },
      { id: "t6", q: "Which is the strongest password?", options: ["password123", "Summer2024", "t7#Lq!v9mZ@2pW", "qwerty"], answer: 2, why: "Long, random, and mixed character types." },
      { id: "t7", q: "VLOOKUP is used to…", options: ["Format cells", "Look up a value in a table and return a related value", "Create charts", "Spell check"], answer: 1, why: "VLOOKUP searches the first column of a range and returns a value from another column." },
      { id: "t8", q: "What is phishing?", options: ["A network protocol", "A fraudulent attempt to trick someone into revealing information", "A backup method", "A programming language"], answer: 1, why: "Phishing uses deceptive messages to steal credentials or data." },
    ],
  },
  {
    id: "typing", title: "Typing Practice", kind: "typing", minutes: 3, blurb: "Measure words per minute and accuracy with workplace-style passages.",
    passages: [
      "Thank you for contacting our support team. I have reviewed your account and updated the shipping address. You should receive a confirmation email within the next hour.",
      "Please schedule the patient for a follow-up appointment in two weeks and send a reminder the day before. Note any changes to their insurance information in the record.",
      "The quarterly inventory count is scheduled for Friday morning. All team members should report to the warehouse by seven and bring their scanners fully charged.",
      "Our office will be closed on Monday for the holiday. Urgent requests can be sent to the shared inbox, and someone will respond on Tuesday morning.",
    ],
  },
  {
    id: "mock-interview", title: "Mock Interview (STAR)", kind: "interview", minutes: 15, blurb: "Practice common questions and get structured feedback on your answers.",
    prompts: [
      { q: "Tell me about yourself.", tip: "Present → past → future: your current focus, relevant experience, and why this role." },
      { q: "Describe a time you handled a difficult customer or person.", tip: "STAR: Situation, Task, Action (what YOU did), Result." },
      { q: "Tell me about a time you made a mistake. What did you learn?", tip: "Own it briefly, focus on the fix and the lesson." },
      { q: "Describe a time you had to learn something new quickly.", tip: "Name the skill, how you learned it, and how you applied it." },
      { q: "Why do you want to work here?", tip: "Connect something specific about the employer to your goals and skills." },
      { q: "Tell me about a time you worked on a team to reach a goal.", tip: "Clarify your role. Use 'I' for your actions, 'we' for the team outcome." },
    ],
  },
];
export const getModule = (id: string) => MODULES.find((m) => m.id === id);
