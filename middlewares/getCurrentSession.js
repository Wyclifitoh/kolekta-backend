let currentSessionId = null;

const setCurrentSession = (sessionId) => {
  currentSessionId = sessionId;
};

const getCurrentSessionId = () => currentSessionId;

module.exports = { setCurrentSession, getCurrentSessionId };