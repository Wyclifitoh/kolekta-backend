const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const validator = require('validator');
const generateUid = require('../utils/utils');


// Register new user
exports.register = async (req, res) => {
  const { first_name, last_name, phone_number, email, profile_photo, password, role } = req.body;
  const uid = generateUid();
  // Check if required fields exist in the request body
  if (!first_name || typeof first_name !== 'string') {
    return res.status(400).json({ message: 'First name is required and must be a string.' });
  }
  if (!phone_number || typeof phone_number !== 'string') {
    return res.status(400).json({ message: 'Phone number is required and must be a string.' });
  }
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required and must be a string.' });
  }

  // Additional validation for email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // Check if the password is provided
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    // Check if user already exists
    const user = await User.findUserByEmail(email);
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = await User.createUser({ uid, first_name, last_name, phone_number, email, profile_photo, password: hashedPassword, role });

    const payload = { id: newUser.insertId, email: newUser.email, role: newUser.role, status: newUser.status };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: newUser.insertId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
    await User.saveRefreshToken(newUser.insertId, refreshToken);
    // Return token and user details
    res.status(200).json({
      message: 'Registration successfull',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: newUser.insertId,
        first_name: first_name,
        last_name: last_name,
        phone_number: phone_number,
        email: email,
        profile_photo: profile_photo,
        role: role,
        status: newUser.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// User login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required.' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'User with provided email does not exist' });
    }

    if (!user.is_active) {
      return res.status(400).json({ message: 'Account not active' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Wrong password!!!' });
    }

    // Generate tokens
    const payload = { id: user.id, email: user.email_address, role: user.role, status: user.is_active };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
    const redirect = '';
    const site_url = '';

    await User.saveRefreshToken(user.id, refreshToken);
    res.json({
      message: 'Login successfull!!',
      access_token: accessToken,
      refresh_token: refreshToken,
      redirect: redirect,
      site_url: site_url,
      user: {
        id: user.id,
        user_name: user.first_name,
        email: user.email_address,
        role: user.role,
        status: user.is_active,
        phone_number: user.phone_number
      }
    });

  } catch (error) {
    res.status(500).send({message: `Server error}`, error: error.message});
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'User with this email does not exist' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpire = Date.now() + 3600000; // 1 hour expiration

    // Save the token and expiration to the user's record
    await User.updateResetToken(email, resetToken, resetTokenExpire);

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `You are receiving this email because you requested a password reset. Please visit the following link to reset your password: ${resetUrl}`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ msg: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(500).send(`Server error: ${error.message}`);
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user with the reset token
    const user = await User.findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    await User.updatePassword(user.email, hashedPassword);

    res.status(200).json({ message: 'Password successfully reset' });
  } catch (error) {
    res.status(500).send(`Server error: ${error.message}`);
  }
};

// Refresh Token Route
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Check if the refresh token is valid and stored in the database
    const userRefreshToken = await User.findRefreshTokenById(decoded.id);
    if (!userRefreshToken || userRefreshToken.refresh_token !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findUserById(decoded.id);
    // Generate new access token
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ access_token: accessToken });

  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

exports.logout = async (req, res) => {

  try {
    const user_id = req.user.id;
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const result = await User.deleteToken(user_id, refresh_token);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Token not found' });
    }

    return res.status(200).json({ message: 'Logout successful' });

  } catch (error) {
    res.status(500).json({ message: `Internal server error: ${error}` });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.query;
    const user_id = req.user.id;
    const email = req.user.email;

    if (!current_password) {
      return res.status(400).json({ message: 'Current password is required.' });
    }

    if (!new_password) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'User with provided email does not exist' });
    }

    // Check if the current password matches the stored password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }
    console.log(current_password, new_password)
    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update the user's password in the database
    const [result] = await User.updateUserPassword(user_id, hashedNewPassword);

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'User not found or no changes made.' });
    }

    return res.status(200).json({
      message: 'Password updated successfully.',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        email: user.email,
        profile_photo: user.profile_photo,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: `Error updating password: ${error.message}` });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { first_name, last_name, phone_number } = req.query;
    const user_id = req.user.id;
    const email = req.user.email;
    // Check if required fields exist in the request body
    if (!first_name || typeof first_name !== 'string') {
      return res.status(400).json({ error: 'Farm name is required and must be a string.' });
    }
    if (!phone_number || typeof phone_number !== 'string') {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const [result] = await User.updateUser(user_id, { first_name, last_name, phone_number });

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'User not found or no changes made.' });
    }

    const user = await User.findUserByEmail(email);

    return res.status(200).json(
      {
        message: 'Profile updated successfully.',
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          email: user.email,
          profile_photo: user.profile_photo,
          role: user.role,
          status: user.status
        }
      });

  } catch (error) {
    res.status(500).json({ error: `Error updating farm: ${error}` })
  }
};