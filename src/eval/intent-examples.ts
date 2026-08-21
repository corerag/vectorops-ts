/**
 * Draft few-shot / eval examples for the intent classifier sitting in front
 * of retrieval. Domain: personal career docs - resume, certifications
 * (Security+, FAA Part 107), work history, skills, clearance status.
 *
 * Hand-written (no query logs available - see session notes: the eval
 * harness in src/eval/ only scores a hardcoded fixture corpus and never
 * persists real traffic to disk).
 *
 * Categories:
 *  - factual_lookup   : answerable from a single doc section (a date,
 *                        title, cert, clearance level, or specific
 *                        "when/where/what is X")
 *  - summarization     : wants synthesis/overview across multiple sections
 *                        or the whole document ("summarize", "overview",
 *                        "walk me through", "TL;DR")
 *  - out_of_scope      : unrelated to the resume/cert docs - general
 *                        knowledge, generic (non-personalized) writing
 *                        tasks, unrelated coding help, general questions
 *                        about certifications in the abstract rather than
 *                        this person's actual credentials
 *  - conversational    : greetings, thanks, meta questions about the
 *                        assistant, small talk, non-informational replies
 *
 * NOT final - flagged items below are deliberately ambiguous boundary
 * cases (marked with a trailing comment) meant to stress-test the
 * classifier prompt, not obviously "clean" examples. Review before use.
 *
 * INTENT_MULTITURN_EXAMPLES (below) covers the follow-up case: a message
 * that only makes sense - or whose category only makes sense - given prior
 * conversation history (e.g. "what about the one before that?", or a
 * factual answer followed by "give me the full picture", which shifts the
 * category rather than repeating the previous turn's).
 */

export type IntentCategory = 'factual_lookup' | 'summarization' | 'out_of_scope' | 'conversational';

export interface IntentExample {
  text: string;
  category: IntentCategory;
}

/** One turn of prior conversation, matching ConversationTurn in conversation.ts. */
export interface IntentHistoryTurn {
  question: string;
  answer: string;
}

/**
 * A follow-up message classified in the context of prior conversation
 * turns - the follow-up text alone is often ambiguous or under-specified
 * without that history (a bare "and before that?" or "great, thanks!").
 */
export interface IntentMultiTurnExample {
  history: IntentHistoryTurn[];
  followUp: string;
  category: IntentCategory;
}

