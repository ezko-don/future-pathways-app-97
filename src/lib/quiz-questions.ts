// Shared question set for the AI Navigator quiz — used by the web quiz UI
// (quiz.tsx) and the WhatsApp text version (whatsapp-webhook.server.ts) so
// both channels ask exactly the same questions and produce comparable reports.
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "subject",
    question: "Which school subject makes you lose track of time?",
    options: [
      "Mathematics or Physics",
      "Biology or Agriculture",
      "Business or Geography",
      "Kiswahili, English or History",
      "Art, Music or Sports",
    ],
  },
  {
    id: "activity",
    question: "On a free Saturday, you would rather…",
    options: [
      "Take apart a phone or radio to see how it works",
      "Volunteer at a clinic, farm or community project",
      "Sell something small at the market or online",
      "Write, film or perform something creative",
      "Coach or organise a team sport",
    ],
  },
  {
    id: "problem",
    question: "A problem in your community you'd love to fix:",
    options: [
      "Unreliable electricity, water or internet",
      "Food security and small-farmer income",
      "Youth unemployment and hustles",
      "Poor mental health support in schools",
      "Loss of local culture and languages",
    ],
  },
  {
    id: "strength",
    question: "Friends usually ask you for help with…",
    options: [
      "Fixing gadgets or solving puzzles",
      "Explaining tough concepts calmly",
      "Planning events or budgets",
      "Designing posters, videos or captions",
      "Settling arguments and speaking up",
    ],
  },
  {
    id: "work",
    question: "Your dream workplace looks like…",
    options: [
      "A lab, workshop or engineering site",
      "A hospital, farm or field research team",
      "A startup office or trading floor",
      "A studio, newsroom or classroom",
      "Anywhere outdoors with real people",
    ],
  },
  {
    id: "future",
    question: "In 10 years you want to be known for…",
    options: [
      "Building tech that solves African problems",
      "Improving lives through health or environment",
      "Running a profitable business that hires others",
      "Telling Kenyan stories to the world",
      "Leading change in policy or community",
    ],
  },
];
