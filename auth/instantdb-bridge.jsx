// Bridge component to integrate InstantDB with React components
// This provides InstantDB functionality to components that can't use ES modules directly

(function() {
  'use strict';
  
  if (typeof window.InstantDBBridge !== 'undefined') {
    return; // Already loaded
  }
  
  const { useState, useEffect } = React;
  
  // Create a bridge that provides InstantDB functionality
  // This will be populated when InstantDB is properly loaded
  window.InstantDBBridge = {
    // Auth state
    authState: {
      user: null,
      isAuthenticated: false,
      isLoading: true
    },
    
    // Test attempts cache
    testAttemptsCache: {},
    
    // Initialize - this should be called when InstantDB is ready
    init: function(dbModule) {
      this.db = dbModule;
      console.log('✅ InstantDB Bridge initialized');
    },
    
    // Get test attempts for a subject and test index
    getTestAttempts: function(subject, testIndex) {
      const cacheKey = `${subject}-${testIndex}`;
      
      // Return cached data if available
      if (this.testAttemptsCache[cacheKey]) {
        return this.testAttemptsCache[cacheKey];
      }
      
      // For now, return empty array - will be populated by React components using useQuery
      return [];
    },
    
    // Set test attempts (called by React components)
    setTestAttempts: function(subject, testIndex, attempts) {
      const cacheKey = `${subject}-${testIndex}`;
      this.testAttemptsCache[cacheKey] = attempts;
    },
    
    // Update auth state (called by React components)
    updateAuthState: function(authState) {
      this.authState = authState;
      
      // Update global InstantDB wrapper
      if (window.InstantDB) {
        window.__instantDBAuthState = {
          isAuthenticated: !!authState.user,
          userId: authState.user?.id || null
        };
      }
    }
  };
  
  // React component that wraps InstantDB functionality
  window.InstantDBProvider = function({ children }) {
    const [authState, setAuthState] = useState({
      user: null,
      isAuthenticated: false,
      isLoading: true
    });
    
    // Try to load InstantDB if available
    useEffect(() => {
      // Check if db.js is available (would need to be loaded as module)
      // For now, we'll use the wrapper approach
      if (window.InstantDBBridge) {
        window.InstantDBBridge.updateAuthState(authState);
      }
    }, [authState]);
    
    // Provide auth state to children via context-like pattern
    React.Children.forEach(children, child => {
      if (React.isValidElement(child)) {
        // Pass auth state as props if child accepts it
        // This is a simplified approach - in a real app you'd use Context
      }
    });
    
    return children;
  };
  
  console.log('✅ InstantDB Bridge loaded');
})();