export const INTENT_EXAMPLES: IntentExample[] = [
  // ---------------------------------------------------------------------
  // factual_lookup (30)
  // ---------------------------------------------------------------------
  { text: 'What certifications do you currently hold?', category: 'factual_lookup' },
  { text: 'When did you get your Security+ certification?', category: 'factual_lookup' },
  { text: 'Do you hold an active security clearance?', category: 'factual_lookup' },
  { text: "What's your FAA Part 107 certificate number?", category: 'factual_lookup' },
  { text: 'What company did you work for in 2021?', category: 'factual_lookup' },
  { text: 'What was your job title at your most recent employer?', category: 'factual_lookup' },
  { text: 'How many years of experience do you have with Python?', category: 'factual_lookup' },
  { text: 'What degree did you graduate with?', category: 'factual_lookup' },
  { text: 'When does your Security+ certification expire?', category: 'factual_lookup' },
  { text: 'What drone models are you certified to fly under Part 107?', category: 'factual_lookup' },
  { text: 'What was your GPA?', category: 'factual_lookup' },
  { text: 'Do you have a TS/SCI clearance or just Secret?', category: 'factual_lookup' },
  { text: 'What programming languages are listed on your resume?', category: 'factual_lookup' },
  { text: 'How long were you at your previous role?', category: 'factual_lookup' },
  { text: "What's your current job title?", category: 'factual_lookup' },
  { text: 'What certifications are listed under "Professional Development"?', category: 'factual_lookup' },
  { text: 'Did you complete any CompTIA certifications besides Security+?', category: 'factual_lookup' },
  { text: 'What waivers, if any, are listed alongside your Part 107 certificate?', category: 'factual_lookup' },
  { text: 'What tools are listed under your DevOps skills section?', category: 'factual_lookup' },
  { text: 'What was your role before your last promotion?', category: 'factual_lookup' },
  { text: 'How many total years of professional experience do you have?', category: 'factual_lookup' },
  { text: "What's the renewal date for your Part 107 certificate?", category: 'factual_lookup' },
  { text: 'What investigation tier is listed for your clearance (e.g. Tier 3)?', category: 'factual_lookup' },
  { text: 'What university did you attend?', category: 'factual_lookup' },
  { text: "What's your current employer's industry?", category: 'factual_lookup' },
  { text: 'What certifications are due for renewal within the next year?', category: 'factual_lookup' },
  { text: 'What was your first job out of college?', category: 'factual_lookup' },
  { text: "What's listed as your top technical skill?", category: 'factual_lookup' },
  { text: 'Do you have any project management certifications like PMP?', category: 'factual_lookup' },
  { text: 'What contact information is listed on your resume?', category: 'factual_lookup' },

  // ---------------------------------------------------------------------
  // summarization (30)
  // ---------------------------------------------------------------------
  { text: 'Can you summarize my work experience over the last 10 years?', category: 'summarization' },
  { text: 'Give me an overview of my technical skill set.', category: 'summarization' },
  { text: 'Walk me through my career progression from my first job to now.', category: 'summarization' },
  { text: 'Summarize all my certifications and their expiration dates.', category: 'summarization' },
  { text: "What's the overall picture of my background for a cybersecurity role?", category: 'summarization' },
  { text: 'Give me a high-level summary of my education and certifications.', category: 'summarization' },
  { text: 'Summarize my experience for a resume tailored to a cloud engineering role.', category: 'summarization' },
  { text: 'Can you condense my work history into a two-sentence summary?', category: 'summarization' },
  { text: 'Give me an overview of my clearance and certification status.', category: 'summarization' },
  { text: 'Walk me through my whole career timeline, employer by employer.', category: 'summarization' },
  { text: 'Summarize the skills that would be most relevant for a drone operations job.', category: 'summarization' },
  { text: "What's the general shape of my professional experience?", category: 'summarization' },
  { text: 'Give me a TL;DR of my resume for a recruiter.', category: 'summarization' },
  { text: 'Summarize my qualifications for a job requiring an active clearance.', category: 'summarization' },
  { text: 'Can you give me an overview of my leadership and management experience?', category: 'summarization' },
  { text: 'Summarize how my skills have evolved across each role I\'ve held.', category: 'summarization' },
  { text: 'Give me a recap of everything on my certifications page.', category: 'summarization' },
  { text: 'Walk me through my education history, degree by degree.', category: 'summarization' },
  { text: 'Summarize my experience with any government or defense contracting work.', category: 'summarization' },
  { text: 'Give me an overview of my most recent three roles.', category: 'summarization' },
  { text: 'Summarize my strongest qualifications for a UAS/drone pilot position.', category: 'summarization' },
  { text: "What's the big picture on my technical vs. soft skills balance?", category: 'summarization' },
  { text: 'Summarize any gaps or transitions in my employment history.', category: 'summarization' },
  { text: 'Give me an overview of what makes my background stand out.', category: 'summarization' },
  { text: 'Walk me through the certifications I\'ve earned in chronological order.', category: 'summarization' },
  { text: 'Summarize my resume as it would read to a hiring manager.', category: 'summarization' },
  { text: 'Help me write a cover letter pulling from my actual work experience for a systems admin role.', category: 'summarization' }, // generative task, but grounded in real resume content - needs retrieval, contrast with the generic-template cover letter request under out_of_scope below
  { text: 'Summarize my qualifications relevant to an IT security analyst position.', category: 'summarization' },
  { text: 'Walk me through my entire professional history end to end.', category: 'summarization' },
  { text: 'Give me an overview of all the industries I\'ve worked in.', category: 'summarization' },

  // ---------------------------------------------------------------------
  // out_of_scope (30)
  // ---------------------------------------------------------------------
  { text: "What's the capital of France?", category: 'out_of_scope' },
  { text: 'Can you write me a poem about autumn?', category: 'out_of_scope' },
  { text: "What's the weather like in Chicago today?", category: 'out_of_scope' },
  { text: 'How do I cook a risotto?', category: 'out_of_scope' },
  { text: 'Can you write a Python script that reverses a string?', category: 'out_of_scope' },
  { text: "What's your opinion on the current stock market?", category: 'out_of_scope' },
  { text: 'How does a Security+ cert compare to a CISSP in general?', category: 'out_of_scope' }, // general question about certs in the abstract, not about this person's actual credential - contrast with the Security+ factual_lookup items above
  { text: 'Can you help me plan a weekend trip to Portland?', category: 'out_of_scope' },
  { text: "What's 15% of 340?", category: 'out_of_scope' },
  { text: 'Who won the World Cup in 2018?', category: 'out_of_scope' },
  { text: 'Can you translate "good morning" into Japanese?', category: 'out_of_scope' },
  { text: "Write a generic cover letter template I can reuse for any job - don't bother matching it to my background.", category: 'out_of_scope' }, // explicitly not grounded in resume content, needs no retrieval - contrast with the resume-grounded cover letter request under summarization above
  { text: "What's the best programming language to learn in 2026?", category: 'out_of_scope' },
  { text: 'Can you recommend a good sci-fi book?', category: 'out_of_scope' },
  { text: 'How tall is Mount Kilimanjaro?', category: 'out_of_scope' },
  { text: "What's the plot of the movie Inception?", category: 'out_of_scope' },
  { text: 'Can you help me debug this React component for a side project?', category: 'out_of_scope' },
  { text: 'What are the general requirements to get an FAA Part 107 license?', category: 'out_of_scope' }, // general FAA licensing info, not about this person's actual certificate - contrast with the Part 107 factual_lookup items above
  { text: 'Tell me a joke.', category: 'out_of_scope' },
  { text: 'How do I train a neural network from scratch?', category: 'out_of_scope' },
  { text: "What's the population of Canada?", category: 'out_of_scope' },
  { text: 'Can you write SQL for a database schema for a bakery app?', category: 'out_of_scope' },
  { text: 'What are some strong resume bullet point verbs I could use in general?', category: 'out_of_scope' },
  { text: 'How does GDPR differ from CCPA in general?', category: 'out_of_scope' },
  { text: 'Can you help me write a resignation letter for a job you know nothing about?', category: 'out_of_scope' },
  { text: "What's the healthiest diet for losing weight?", category: 'out_of_scope' },
  { text: 'Give me tips for public speaking.', category: 'out_of_scope' },
  { text: "What's the exchange rate between USD and EUR?", category: 'out_of_scope' },
  { text: 'Can you summarize the plot of the book Dune?', category: 'out_of_scope' }, // "summarize" verb but nothing to do with my actual docs - tests that the classifier keys on domain, not verb
  { text: 'How do I set up a home Wi-Fi network?', category: 'out_of_scope' },

  // ---------------------------------------------------------------------
  // conversational (30)
  // ---------------------------------------------------------------------
  { text: 'Hi there!', category: 'conversational' },
  { text: 'Hey, are you a bot or a real person?', category: 'conversational' },
  { text: 'Thanks, that answered my question.', category: 'conversational' },
  { text: 'Can you help me with something?', category: 'conversational' },
  { text: 'Good morning!', category: 'conversational' },
  { text: "That's not quite what I meant, let me rephrase.", category: 'conversational' },
  { text: 'Cool, thanks a lot.', category: 'conversational' },
  { text: 'Are you able to see my full resume file?', category: 'conversational' },
  { text: 'Never mind, I figured it out.', category: 'conversational' },
  { text: 'What can you help me with?', category: 'conversational' },
  { text: 'Sorry, ignore my last message.', category: 'conversational' },
  { text: 'Appreciate the quick response!', category: 'conversational' },
  { text: 'Is there a human I can talk to instead?', category: 'conversational' },
  { text: 'Hello, I have a quick question.', category: 'conversational' }, // signals a follow-up is coming but carries no lookup content itself
  { text: 'Yeah that makes sense, thank you.', category: 'conversational' },
  { text: 'Just checking, are you still there?', category: 'conversational' },
  { text: 'How are you today?', category: 'conversational' },
  { text: 'Can you repeat that in simpler terms?', category: 'conversational' },
  { text: 'Thanks, one more question actually.', category: 'conversational' },
  { text: 'Okay got it, thanks for clarifying.', category: 'conversational' },
  { text: 'Who am I talking to right now?', category: 'conversational' },
  { text: 'That was helpful, appreciate it!', category: 'conversational' },
  { text: 'Hmm, okay, let me try that.', category: 'conversational' },
  { text: 'What kind of questions can I ask you about my background?', category: 'conversational' },
  { text: 'No worries, thanks anyway.', category: 'conversational' },
  { text: 'Just wanted to say thanks for the help earlier.', category: 'conversational' },
  { text: 'Are you able to actually update my resume, or just answer questions about it?', category: 'conversational' },
  { text: 'Hey, quick one for you.', category: 'conversational' },
  { text: 'Perfect, exactly what I needed.', category: 'conversational' },
  { text: 'Can I ask you something unrelated to my resume real quick?', category: 'conversational' }, // meta framing request, not the off-topic content itself - contrast with out_of_scope examples above
];

