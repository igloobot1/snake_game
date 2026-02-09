// Auto-play bot + frame capture via CDP screencast
// Run this injected into the game page

// Simple snake AI: chase food, avoid walls and self
(function() {
  // Override the game to add auto-play
  const canvas = document.getElementById('game');
  
  // Start the game by clicking overlay
  document.getElementById('overlay').click();
  
  // Inject auto-play: dispatch arrow key events based on simple AI
  function getGameState() {
    // We need to read from the game's closure... let's patch it differently
    // Instead, let's modify game.js to expose state
  }
  
  // Simpler: just dispatch random valid moves periodically
  const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  let lastDir = 'ArrowRight';
  
  setInterval(() => {
    // Simple strategy: change direction randomly but don't reverse
    const opposite = { ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };
    const valid = dirs.filter(d => d !== opposite[lastDir]);
    const pick = valid[Math.floor(Math.random() * valid.length)];
    lastDir = pick;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: pick }));
  }, 200);
  
  // Auto-restart on game over
  setInterval(() => {
    const overlay = document.getElementById('overlay');
    if (!overlay.classList.contains('hidden')) {
      setTimeout(() => overlay.click(), 500);
    }
  }, 1000);
})();
