exports.send = async (phone, message) => {
  // Integrate with SMS gateway API
  console.log(`[SMS] Sending to ${phone}: ${message}`);
  return true;
};
