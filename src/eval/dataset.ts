/**
 * Fixture corpus and question set for the retrieval evaluation harness
 * (see `retrieval-eval.ts`).
 *
 * Each `EvalDocument` is treated as a single retrievable unit - no chunking
 * is applied here, so a retrieved result maps unambiguously back to one
 * document id. That keeps the ground truth in `EVAL_QUESTIONS` simple to
 * define and simple to score against.
 *
 * The documents deliberately cover unrelated topics so a working retriever
 * should have no trouble telling them apart; this is a sanity-check corpus,
 * not a stress test.
 */

export interface EvalDocument {
  id: string;
  text: string;
}

export interface EvalQuestion {
  question: string;
  /** Document ids that count as a correct/relevant retrieval for this question. */
  relevantIds: string[];
}

export const EVAL_DOCUMENTS: EvalDocument[] = [
  {
    id: 'python-history',
    text: "Python was created by Guido van Rossum and first released in 1991. It emphasizes code readability with its notable use of significant indentation.",
  },
  {
    id: 'everest',
    text: "Mount Everest is Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas. Its peak is 8,849 meters above sea level.",
  },
  {
    id: 'octopus',
    text: 'Octopuses have three hearts, blue blood, and can change the color and texture of their skin almost instantly to camouflage from predators.',
  },
  {
    id: 'eiffel-tower',
    text: "The Eiffel Tower was completed in 1889 for the World's Fair in Paris. It was the tallest man-made structure in the world for 41 years.",
  },
  {
    id: 'sourdough',
    text: 'Sourdough bread is leavened using a fermented mixture of flour and water containing wild yeast and lactic acid bacteria, rather than commercial yeast.',
  },
  {
    id: 'great-barrier-reef',
    text: "The Great Barrier Reef off the coast of Queensland, Australia is the world's largest coral reef system, composed of over 2,900 individual reefs.",
  },
  {
    id: 'rust-lang',
    text: 'Rust is a systems programming language focused on memory safety without a garbage collector, achieved through its ownership and borrowing model.',
  },
  {
    id: 'honeybees',
    text: "Honeybees communicate the location of food sources to their hive-mates through a 'waggle dance' that encodes both direction and distance.",
  },
  {
    id: 'photosynthesis',
    text: 'Photosynthesis is the process by which plants convert light energy, water, and carbon dioxide into glucose and oxygen using chlorophyll in their cells.',
  },
  {
    id: 'moon-landing',
    text: 'Apollo 11 landed the first humans on the Moon on July 20, 1969, with astronauts Neil Armstrong and Buzz Aldrin walking on the lunar surface.',
  },
  {
    id: 'javascript-history',
    text: 'JavaScript was created by Brendan Eich in 1995 in just 10 days while he was working at Netscape Communications.',
  },
  {
    id: 'great-wall',
    text: 'The Great Wall of China stretches over 21,000 kilometers and was built over centuries by successive Chinese dynasties to protect against invasions.',
  },
];

export const EVAL_QUESTIONS: EvalQuestion[] = [
  { question: 'Who created Python and when was it released?', relevantIds: ['python-history'] },
  { question: 'How tall is Mount Everest?', relevantIds: ['everest'] },
  { question: 'How many hearts does an octopus have?', relevantIds: ['octopus'] },
  { question: 'When was the Eiffel Tower built and why?', relevantIds: ['eiffel-tower'] },
  { question: 'What makes sourdough bread rise without commercial yeast?', relevantIds: ['sourdough'] },
  { question: 'Where is the Great Barrier Reef located?', relevantIds: ['great-barrier-reef'] },
  { question: 'How does Rust ensure memory safety?', relevantIds: ['rust-lang'] },
  { question: 'How do honeybees tell other bees where food is?', relevantIds: ['honeybees'] },
  { question: 'What do plants need for photosynthesis?', relevantIds: ['photosynthesis'] },
  { question: 'Who were the first astronauts to walk on the Moon?', relevantIds: ['moon-landing'] },
  { question: 'Who invented JavaScript and how long did it take?', relevantIds: ['javascript-history'] },
  { question: 'How long is the Great Wall of China?', relevantIds: ['great-wall'] },
  {
    // A multi-relevant question so precision/recall aren't always 0 or 1 -
    // three documents mention a programming language.
    question: 'What programming languages are discussed and who created them?',
    relevantIds: ['python-history', 'rust-lang', 'javascript-history'],
  },
];
