exports.send = async (email, subject, body) => {
  // Integrate with Nodemailer or email API
  console.log(`[Mail] Sending to ${email}: ${subject}`);
  return true;
};
