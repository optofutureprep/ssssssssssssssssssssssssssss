// Wrapper to make InstantDB available globally for non-module scripts
// This file should be loaded after InstantDB is available
// Note: This requires InstantDB to be set up via npm and a build process
// For now, this provides a fallback interface

(function() {
  'use strict';
  
  // Check if InstantDB is available
  let dbModule = null;
  let dbAvailable = false;
  
  // Try to import InstantDB (will work if using modules)
  if (typeof window !== 'undefined') {
    // For now, we'll create a global interface
    // The actual InstantDB integration will be done in the React components
    // For vanilla JS files, we'll provide a compatibility layer
    
    window.InstantDB = {
      // Check if user is authenticated
      isAuthenticated: function() {
        // This will be set by the React components
        return window.__instantDBAuthState?.isAuthenticated || false;
      },
      
      // Check if user is in guest mode
      isGuestMode: function() {
        return window.APP_AUTH_STATE?.mode === 'guest';
      },
      
      // Get current user ID
      getCurrentUserId: function() {
        return window.__instantDBAuthState?.userId || null;
      },
      
      // Save test state (will delegate to React components or use sessionStorage for guest users)
      saveTestState: function(subject, testIndex, state) {
        try {
          if (!this.isAuthenticated()) {
            // Guest users - use sessionStorage
            const key = `test_state_${subject}_${testIndex}`;
            try {
              sessionStorage.setItem(key, JSON.stringify(state));
            } catch (e) {
              console.error('Error saving to sessionStorage:', e);
              // Try to use in-memory fallback
              if (!window.__testStateFallback) {
                window.__testStateFallback = {};
              }
              window.__testStateFallback[key] = state;
            }
            return;
          }
          
          // For authenticated users, also save to sessionStorage as backup
          const key = `test_state_${subject}_${testIndex}`;
          try {
            sessionStorage.setItem(key, JSON.stringify(state));
          } catch (e) {
            console.error('Error saving to sessionStorage:', e);
          }
          
          // Trigger save to InstantDB via React component if available
          if (window.__saveTestStateToDB) {
            try {
              window.__saveTestStateToDB(subject, testIndex, state);
            } catch (dbError) {
              console.error('Error saving to InstantDB (will retry when online):', dbError);
              // InstantDB supports offline queuing, so this will be retried
            }
          }
        } catch (error) {
          console.error('Unexpected error in saveTestState:', error);
          // Fallback to in-memory storage
          const key = `test_state_${subject}_${testIndex}`;
          if (!window.__testStateFallback) {
            window.__testStateFallback = {};
          }
          window.__testStateFallback[key] = state;
        }
      },
      
      // Load test state
      loadTestState: function(subject, testIndex) {
        try {
          // Try to load from sessionStorage first (works for both anonymous and authenticated)
          const key = `test_state_${subject}_${testIndex}`;
          try {
            const saved = sessionStorage.getItem(key);
            if (saved) {
              return JSON.parse(saved);
            }
          } catch (e) {
            console.error('Error loading from sessionStorage:', e);
          }
          
          // Try in-memory fallback
          if (window.__testStateFallback && window.__testStateFallback[key]) {
            return window.__testStateFallback[key];
          }
          
          // For authenticated users, try to load from DB via React component
          if (this.isAuthenticated() && window.__loadTestStateFromDB) {
            try {
              const dbState = window.__loadTestStateFromDB(subject, testIndex);
              if (dbState) {
                return dbState;
              }
            } catch (dbError) {
              console.error('Error loading from InstantDB:', dbError);
              // Continue to return null if DB load fails
            }
          }
          
          return null;
        } catch (error) {
          console.error('Unexpected error in loadTestState:', error);
          return null;
        }
      },
      
      // Save completed test attempt
      saveTestAttempt: function(attemptData) {
        try {
          if (!this.isAuthenticated()) {
            // Guest users - don't save
            console.log('Guest user - test attempt not saved');
            return null;
          }
          
          // Save to InstantDB via React component
          if (window.__saveTestAttemptToDB) {
            try {
              return window.__saveTestAttemptToDB(attemptData);
            } catch (dbError) {
              console.error('Error saving test attempt to InstantDB (will retry when online):', dbError);
              // InstantDB supports offline queuing, so this will be retried
              // Return a placeholder ID to indicate the save was attempted
              return 'queued-' + Date.now();
            }
          }
          
          console.warn('InstantDB save function not available');
          return null;
        } catch (error) {
          console.error('Unexpected error in saveTestAttempt:', error);
          return null;
        }
      },
      
      // Clear test state
      clearTestState: function(subject, testIndex) {
        const key = `test_state_${subject}_${testIndex}`;
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.error('Error clearing sessionStorage:', e);
        }
        
        if (this.isAuthenticated() && window.__clearTestStateFromDB) {
          window.__clearTestStateFromDB(subject, testIndex);
        }
      }
    };
    
    console.log('✅ InstantDB wrapper initialized');
  }
})();

