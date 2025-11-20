// InstantDB database initialization and service layer
import { init } from '@instantdb/react';
import schema from './instant.schema';

// Initialize InstantDB with app ID
export const db = init({
  appId: '18a93a08-3f4f-4e5d-b92a-9663650d0961',
  schema,
});

// Export auth functions
export const { useAuth, Auth, useQuery } = db;

// Helper function to get current user ID
export function getCurrentUserId() {
  const auth = db.auth.getState();
  return auth?.user?.id || null;
}

// Helper function to check if user is authenticated
export function isAuthenticated() {
  const auth = db.auth.getState();
  return !!auth?.user?.id;
}

// Save in-progress test state (authenticated users only)
export function saveTestState(subject, testIndex, state) {
  try {
    if (!isAuthenticated()) {
      // For anonymous users, use sessionStorage
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('No user ID available for saving test state');
      // Fallback to sessionStorage
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
      return;
    }

    // Check if state already exists
    let existing = null;
    try {
      existing = db.query({
        testState: {
          $: {
            where: {
              userId: { $eq: userId },
              subject: { $eq: subject },
              testIndex: { $eq: testIndex },
            },
          },
        },
      });
    } catch (queryError) {
      console.error('Error querying test state:', queryError);
      // Fallback to sessionStorage
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
      return;
    }

    const stateData = {
      userId,
      subject,
      testIndex,
      currentQuestionIndex: state.current || 0,
      answers: JSON.stringify(state.answers || {}),
      marked: JSON.stringify(state.marked || {}),
      timeLeft: state.timeLeft || 0,
      startedAt: state.startedAt || new Date().toISOString(),
    };

    try {
      if (existing.testState && existing.testState.length > 0) {
        // Update existing state
        db.transact([
          db.tx.testState[existing.testState[0].id].update(stateData),
        ]);
      } else {
        // Create new state
        db.transact([
          db.tx.testState[db.id()].update(stateData),
        ]);
      }
      
      // Also save to sessionStorage as backup
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (transactError) {
      console.error('Error saving test state to InstantDB:', transactError);
      // Fallback to sessionStorage
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
    }
  } catch (error) {
    console.error('Unexpected error in saveTestState:', error);
    // Always fallback to sessionStorage
    try {
      const key = `test_state_${subject}_${testIndex}`;
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (storageError) {
      console.error('Failed to save to sessionStorage:', storageError);
    }
  }
}

// Load in-progress test state (authenticated users only)
// Note: This should be used with useQuery hook in React components
// For non-React code, use the query directly
export function loadTestStateQuery(subject, testIndex) {
  if (!isAuthenticated()) {
    return null;
  }

  const userId = getCurrentUserId();
  if (!userId) return null;

  return {
    testState: {
      $: {
        where: {
          userId: { $eq: userId },
          subject: { $eq: subject },
          testIndex: { $eq: testIndex },
        },
      },
    },
  };
}

// Helper to parse loaded test state
export function parseTestState(stateData) {
  if (!stateData || !stateData.testState || stateData.testState.length === 0) {
    return null;
  }

  const state = stateData.testState[0];
  return {
    current: state.currentQuestionIndex,
    answers: JSON.parse(state.answers || '{}'),
    marked: JSON.parse(state.marked || '{}'),
    timeLeft: state.timeLeft,
    startedAt: state.startedAt,
  };
}

// Save completed test attempt (authenticated users only)
export function saveTestAttempt(attemptData) {
  try {
    if (!isAuthenticated()) {
      // Anonymous users - don't save
      console.log('Anonymous user - test attempt not saved to database');
      return null;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('No user ID available for saving test attempt');
      return null;
    }

    const attempt = {
      userId,
      subject: attemptData.subject,
      testIndex: attemptData.testIndex,
      score: attemptData.score,
      correct: attemptData.correct,
      total: attemptData.total,
      date: attemptData.date || new Date().toISOString(),
      userAnswers: JSON.stringify(attemptData.userAnswers || {}),
      markedQuestions: JSON.stringify(attemptData.markedQuestions || {}),
      totalTimeSeconds: attemptData.totalTimeSeconds || 0,
      avgTimePerQuestionSeconds: attemptData.avgTimePerQuestionSeconds || 0,
    };

    const attemptId = db.id();
    
    try {
      db.transact([
        db.tx.testAttempts[attemptId].update(attempt),
      ]);

      // Save highlights if provided
      if (attemptData.highlights) {
        try {
          const highlightTxs = Object.keys(attemptData.highlights).map((key) => {
            const parts = key.split('-');
            if (parts.length >= 3) {
              const qIdx = parseInt(parts[parts.length - 1]);
              if (!isNaN(qIdx)) {
                return db.tx.testHighlights[db.id()].update({
                  attemptId,
                  questionIndex: qIdx,
                  highlightData: JSON.stringify(attemptData.highlights[key]),
                  passageHighlights: attemptData.passageHighlights?.[key] || null,
                });
              }
            }
            return null;
          }).filter(tx => tx !== null);
          
          if (highlightTxs.length > 0) {
            db.transact(highlightTxs);
          }
        } catch (highlightError) {
          console.error('Error saving highlights:', highlightError);
          // Continue even if highlights fail
        }
      }

      // Update test history (non-blocking)
      try {
        updateTestHistory(userId, attemptData.subject, attemptData.testIndex, attemptData.score);
      } catch (historyError) {
        console.error('Error updating test history:', historyError);
        // Continue even if history update fails
      }

      return attemptId;
    } catch (transactError) {
      console.error('Error saving test attempt to InstantDB:', transactError);
      // InstantDB supports offline queuing, so the transaction will be retried
      // when connection is restored
      return attemptId; // Return ID even if transaction is queued
    }
  } catch (error) {
    console.error('Unexpected error in saveTestAttempt:', error);
    return null;
  }
}

// Update test history stats
async function updateTestHistory(userId, subject, testIndex, score) {
  // Query existing history
  const query = {
    testHistory: {
      $: {
        where: {
          userId: { $eq: userId },
          subject: { $eq: subject },
          testIndex: { $eq: testIndex },
        },
      },
    },
  };

  // Use db.query for synchronous query (if available) or handle async
  try {
    const existing = db.query(query);
    const now = new Date().toISOString();

    if (existing.testHistory && existing.testHistory.length > 0) {
      const history = existing.testHistory[0];
      db.transact([
        db.tx.testHistory[history.id].update({
          lastAttemptDate: now,
          bestScore: Math.max(history.bestScore || 0, score),
          attemptCount: (history.attemptCount || 0) + 1,
        }),
      ]);
    } else {
      db.transact([
        db.tx.testHistory[db.id()].update({
          userId,
          subject,
          testIndex,
          lastAttemptDate: now,
          bestScore: score,
          attemptCount: 1,
        }),
      ]);
    }
  } catch (error) {
    console.error('Error updating test history:', error);
  }
}

// Get user's test history query (for use with useQuery hook)
export function getUserTestHistoryQuery(subject, testIndex) {
  if (!isAuthenticated()) {
    return null;
  }

  const userId = getCurrentUserId();
  if (!userId) return null;

  return {
    testAttempts: {
      $: {
        where: {
          userId: { $eq: userId },
          subject: { $eq: subject },
          testIndex: { $eq: testIndex },
        },
        order: { date: 'desc' },
      },
    },
    testHistory: {
      $: {
        where: {
          userId: { $eq: userId },
          subject: { $eq: subject },
          testIndex: { $eq: testIndex },
        },
      },
    },
  };
}

// Get specific test attempt query (for use with useQuery hook)
export function getTestAttemptQuery(attemptId) {
  if (!isAuthenticated()) {
    return null;
  }

  const userId = getCurrentUserId();
  if (!userId) return null;

  return {
    testAttempts: {
      $: {
        where: {
          id: { $eq: attemptId },
          userId: { $eq: userId },
        },
      },
    },
    testHighlights: {
      $: {
        where: {
          attemptId: { $eq: attemptId },
        },
      },
    },
  };
}

// Get test questions query (for use with useQuery hook)
export function getTestQuestionsQuery(subject, testIndex) {
  return {
    testQuestions: {
      $: {
        where: {
          subject: { $eq: subject },
          testIndex: { $eq: testIndex },
        },
        order: { questionIndex: 'asc' },
      },
    },
  };
}

// Clear test state (for reset)
export async function clearTestState(subject, testIndex) {
  if (!isAuthenticated()) {
    const key = `test_state_${subject}_${testIndex}`;
    sessionStorage.removeItem(key);
    return;
  }

  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    const query = {
      testState: {
        $: {
          where: {
            userId: { $eq: userId },
            subject: { $eq: subject },
            testIndex: { $eq: testIndex },
          },
        },
      },
    };

    const existing = db.query(query);

    if (existing.testState && existing.testState.length > 0) {
      db.transact([
        db.tx.testState[existing.testState[0].id].delete(),
      ]);
    }
  } catch (error) {
    console.error('Error clearing test state:', error);
  }
}

export default db;

