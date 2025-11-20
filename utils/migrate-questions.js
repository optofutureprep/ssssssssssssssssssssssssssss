// Migration script to populate test questions in InstantDB
// This script extracts questions from script.js and saves them to InstantDB
// Run this once to migrate all questions to the database

import { db } from './db.js';

// This will be populated from script.js
// For now, we'll create a function that can be called with the allTestData object
export async function migrateQuestions(allTestData) {
  const transactions = [];
  
  for (const [subject, tests] of Object.entries(allTestData)) {
    tests.forEach((test, testIndex) => {
      test.forEach((question, questionIndex) => {
        const questionId = db.id();
        transactions.push(
          db.tx.testQuestions[questionId].update({
            subject,
            testIndex,
            questionIndex,
            stem: question.stem || '',
            choices: question.c || [],
            correctAnswer: question.a !== undefined ? question.a : -1,
          })
        );
      });
    });
  }
  
  // Batch transactions in chunks of 100 to avoid overwhelming the database
  const chunkSize = 100;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    db.transact(chunk);
    console.log(`Migrated ${Math.min(i + chunkSize, transactions.length)} of ${transactions.length} questions`);
  }
  
  console.log('Migration complete!');
}

// Note: This script should be run manually after importing allTestData from script.js
// Example usage (in a separate file or browser console):
// import { migrateQuestions } from './migrate-questions.js';
// import { allTestData } from './script.js';
// await migrateQuestions(allTestData);

