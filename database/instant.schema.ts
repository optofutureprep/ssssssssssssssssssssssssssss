import { i } from '@instantdb/react';

const schema = i.schema({
  entities: {
    // Test questions stored in database
    testQuestions: i.entity({
      subject: i.string(),
      testIndex: i.number(),
      questionIndex: i.number(),
      stem: i.string(),
      choices: i.string().array(),
      correctAnswer: i.number(),
    }),
    
    // Test attempts - only for authenticated users
    testAttempts: i.entity({
      userId: i.string(), // Will be linked to InstantDB auth user
      subject: i.string(),
      testIndex: i.number(),
      score: i.number(),
      correct: i.number(),
      total: i.number(),
      date: i.string(), // ISO date string
      userAnswers: i.string(), // JSON stringified object
      markedQuestions: i.string(), // JSON stringified object
      totalTimeSeconds: i.number(),
      avgTimePerQuestionSeconds: i.number(),
    }),
    
    // Highlights from test attempts
    testHighlights: i.entity({
      attemptId: i.id('testAttempts'),
      questionIndex: i.number(),
      highlightData: i.string(), // JSON stringified highlight data
      passageHighlights: i.string().optional(), // JSON stringified passage highlights
    }),
    
    // Aggregated test history stats
    testHistory: i.entity({
      userId: i.string(),
      subject: i.string(),
      testIndex: i.number(),
      lastAttemptDate: i.string(), // ISO date string
      bestScore: i.number(),
      attemptCount: i.number(),
    }),
    
    // In-progress test state (for resuming tests)
    testState: i.entity({
      userId: i.string(),
      subject: i.string(),
      testIndex: i.number(),
      currentQuestionIndex: i.number(),
      answers: i.string(), // JSON stringified object
      marked: i.string(), // JSON stringified object
      timeLeft: i.number(), // seconds remaining
      startedAt: i.string(), // ISO date string
    }),
  },
  
  links: {
    // Link highlights to attempts
    attemptHighlights: i.link('testAttempts', 'testHighlights', 'attemptId'),
  },
});

export default schema;

