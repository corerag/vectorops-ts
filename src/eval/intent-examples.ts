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
 * Future improvement (out of scope for this pass): multi-turn examples,
 * i.e. classifying a follow-up turn that only makes sense given prior
 * conversation context (e.g. "what about the one before that?").
 */

export type IntentCategory = 'factual_lookup' | 'summarization' | 'out_of_scope' | 'conversational';

export interface IntentExample {
  text: string;
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