// ---------------------------------------------------------------------
// Multi-turn follow-up examples (8 per category, 32 total)
// ---------------------------------------------------------------------
export const INTENT_MULTITURN_EXAMPLES: IntentMultiTurnExample[] = [
  // factual_lookup: pronoun/reference resolution, or a follow-up that
  // pinpoints one fact even after a broader previous turn.
  {
    history: [{ question: 'What certifications do you currently hold?', answer: 'Security+ and an FAA Part 107 remote pilot certificate.' }],
    followUp: 'When does the first one expire?',
    category: 'factual_lookup',
  },
  {
    history: [{ question: 'What was your role at Halden Defense Systems?', answer: 'Cloud Security Analyst.' }],
    followUp: 'And what was your role right before that?',
    category: 'factual_lookup',
  },
  {
    history: [{ question: "What's your current job title?", answer: 'Cloud Security Analyst.' }],
    followUp: 'How long have you been in that role?',
    category: 'factual_lookup',
  },
  {
    history: [{ question: 'Summarize my certifications.', answer: 'You hold Security+ (expires March 2026) and FAA Part 107 (issued June 2022).' }],
    followUp: "What's the exact expiration date on the first one again?",
    category: 'factual_lookup',
  }, // follow-up to a summarization turn, but itself pinpoints a single fact - category shifts, doesn't inherit the previous turn's
  {
    history: [{ question: 'What are your certifications?', answer: 'Security+ and Part 107.' }],
    followUp: 'Tell me more about just the Part 107 one.',
    category: 'factual_lookup',
  },
  {
    history: [{ question: 'When did you work at Northline Logistics?', answer: '2019 to 2022.' }],
    followUp: 'What about at Halden Defense Systems?',
    category: 'factual_lookup',
  },
  {
    history: [{ question: 'What degree do you have?', answer: 'A B.S. in Information Technology.' }],
    followUp: 'What school was that from?',
    category: 'factual_lookup',
  },
  {
    history: [{ question: 'Do you hold a security clearance?', answer: 'Yes, an active Secret clearance.' }],
    followUp: 'When was it last adjudicated?',
    category: 'factual_lookup',
  },

  // summarization: a follow-up that broadens scope beyond what the
  // previous (often factual_lookup) turn covered.
  {
    history: [{ question: 'When did you get your Security+?', answer: 'March 2023.' }],
    followUp: 'Can you give me the full picture of my certifications and work history?',
    category: 'summarization',
  },
  {
    history: [{ question: "What's your current title?", answer: 'Cloud Security Analyst.' }],
    followUp: 'Walk me through how I got here from my first job.',
    category: 'summarization',
  },
  {
    history: [{ question: 'What roles have you held?', answer: 'Systems Administrator, then Cloud Security Analyst.' }],
    followUp: 'Give me more detail on all of them, not just the titles.',
    category: 'summarization',
  },
  {
    history: [{ question: 'Do you have any government contracting experience?', answer: 'Yes, at Halden Defense Systems.' }],
    followUp: 'Summarize everything relevant to that for a federal contractor application.',
    category: 'summarization',
  },
  {
    history: [{ question: "What's the expiration date on your Security+?", answer: 'March 2026.' }],
    followUp: "What about an overview of all my certifications and when I'd need to renew each one?",
    category: 'summarization',
  },
  {
    history: [{ question: 'What was your job title in 2020?', answer: 'Systems Administrator.' }],
    followUp: 'Can you recap my whole career from then to now?',
    category: 'summarization',
  },
  {
    history: [{ question: 'What certifications do you hold?', answer: 'Security+ and Part 107.' }],
    followUp: 'Help me turn all of this into a two-paragraph professional bio.',
    category: 'summarization',
  },
  {
    history: [{ question: "What's your highest degree?", answer: 'A B.S. in Information Technology.' }],
    followUp: 'Combine that with my certifications into an overview of my qualifications.',
    category: 'summarization',
  },

  // out_of_scope: a follow-up that pivots away from the person's own
  // documents even though the previous turn was answerable from them.
  {
    history: [{ question: "What's your current title?", answer: 'Cloud Security Analyst.' }],
    followUp: 'How does that compare to what most companies pay for that role?',
    category: 'out_of_scope',
  },
  {
    history: [{ question: 'What certifications do you hold?', answer: 'Security+ and Part 107.' }],
    followUp: 'Which one should I get next, in general, for a cybersecurity career?',
    category: 'out_of_scope',
  },
  {
    history: [{ question: 'Summarize my background for a cybersecurity role.', answer: 'You bring a Systems Administrator to Cloud Security Analyst progression, backed by Security+ and Part 107.' }],
    followUp: "Can you also write me a generic cover letter for a marketing job - don't worry about tailoring it to me?",
    category: 'out_of_scope',
  },
  {
    history: [{ question: "What's your current employer?", answer: 'Halden Defense Systems.' }],
    followUp: "What's that company's stock ticker?",
    category: 'out_of_scope',
  },
  {
    history: [{ question: 'When does your Security+ expire?', answer: 'March 2026.' }],
    followUp: "What's the passing score on the Security+ exam in general?",
    category: 'out_of_scope',
  }, // general exam trivia, not this person's actual cert status - contrast with the factual_lookup examples above
  {
    history: [{ question: "What's your FAA Part 107 certificate number?", answer: 'FA3-2231-7784.' }],
    followUp: 'How many people take the Part 107 exam each year nationwide?',
    category: 'out_of_scope',
  },
  {
    history: [{ question: "What's your job title?", answer: 'Cloud Security Analyst.' }],
    followUp: 'Can you help me plan a trip for after I quit this job?',
    category: 'out_of_scope',
  },
  {
    history: [{ question: 'Summarize my work history.', answer: 'Systems Administrator at Northline Logistics (2019-2022), then Cloud Security Analyst at Halden Defense Systems (2022-present).' }],
    followUp: "What's a good gift for a coworker's going-away party?",
    category: 'out_of_scope',
  },

  // conversational: a follow-up that's small talk, thanks, or meta,
  // regardless of what the previous turn's category was.
  {
    history: [{ question: 'When does your Security+ expire?', answer: 'March 2026.' }],
    followUp: 'Great, thanks!',
    category: 'conversational',
  },
  {
    history: [{ question: 'Summarize my work history.', answer: 'Systems Administrator at Northline Logistics (2019-2022), then Cloud Security Analyst at Halden Defense Systems (2022-present).' }],
    followUp: "That's really helpful, appreciate it.",
    category: 'conversational',
  },
  {
    history: [{ question: "What's the capital of France?", answer: "That's outside what I can help with here." }],
    followUp: 'Oh okay, my bad.',
    category: 'conversational',
  },
  {
    history: [{ question: "What's your current title?", answer: 'Cloud Security Analyst.' }],
    followUp: 'Wait, are you just reading this from a file, or do you actually know me?',
    category: 'conversational',
  },
  {
    history: [{ question: 'What certifications do you hold?', answer: 'Security+ and Part 107.' }],
    followUp: 'Cool, one more thing though.',
    category: 'conversational',
  }, // signals a follow-up is coming but carries no lookup content itself, same as the single-turn conversational examples above
  {
    history: [{ question: 'When did you get your Part 107?', answer: 'June 2022.' }],
    followUp: 'Hm, okay, let me think about what else to ask.',
    category: 'conversational',
  },
  {
    history: [{ question: 'What was your role at Northline Logistics?', answer: 'Systems Administrator.' }],
    followUp: "Got it, that's all I needed for now.",
    category: 'conversational',
  },
  {
    history: [{ question: 'Summarize my certifications.', answer: 'You hold Security+ (expires March 2026) and FAA Part 107 (issued June 2022).' }],
    followUp: "Sorry, ignore that last question, I'll come back to it.",
    category: 'conversational',
  },
];
