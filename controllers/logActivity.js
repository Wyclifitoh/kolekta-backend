const pool = require("../config/db");
const { getCurrentSessionId } = require("../middlewares/getCurrentSession");

const logCasefileActivity = async (
  userId,
  cfid,
  actionType,
  details = null,
) => {
  const sessionId = getCurrentSessionId();

  try {
    await pool.query(
      `INSERT INTO casefile_activity_log 
       (user_id, session_id, cfid, action_type, action_details) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        sessionId,
        cfid,
        actionType,
        details ? JSON.stringify(details) : null,
      ],
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

module.exports = { logCasefileActivity };
