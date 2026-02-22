/**
 * Middleware to assign session context for A/B testing and personalization.
 * Adds req.sessionContext = { bucket: 'A' | 'B' }
 */
const sessionContext = (req, res, next) => {
  // Check for existing session ID or generate one (simplified)
  const sessionId = req.headers["x-session-id"] || "default";

  // Simple deterministic bucket assignment based on session ID hash (or random)
  // charCodeAt(0) % 2 === 0 ? 'A' : 'B'
  const bucket = sessionId.charCodeAt(0) % 2 === 0 ? "A" : "B";

  req.sessionContext = {
    sessionId,
    bucket,
    timestamp: Date.now(),
  };

  next();
};

module.exports = sessionContext;
