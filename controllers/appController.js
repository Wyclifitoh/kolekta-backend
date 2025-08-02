const App = require('../models/App');
const User = require('../models/User');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const upload = require('../middlewares/upload');
const crypto = require('crypto');
const generateUid = require('../utils/utils');
const moment = require('moment');
const { validateDate, formatDate, DATE_FORMAT } = require('../utils/dateUtils');
const pool = require('../config/db');
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com',
        pass: 'your_email_password',
    },
});

exports.addClient = async (req, res) => {
    const {
        name,
        abbreviation,
        client_type,
        team_leader_id,
        paybill,
        general_target,
        contacts
    } = req.body;

    try {
        const userID = req.user.id;
        if (!userID) {
            return res.status(401).json({ message: 'User not authenticated.' });
        }

        if (!name || !client_type) {
            return res.status(400).json({ message: 'Name and client type are required.' });
        }

        // Insert client into database
        const [clientResult] = await db.query(
            'INSERT INTO clients (name, abbreviation, client_type, team_leader_id, paybill, general_target) VALUES (?, ?, ?, ?, ?, ?)',
            [name, abbreviation, client_type, team_leader_id, paybill, general_target]
        );
        const clientID = clientResult.insertId;

        // Insert contact persons if provided
        if (contacts && contacts.length > 0) {
            const contactValues = contacts.map(contact => [
                clientID,
                contact.name,
                contact.designation,
                contact.branch_department,
                contact.phone,
                contact.email
            ]);

            await db.query(
                'INSERT INTO client_contacts (client_id, name, designation, branch_department, phone, email) VALUES ?;',
                [contactValues]
            );
        }

        res.status(200).json({ message: 'Client created successfully', clientID });
    } catch (error) {
        res.status(500).json({ message: `Error creating client: ${error}` });
    }
};




































































exports.addUser = async (req, res) => {
    try {
        const { name, phone_number, email, password, role } = req.body;

        if (!name || typeof name !== 'string') {
            return res.status(400).json({ message: 'User name is required.' });
        }
        if (!phone_number || typeof phone_number !== 'string') {
            return res.status(400).json({ message: 'Phone number is required.' });
        }
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required.' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        if (!password) {
            return res.status(400).json({ message: "Password is required." });
        }

        const user = await User.findUserByEmail(email);
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Create a new user  
        const newUser = await User.createUser({ name, email, password: hashedPassword, role, contact_info: phone_number });
        return res.status(200).json({ message: "User added successfully" });

    } catch (error) {
        return res.status(500).json({ error: `Error adding new user: ${error}` });
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const { status } = req.query;
        const userID = req.user.id;

        const users = await App.getAllUsers(status);
       
        if (users.length === 0) {
            return res.status(404).json({ message: 'Users not found' });
        }
      
        res.status(200).json({ users });

    } catch (error) {
        res.status(500).json({ error: `Error fetching users: ${error}` })
    }
}

exports.getUserById = async (req, res) => {
    try {
        const { user_id } = req.query;

        const user = await App.getUserByID(user_id);
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: `Error getting user details: ${error}` });
    }
}

exports.updateUserDetails = async (req, res) => {

    const {
        user_id, name, phone_number, email, role
    } = req.body;

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'User name is required.' });
    }
    if (!phone_number || typeof phone_number !== 'string') {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required.' });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {

        const updateData = {
            name,
            email,
            role,
            contact_info: phone_number
        };

        const affectedRows = await App.updateUser(user_id, updateData);

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'User not found or no changes made.' });
        }

        res.status(200).json({ message: 'User details updated successfully.' });

    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(500).json({ message: `An error occurred while updating user details: ${error}` });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { user_id, status } = req.body;
        const auth_user_id = req.user.id;
        const email = req.user.email;
        const user_type = req.user.role;

        if (user_type != 'admin') {
            return res.status(400).json({ message: 'Not authorized to update employee profile' });
        }

        if (!user_id || !status) {
            return res.status(400).json({ message: "Employee ID is required" });
        }

        const [result] = await App.updateUserStatus(user_id, status);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Employee updated successfully.' });
        } else {
            res.status(404).json({ message: 'Employee not found.' });
        }

    } catch (error) {
        res.status(500).json({ error: `Error updated employee: ${error}` })
    }
}

exports.deleteUser = async (req, res) => {
    try {
        const { user_id } = req.body;
        const auth_user_id = req.user.id;
        const email = req.user.email;
        const user_type = req.user.role;

        if (user_type != 'admin') {
            return res.status(400).json({ message: 'Not authorized to delete employee profile' });
        }

        if (!user_id) {
            return res.status(400).json({ message: 'Employee ID is required.' });
        }
        const [result] = await App.deleteUser(user_id);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Employee not found or no changes made.' });
        }

        return res.status(200).json(
            {
                message: 'Employee removed successfully.',
            });

    } catch (error) {
        res.status(500).json({ error: `Error removing employee: ${error}` })
    }
}

exports.addNewCow = async (req, res) => {
    const {
        name, breed, gender, dob, weight,
        tag_number, lactation_stage, pregnancy_status,
        last_calving_date, dam_id, sire_id, acquisition_date
    } = req.body;

    if (dam_id && !(await isValidCowID(dam_id))) {
        return res.status(400).json({ message: 'Invalid Dam ID' });
    }
    if (sire_id && !(await isValidCowID(sire_id))) {
        return res.status(400).json({ message: 'Invalid Sire ID' });
    }

    try {
        const tagId = generateRandomTagId();

        if (!name || !breed || !gender || !acquisition_date || !weight || !tag_number || !dob) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        const { valid: isAcquisitionDateValid, message: acquisitionDateMessage, formattedDate: formattedAcquisitionDate } = validateAcquisitionDate(acquisition_date);
        if (!isAcquisitionDateValid) {
            return res.status(400).json({ message: acquisitionDateMessage });
        }

        const { valid: isDobValid, message: dobMessage, formattedDate: formattedDob } = validateDob(dob);
        if (!isDobValid) {
            return res.status(400).json({ message: dobMessage });
        }

        const { valid: isLastCalvingValid, message: lastClavingDateMessage, formattedDate: formattedLastCalvingDate } = validateLastCalvingDate(last_calving_date);
        let lastCalvingDate = last_calving_date;
        if (last_calving_date) {
            lastCalvingDate = formattedLastCalvingDate;
            if (!isLastCalvingValid) {
                return res.status(400).json({ message: lastClavingDateMessage });
            }
        }

        const cowData = {
            name,
            breed,
            gender,
            dob: formattedDob,
            weight,
            tag_number,
            tag_id: tagId,
            lactation_stage,
            pregnancy_status,
            last_calving_date: lastCalvingDate,
            dam_id,
            sire_id,
            acquisition_date: formattedAcquisitionDate
        };

        const result = await App.addCow(cowData);

        res.status(200).json({
            message: 'Cow addedd successfully.'
        });
    } catch (error) {
        res.status(500).json({ message: `Error adding cow: ${error}` });
    }

}

exports.getAllCows = async (req, res) => {
    try {
        const { status } = req.query;

        const cows = await App.getAllCows(status);

        if (!cows || cows.length === 0) {
            return res.status(404).json({ message: 'No cows found.', cows });
        }

        res.status(200).json({
            message: 'Cows retrieved successfully.',
            cows
        });
    } catch (error) {
        console.error('Error fetching cows:', error);
        res.status(500).json({ message: `An error occurred while fetching cows: ${error}` });
    }
};

exports.getCowDetails = async (req, res) => {
    try {
        const { cow_id } = req.query;

        if (!cow_id) {
            return res.status(400).json({ message: 'Cow ID is required.' });
        }

        const cow = await App.getCowById(cow_id);

        if (!cow) {
            return res.status(404).json({ message: 'Cow not found.' });
        }

        res.status(200).json({
            message: 'Cow details retrieved successfully.',
            cow
        });

    } catch (error) {
        console.error('Error fetching cow details:', error);
        res.status(500).json({ message: `An error occurred while fetching cow details: ${error}` });
    }
};

exports.updateCowDetails = async (req, res) => {

    const {
        cow_id, name, breed, gender, dob, weight, lactation_stage,
        pregnancy_status, last_calving_date, dam_id, sire_id, acquisition_date
    } = req.body;

    if (dam_id && !(await isValidCowID(dam_id))) {
        return res.status(400).json({ message: 'Invalid Dam ID' });
    }
    if (sire_id && !(await isValidCowID(sire_id))) {
        return res.status(400).json({ message: 'Invalid Sire ID' });
    }

    if (!cow_id || !name || !breed || !gender || !acquisition_date || !weight || !dob) {
        return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const { valid: isAcquisitionDateValid, message: acquisitionDateMessage, formattedDate: formattedAcquisitionDate } = validateAcquisitionDate(acquisition_date);
    if (!isAcquisitionDateValid) {
        return res.status(400).json({ message: acquisitionDateMessage });
    }

    const { valid: isDobValid, message: dobMessage, formattedDate: formattedDob } = validateDob(dob);
    if (!isDobValid) {
        return res.status(400).json({ message: dobMessage });
    }

    const { valid: isLastCalvingValid, message: lastClavingDateMessage, formattedDate: formattedLastCalvingDate } = validateLastCalvingDate(last_calving_date);
    let lastCalvingDate = last_calving_date;
    if (last_calving_date) {
        lastCalvingDate = formattedLastCalvingDate;
        if (!isLastCalvingValid) {
            return res.status(400).json({ message: lastClavingDateMessage });
        }
    }


    try {

        const updateData = {
            name,
            breed,
            gender,
            dob: formattedDob,
            weight,
            lactation_stage,
            pregnancy_status,
            last_calving_date: lastCalvingDate,
            dam_id,
            sire_id,
            acquisition_date: formattedAcquisitionDate
        };

        const affectedRows = await App.updateCow(cow_id, updateData);

        if (affectedRows === 0) {
            return res.status(404).json({ message: 'Cow not found or no changes made.' });
        }

        res.status(200).json({ message: 'Cow details updated successfully.' });

    } catch (error) {
        console.error('Error updating cow details:', error);
        res.status(500).json({ message: `An error occurred while updating cow details: ${error}` });
    }
};

exports.removeCow = async (req, res) => {
    try {
        const { cow_id, status } = req.body;
        const auth_user_id = req.user.id;
        const email = req.user.email;
        const user_type = req.user.role;

        if (user_type != 'admin') {
            return res.status(400).json({ message: 'Not authorized to remove cow profile' });
        }

        if (!cow_id || !status) {
            return res.status(400).json({ message: "Cow ID is required" });
        }

        const [result] = await App.updateCowStatus(cow_id, status);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Cow removed successfully.' });
        } else {
            res.status(404).json({ message: 'Cow not found.' });
        }

    } catch (error) {
        res.status(500).json({ error: `Error removing cow: ${error}` })
    }
}

async function isValidCowID(id) {
    const [result] = await pool.query('SELECT COUNT(*) AS count FROM cows WHERE id = ?', [id]);
    return result[0].count > 0;
}

function generateRandomTagId() {
    return 'COW-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

const validateAcquisitionDate = (acquisition_date) => {
    const dateFormat = 'YYYY-MM-DD';
    const dateMoment = moment(acquisition_date, dateFormat, true);

    // Check if the acquisition_date is valid
    if (!dateMoment.isValid()) {
        return { valid: false, message: `Invalid acquisition date format. Expected: ${dateFormat}.` };
    }

    // Ensure the acquisition_date is not in the future
    if (dateMoment.isAfter(moment())) {
        return { valid: false, message: 'Acquisition date cannot be in the future.' };
    }

    return { valid: true, formattedDate: dateMoment.format(dateFormat) };
};

const validateDob = (dob) => {
    const dateFormat = 'YYYY-MM-DD';
    const dateMoment = moment(dob, dateFormat, true);

    // Check if the dob is valid
    if (!dateMoment.isValid()) {
        return { valid: false, message: `Invalid date of birth format. Expected: ${dateFormat}.` };
    }

    // Ensure the dob is not in the future
    if (dateMoment.isAfter(moment())) {
        return { valid: false, message: 'Date of birth cannot be in the future.' };
    }

    return { valid: true, formattedDate: dateMoment.format(dateFormat) };
};

const validateLastCalvingDate = (last_calving_date) => {
    const dateFormat = 'YYYY-MM-DD';
    const dateMoment = moment(last_calving_date, dateFormat, true);

    // Check if the last_calving_date is valid
    if (!dateMoment.isValid()) {
        return { valid: false, message: `Invalid last calving date format. Expected: ${dateFormat}.` };
    }

    // Ensure the last_calving_date is not in the future
    if (dateMoment.isAfter(moment())) {
        return { valid: false, message: 'Last calving date cannot be in the future.' };
    }

    return { valid: true, formattedDate: dateMoment.format(dateFormat) };
};

exports.updateCowStatus = async (req, res) => {

    const { cow_id, status } = req.body;
    const user_id = req.user.id;
    try {
        if (!user_id || !cow_id || !status) {
            return res.status(400).json({ error: "Cow & User ID is required" });
        }

        const [result] = await App.updateCowStatus(cow_id, status);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Cow updated successfully.' });
        } else {
            res.status(404).json({ message: 'Cow not found.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.addCowReduction = async (req, res) => {
    const { cow_id, reduction_reason, price, reduction_date, customer_name, description } = req.body;

    try {
        const userID = req.user.id;

        if (!cow_id || !reduction_reason || !reduction_date) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        const dateFormat = 'YYYY-MM-DD';
        const dateMoment = moment(reduction_date, dateFormat, true);

        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid Reduction Date format. Expected: ${dateFormat}.` });
        }

        if (dateMoment.isAfter(moment())) {
            return res.status(400).json({ message: 'Reduction date cannot be in the future.' });
        }

        const formattedDate = dateMoment.format(dateFormat);

        const reductionData = {
            cow_id,
            reduction_reason,
            price,
            reduction_date: formattedDate,
            customer_name,
            description,
            recorded_by: userID
        };

        const [result] = await App.addCowReduction(reductionData);

        // Checking if the reduction reason is 'sale' and handle income insertion
        if (reduction_reason === 'sale') {
            if (!price) {
                return res.status(400).json({ message: 'Price is required.' });
            }
            const decimalPrice = parseFloat(price);

            const incomeData = {
                name: 'Cow Sale',
                income_category_id: 2,
                quantity: 1,
                amount: decimalPrice,
                income_date: formattedDate,
                description,
                recorded_by: userID
            };

            await App.addIncome(incomeData);
            await App.updateCowStatus(cow_id, 'sold');
        } else if (reduction_reason === 'death') {
            await App.updateCowStatus(cow_id, 'died');
        } else {
            await App.updateCowStatus(cow_id, 'other');
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Cow reduction recorded successfully.' });
            console.log('Cow reduction recorded successfully.');
        } else {
            res.status(400).json({ message: 'Failed to reduce cow from the App.' });
            console.log('Cow reduction recorded successfully.');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

exports.getAllCowReductions = async (req, res) => {
    try {

        const reductions = await App.getAllCowReduction();

        if (reductions.length === 0) {
            return res.status(404).json({ message: 'No reductions found.' });
        }
        console.error(reductions);
        res.status(200).json({ reductions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Server error: ${error}` });
    }
};

exports.milkProduction = async (req, res) => {
    const { cow_id, production_date, morning_milk, evening_milk, note } = req.body;

    try {
        const recorded_by = req.user.id;
        const userRole = req.user.role;

        if (!cow_id || !production_date || (!morning_milk && !evening_milk)) {
            return res.status(400).json({ message: 'All required fields must be provided.' });
        }

        const dateFormat = 'YYYY-MM-DD';
        const dateMoment = moment(production_date, dateFormat, true);

        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid production date format. Expected: ${dateFormat}.` });
        }

        if (dateMoment.isAfter(moment())) {
            return res.status(400).json({ message: 'Production date cannot be in the future.' });
        }

        const formattedDate = dateMoment.format(dateFormat);

        // Check if milk production for this cow already exists for the given date
        const existingMilkRecord = await App.checkMilkProductionExist(cow_id, formattedDate);

        if (!existingMilkRecord) {

            const productionData = {
                cow_id,
                production_date: formattedDate,
                morning_milk,
                evening_milk,
                note,
                recorded_by
            };

            const [result] = await App.milkProduction(productionData);

            return res.status(200).json({
                message: 'Milk recorded successfully.',
                milk_production_id: result.insertId
            });
        } else {
            // Record exists, check if it's already updated with both morning and evening milk
            if (existingMilkRecord.morning_milk !== '0.00' && existingMilkRecord.evening_milk !== '0.00') {
                if (userRole !== 'admin') {
                    // Non-admin users are not allowed to update milk once both morning and evening milk are recorded
                    return res.status(403).json({ message: 'Milk production for this cow and date is already complete. Only admins can update this record.' });
                } else {
                    // Admin is allowed to update
                    const updatedData = {
                        cow_id,
                        production_date: formattedDate,
                        morning_milk,
                        evening_milk,
                        note,
                        recorded_by
                    };

                    const [updateResult] = await App.updateMilkProduction(existingMilkRecord.id, updatedData);

                    return res.status(200).json({
                        message: 'Milk updated successfully.',
                        milk_production_id: updateResult.insertId
                    });
                }
            } else {
                // Morning or evening milk missing, proceed with adding the record
                const updatedData = {
                    cow_id,
                    production_date: formattedDate,
                    morning_milk,
                    evening_milk,
                    note,
                    recorded_by
                };

                const [updateResult] = await App.updateMilkProduction(existingMilkRecord.id, updatedData);

                return res.status(200).json({
                    message: 'Milk updated successfully.',
                    milk_production_id: updateResult.insertId
                });
            }
        }
    } catch (error) {
        console.log(`Error recording milk production: ${error}`);
        res.status(500).json({ error: `Error recording milk production: ${error}` });
    }
};

exports.getMilkProduction = async (req, res) => {
    try {

        const milk_production = await App.getMilkProduction();

        if (milk_production.length === 0) {
            return res.status(404).json({ message: 'No productions found.' });
        }
       
        res.status(200).json({ milk_production });
    } catch (error) { 
        res.status(500).json({ message: `Server error: ${error}` });
    }
};

exports.getMilkProductionByCowAndDate = async (req, res) => {
    const { cow_id, date } = req.params;
    const dateFormat = 'YYYY-MM-DD';

    try {
        const dateMoment = moment(date, dateFormat, true);
        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid date format. Expected: ${dateFormat}.` });
        }

        const formattedDate = dateMoment.format(dateFormat);

        // Fetch milk production data for the cow on the given date
        const milkProduction = await App.getMilkProductionByCowAndDate(cow_id, formattedDate);

        if (!milkProduction) {
            return res.status(404).json({ message: `No milk production record found for cow ID ${cow_id} on ${formattedDate}.` });
        }

        return res.status(200).json({
            message: 'Milk production record retrieved successfully.',
            milk_production: milkProduction
        });
    } catch (error) {
        console.log(`Error fetching milk production: ${error}`);
        return res.status(500).json({ error: `Error fetching milk production: ${error}` });
    }
};

exports.getMilkProductionReport = async (req, res) => {
    const { cow_id } = req.params;
    const { start_date, end_date } = req.query;

    const dateFormat = 'YYYY-MM-DD';

    try {
        const startMoment = moment(start_date, dateFormat, true);
        const endMoment = moment(end_date, dateFormat, true);

        if (!startMoment.isValid() || !endMoment.isValid()) {
            return res.status(400).json({ message: `Invalid date format. Expected: ${dateFormat}.` });
        }

        if (startMoment.isAfter(endMoment)) {
            return res.status(400).json({ message: 'Start date cannot be after end date.' });
        }

        const formattedStartDate = startMoment.format(dateFormat);
        const formattedEndDate = endMoment.format(dateFormat);

        // Fetch milk production data for the cow within the date range
        const milkProductionReport = await App.getMilkProductionReport(cow_id, formattedStartDate, formattedEndDate);

        if (!milkProductionReport || milkProductionReport.length === 0) {
            return res.status(404).json({ message: `No milk production records found for cow ID ${cow_id} between ${formattedStartDate} and ${formattedEndDate}.` });
        }

        return res.status(200).json({
            message: 'Milk production report retrieved successfully.',
            milk_production_report: milkProductionReport
        });
    } catch (error) {
        console.log(`Error fetching milk production report: ${error}`);
        return res.status(500).json({ error: `Error fetching milk production report: ${error}` });
    }
};

exports.getAllMilkProductionByDate = async (req, res) => {
    const { date } = req.params;
    const dateFormat = 'YYYY-MM-DD';

    try {
        const dateMoment = moment(date, dateFormat, true);
        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid date format. Expected: ${dateFormat}.` });
        }

        const formattedDate = dateMoment.format(dateFormat);

        // Fetch milk production data for all cows on the given date
        const milkProduction = await App.getAllMilkProductionByDate(formattedDate);

        if (!milkProduction || milkProduction.length === 0) {
            return res.status(404).json({ message: `No milk production records found on ${formattedDate}.` });
        }

        return res.status(200).json({
            message: 'Milk production records retrieved successfully.',
            milk_production: milkProduction
        });
    } catch (error) {
        console.log(`Error fetching milk production: ${error}`);
        return res.status(500).json({ error: `Error fetching milk production: ${error}` });
    }
};

exports.getAllMilkProductionReport = async (req, res) => {
    const { start_date, end_date } = req.query;
    const dateFormat = 'YYYY-MM-DD';

    try {
        const startMoment = moment(start_date, dateFormat, true);
        const endMoment = moment(end_date, dateFormat, true);

        if (!startMoment.isValid() || !endMoment.isValid()) {
            return res.status(400).json({ message: `Invalid date format. Expected: ${dateFormat}.` });
        }

        if (startMoment.isAfter(endMoment)) {
            return res.status(400).json({ message: 'Start date cannot be after end date.' });
        }

        const formattedStartDate = startMoment.format(dateFormat);
        const formattedEndDate = endMoment.format(dateFormat);

        // Fetch milk production data for all cows within the date range
        const milkProductionReport = await App.getAllMilkProductionReport(formattedStartDate, formattedEndDate);

        if (!milkProductionReport || milkProductionReport.length === 0) {
            return res.status(404).json({ message: `No milk production records found between ${formattedStartDate} and ${formattedEndDate}.` });
        }

        return res.status(200).json({
            message: 'Milk production report retrieved successfully.',
            milk_production_report: milkProductionReport
        });
    } catch (error) {
        console.log(`Error fetching milk production report: ${error}`);
        return res.status(500).json({ error: `Error fetching milk production report: ${error}` });
    }
};

exports.recordExpense = async (req, res) => {
    const { name, expense_category, unit, quantity_used, unit_price, expense_date, note } = req.body;
    const recorded_by = req.user.id;

    try {
        if (!name || !expense_category || !unit || !quantity_used || !unit_price || !expense_date || !recorded_by) {
            return res.status(400).json({ message: 'All fields must be provided.' });
        }

        const expenseData = { name, expense_category, unit, quantity_used, unit_price, expense_date, note, recorded_by };
        const [result] = await App.recordExpense(expenseData);

        return res.status(201).json({
            message: 'Expense recorded successfully.',
            expense_id: result.insertId
        });
    } catch (error) {
        console.log(`Error recording expense: ${error}`);
        return res.status(500).json({ message: `Error recording expense: ${error}` });
    }
};

exports.getAllExpenses = async (req, res) => {
    try {
        const expenses = await App.getAllExpenses();
        return res.status(200).json({
            message: 'Expenses retrieved successfully.',
            expenses
        });
    } catch (error) {
        console.log(`Error fetching expenses: ${error}`);
        return res.status(500).json({ error: `Error fetching expenses: ${error}` });
    }
};

exports.getExpenseById = async (req, res) => {
    const { expense_id } = req.query;

    try {
        const expense = await App.getExpenseById(expense_id);

        if (!expense) {
            return res.status(404).json({ message: `Expense with id ${expense_id} not found.` });
        }

        return res.status(200).json({
            message: 'Expense details retrieved successfully.',
            expense
        });
    } catch (error) {
        console.log(`Error fetching expense: ${error}`);
        return res.status(500).json({ error: `Error fetching expense: ${error}` });
    }
};

exports.updateExpense = async (req, res) => { 
    const { id, name, expense_category, unit, quantity_used, unit_price, expense_date, note } = req.body;
    const userRole = req.user.role;

    try {
        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admin can update expenses.' });
        }

        const updatedExpenseData = { name, expense_category, unit, quantity_used, unit_price, expense_date, note };
        const updatedExpense = await App.updateExpense(id, updatedExpenseData);

        if (!updatedExpense) {
            return res.status(404).json({ message: `Expense with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Expense updated successfully.',
            updated_expense: updatedExpense
        });
    } catch (error) {
        console.log(`Error updating expense: ${error}`);
        return res.status(500).json({ error: `Error updating expense: ${error}` });
    }
};

exports.deleteExpense = async (req, res) => {
    const { id } = req.body;
    const userRole = req.user.role;

    try {
        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admin can delete expenses.' });
        }

        const deletedExpense = await App.deleteExpense(id);

        if (!deletedExpense) {
            return res.status(404).json({ message: `Expense with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Expense deleted successfully.'
        });
    } catch (error) {
        console.log(`Error deleting expense: ${error}`);
        return res.status(500).json({ error: `Error deleting expense: ${error}` });
    }
};

exports.createExpenseCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        const categoryData = { name, description };
        const result = await App.createExpenseCategory(categoryData);

        return res.status(201).json({
            message: 'Expense category created successfully.'
        });
    } catch (error) {
        console.log(`Error creating category: ${error}`);
        return res.status(500).json({ message: `Error creating category: ${error}` });
    }
};

exports.getExpenseCategories = async (req, res) => {
    try {
        const categories = await App.getExpenseCategories();
        return res.status(200).json({
            message: 'Expense categories retrieved successfully.',
            categories
        });
    } catch (error) {
        console.log(`Error fetching categories: ${error}`);
        return res.status(500).json({ error: `Error fetching categories: ${error}` });
    }
};

exports.getExpenseCategoryById = async (req, res) => {
    const { id } = req.query;

    try {
        const category = await App.getExpenseCategoryById(id);

        if (!category) {
            return res.status(404).json({ message: `Category with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Category details retrieved successfully.',
            category
        });
    } catch (error) {
        console.log(`Error fetching category: ${error}`);
        return res.status(500).json({ error: `Error fetching category: ${error}` });
    }
};

exports.updateExpenseCategory = async (req, res) => { 
    const { category_id, name, description } = req.body;

    try {
        const updatedCategoryData = { name, description };
        const updatedCategory = await App.updateExpenseCategory(category_id, updatedCategoryData);

        if (!updatedCategory) {
            return res.status(404).json({ message: `Category with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Expense category updated successfully.',
            updated_category: updatedCategory
        });
    } catch (error) {
        console.log(`Error updating category: ${error}`);
        return res.status(500).json({ error: `Error updating category: ${error}` });
    }
};

exports.deleteExpenseCategory = async (req, res) => {
    const { category_id } = req.body;

    try {
        const deletedCategory = await App.deleteExpenseCategory(category_id);

        if (!deletedCategory) {
            return res.status(404).json({ message: `Category with id ${category_id} not found.` });
        }

        return res.status(200).json({
            message: 'Expense category deleted successfully.'
        });
    } catch (error) {
        console.log(`Error deleting category: ${error}`);
        return res.status(500).json({ error: `Error deleting category: ${error}` });
    }
};

exports.createIncome = async (req, res) => {
    const { name, income_category, quantity, unit, price_per_unit, income_date, description } = req.body;
    const recorded_by = req.user.id;

    try {
        const newIncome = await App.createIncome({
            name, income_category, quantity, unit, price_per_unit, income_date, description, recorded_by
        });

        return res.status(201).json({
            message: 'Income record created successfully.',
            new_income: newIncome
        });
    } catch (error) {
        console.log(`Error creating income: ${error}`);
        return res.status(500).json({ error: `Error creating income: ${error}` });
    }
};

exports.getAllIncome = async (req, res) => {
    try {
        const incomes = await App.getAllIncome();
        return res.status(200).json({
            message: 'Income records retrieved successfully.',
            incomes
        });
    } catch (error) {
        console.log(`Error fetching income: ${error}`);
        return res.status(500).json({ error: `Error fetching income: ${error}` });
    }
};

exports.getIncomeById = async (req, res) => {
    const { income_id } = req.query;

    try {
        const income = await App.getIncomeById(income_id);

        if (!income) {
            return res.status(404).json({ message: `Income record with id ${income_id} not found.` });
        }

        return res.status(200).json({
            message: 'Income record details retrieved successfully.',
            income
        });
    } catch (error) {
        console.log(`Error fetching income: ${error}`);
        return res.status(500).json({ error: `Error fetching income: ${error}` });
    }
};

exports.updateIncome = async (req, res) => { 
    const { id, name, income_category, quantity, unit, price_per_unit, income_date, description } = req.body;
    const userRole = req.user.role;

    try {
        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admin can update incomes.' });
        }

        const updatedIncomeData = { name, income_category, quantity, unit, price_per_unit, income_date, description };
        const updatedIncome = await App.updateIncome(id, updatedIncomeData);

        if (!updatedIncome) {
            return res.status(404).json({ message: `Income record with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Income record updated successfully.',
            updated_income: updatedIncome
        });
    } catch (error) {
        console.log(`Error updating income: ${error}`);
        return res.status(500).json({ error: `Error updating income: ${error}` });
    }
};

exports.deleteIncome = async (req, res) => {
    const { id } = req.body;

    try {
        const deletedIncome = await App.deleteIncome(id);

        if (!deletedIncome) {
            return res.status(404).json({ message: `Income record with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Income record deleted successfully.'
        });
    } catch (error) {
        console.log(`Error deleting income: ${error}`);
        return res.status(500).json({ error: `Error deleting income: ${error}` });
    }
};

exports.createIncomeCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        const newCategory = await App.createIncomeCategory({ name, description });
        return res.status(201).json({
            message: 'Income category created successfully.'
        });
    } catch (error) {
        console.log(`Error creating category: ${error}`);
        return res.status(500).json({ message: `Error creating category: ${error}` });
    }
};

exports.getIncomeCategories = async (req, res) => {
    try {
        const categories = await App.getAllIncomeCategories();
        return res.status(200).json({
            message: 'Income categories retrieved successfully.',
            categories
        });
    } catch (error) {
        console.log(`Error fetching categories: ${error}`);
        return res.status(500).json({ error: `Error fetching categories: ${error}` });
    }
};

exports.getIncomeCategoryById = async (req, res) => {
    const { id } = req.query;

    try {
        const category = await App.getIncomeCategoryById(id);

        if (!category) {
            return res.status(404).json({ message: `Income category with id ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Income category details retrieved successfully.',
            category
        });
    } catch (error) {
        console.log(`Error fetching category: ${error}`);
        return res.status(500).json({ error: `Error fetching category: ${error}` });
    }
};

exports.updateIncomeCategory = async (req, res) => { 
    const { category_id, name, description } = req.body;

    try {
        const updatedCategoryData = { name, description };
        const updatedCategory = await App.updateIncomeCategory(category_id, updatedCategoryData);

        if (!updatedCategory) {
            return res.status(404).json({ message: `Income category with id ${category_id} not found.` });
        }

        return res.status(200).json({
            message: 'Income category updated successfully.',
            updated_category: updatedCategory
        });
    } catch (error) {
        console.log(`Error updating category: ${error}`);
        return res.status(500).json({ error: `Error updating category: ${error}` });
    }
};

exports.deleteIncomeCategory = async (req, res) => {
    const { category_id } = req.body;

    try {
        const deletedCategory = await App.deleteIncomeCategory(category_id);

        if (!deletedCategory) {
            return res.status(404).json({ message: `Income category with id ${category_id} not found.` });
        }

        return res.status(200).json({
            message: 'Income category deleted successfully.'
        });
    } catch (error) {
        console.log(`Error deleting category: ${error}`);
        return res.status(500).json({ message: `Error deleting category: ${error}` });
    }
};

exports.createSupplier = async (req, res) => {
    const { name, contact_person, phone_number, email, address } = req.body;

    if (!name || !contact_person || !phone_number) {
        return res.status(400).json({ message: 'Name, contact person, and phone number are required.' });
    }

    try {
        const supplierData = { name, contact_person, phone_number, email, address };
        const result = await App.createSupplier(supplierData);

        return res.status(201).json({
            message: 'Supplier created successfully.',
            supplier_id: result.insertId
        });
    } catch (error) {
        console.log(`Error creating supplier: ${error}`);
        return res.status(500).json({ message: `Error: ${error}` });
    }
};

exports.getAllSuppliers = async (req, res) => {
    try {
        const { status } = req.query;

        const suppliers = await App.getAllSuppliers(status);
        return res.status(200).json({
            message: 'Suppliers retrieved successfully.',
            suppliers
        });
    } catch (error) {
        console.log(`Error fetching suppliers: ${error}`);
        return res.status(500).json({ error: `Error fetching suppliers: ${error}` });
    }
};

exports.getSupplierById = async (req, res) => {
    const { id } = req.query;

    try {
        const supplier = await App.getSupplierById(id);

        if (!supplier) {
            return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Supplier details retrieved successfully.',
            supplier
        });
    } catch (error) {
        console.log(`Error fetching supplier: ${error}`);
        return res.status(500).json({ message: `Error fetching supplier: ${error}` });
    }
};

exports.updateSupplierStatus = async (req, res) => {
    try {
        const { supplier_id, status } = req.body;
        const auth_user_id = req.user.id;
        const email = req.user.email;
        const user_type = req.user.role;

        if (user_type != 'admin') {
            return res.status(400).json({ message: 'Not authorized to update employee profile' });
        }

        if (!supplier_id || !status) {
            return res.status(400).json({ message: "Supplier ID is required" });
        }

        const [result] = await App.updateSupplierStatus(supplier_id, status);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Supplier updated successfully.' });
        } else {
            res.status(404).json({ message: 'Supplier not found.' });
        }

    } catch (error) {
        res.status(500).json({ message: `Error updated supplier: ${error}` })
    }
}

exports.updateSupplier = async (req, res) => { 
    const {id, name, contact_person, phone_number, email, address } = req.body;

    try {
        const existingSupplier = await App.getSupplierById(id);

        if (!existingSupplier) {
            return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
        }

        const updatedData = { name, contact_person, phone_number, email, address };
        await App.updateSupplier(id, updatedData);

        return res.status(200).json({ message: 'Supplier updated successfully.' });
    } catch (error) {
        console.log(`Error updating supplier: ${error}`);
        return res.status(500).json({ message: `Error updating supplier: ${error}` });
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const { supplier_id } = req.body;
        const auth_user_id = req.user.id;
        const email = req.user.email;
        const user_type = req.user.role;

        if (user_type != 'admin') {
            return res.status(400).json({ message: 'Not authorized to delete supplier profile' });
        }

        if (!supplier_id) {
            return res.status(400).json({ message: 'Supplier ID is required.' });
        }
        const [result] = await App.deleteSupplier(supplier_id);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Supplier not found or no changes made.' });
        }

        return res.status(200).json(
            {
                message: 'Supplier removed successfully.',
            });

    } catch (error) {
        res.status(500).json({ message: `Error: ${error}` })
    }
}

exports.createSupply = async (req, res) => {
    const { name, supply_category, unit, unit_price, quantity, purchase_date, supplier_id } = req.body;
    const recorded_by = req.user.id;

    if (!name || !supply_category || !unit || !unit_price || !quantity || !purchase_date || !supplier_id) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const dateFormat = 'YYYY-MM-DD';
    const dateMoment = moment(purchase_date, dateFormat, true);

    if (!dateMoment.isValid()) {
        return res.status(400).json({ message: `Invalid Purchase Date format. Expected: ${dateFormat}.` });
    }

    if (dateMoment.isAfter(moment())) {
        return res.status(400).json({ message: 'Purchase date cannot be in the future.' });
    }

    const formattedDate = dateMoment.format(dateFormat);

    try {
        const sqlInsertSupply = `
            INSERT INTO supplies (name, supply_category, unit, unit_price, quantity, purchase_date, recorded_by, supplier_id, stock_in) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sqlInsertSupply, [name, supply_category, unit, unit_price, quantity, formattedDate, recorded_by, supplier_id, quantity]);

        const supply_id = result.insertId;

        const sqlInsertTransaction = `
            INSERT INTO supply_transactions (supply_id, transaction_type, quantity, unit_price, unit, transaction_date, recorded_by) 
            VALUES (?, 'purchase', ?, ?, ?, ?, ?)
        `;
        await pool.query(sqlInsertTransaction, [supply_id, quantity, unit_price, unit, formattedDate, recorded_by]);

        return { message: 'Supply created successfully with transaction recorded.', supply_id };

    } catch (error) {
        console.log(`Error creating supply record: ${error}`);
        return res.status(500).json({ error: `Error creating supply record: ${error}` });
    }
};

exports.addSupplyStock = async (req, res) => {
    try {
        const { supply_id, quantity_added, unit_price, supply_date } = req.body;
        const recorded_by = req.user.id;
    
        if (!supply_id || !quantity_added || !unit_price || !supply_date) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
    
        const dateFormat = 'YYYY-MM-DD';
        const dateMoment = moment(supply_date, dateFormat, true);
    
        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid Supply Date format. Expected: ${dateFormat}.` });
        }
    
        if (dateMoment.isAfter(moment())) {
            return res.status(400).json({ message: 'Supply date cannot be in the future.' });
        }
    
        const formattedDate = dateMoment.format(dateFormat);

        const sqlUpdateStock = `UPDATE supplies SET stock_in = stock_in + ? WHERE id = ?`;
        await pool.query(sqlUpdateStock, [quantity_added, supply_id]);

        const sqlInsertTransaction = `
            INSERT INTO supply_transactions (supply_id, transaction_type, quantity, unit_price, transaction_date, recorded_by)
            VALUES (?, 'purchase', ?, ?, ?, ?)
        `;
        const result = await pool.query(sqlInsertTransaction, [supply_id, quantity_added, unit_price, formattedDate, recorded_by]);

        return res.status(200).json({ message: 'Stock added successfully with transaction recorded.' });
    } catch (error) {
        console.error(`Error adding stock: ${error}`);
        return res.status(500).json({ error: `Error adding stock: ${error}` });
    }
};

exports.useSupplyStock = async (req, res) => {
    try {
        const { supply_id, quantity_used, unit_price, usage_date } = req.body;
        const recorded_by = req.user.id;
    
        if (!supply_id || !quantity_used || !unit_price || !usage_date) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
    
        const dateFormat = 'YYYY-MM-DD';
        const dateMoment = moment(usage_date, dateFormat, true);
    
        if (!dateMoment.isValid()) {
            return res.status(400).json({ message: `Invalid Supply Date format. Expected: ${dateFormat}.` });
        }
    
        if (dateMoment.isAfter(moment())) {
            return res.status(400).json({ message: 'Supply date cannot be in the future.' });
        }
    
        const formattedDate = dateMoment.format(dateFormat);

        const [rows] = await pool.query(`SELECT current_stock FROM supplies WHERE id = ?`, [supply_id]);
        if (rows[0].current_stock < quantity_used) {
            return res.status(400).json({ error: 'Not enough stock available.' });
        }

        const sqlUpdateStock = `UPDATE supplies SET stock_out = stock_out + ? WHERE id = ?`;
        await pool.query(sqlUpdateStock, [quantity_used, supply_id]);

        const sqlInsertTransaction = `
            INSERT INTO supply_transactions (supply_id, transaction_type, quantity, unit_price, transaction_date, recorded_by)
            VALUES (?, 'usage', ?, ?, ?, ?)
        `;
        await pool.query(sqlInsertTransaction, [supply_id, quantity_used, unit_price, formattedDate, recorded_by]);

        return res.status(200).json({ message: 'Stock usage recorded successfully.' });
    } catch (error) {
        console.error(`Error using stock: ${error}`);
        return res.status(500).json({ error: `Error using stock: ${error}` });
    }
};

exports.getSupplyTransactions = async (req, res) => {
    try {
        const { supply_id } = req.query;
        let sql = `SELECT * FROM supply_transactions WHERE 1`;
        const params = [];

        if (supply_id) {
            sql += ` AND supply_id = ?`;
            params.push(supply_id);
        }

        const [transactions] = await pool.query(sql, params);
        return res.status(200).json({ transactions });
    } catch (error) {
        console.error(`Error fetching supply transactions: ${error}`);
        return res.status(500).json({ error: `Error fetching supply transactions: ${error}` });
    }
};
 
exports.getStockReport = async (req, res) => {
    try {
        let { start_date, end_date, period, transaction_type } = req.query;
        let { startDate, endDate } = getDateRange(start_date, end_date, period);

        let sql = `
            SELECT 
                s.name AS supply_name,
                SUM(CASE WHEN st.transaction_type = 'purchase' THEN st.quantity ELSE 0 END) AS quantity_in, 
                SUM(CASE WHEN st.transaction_type = 'usage' THEN st.quantity ELSE 0 END) AS quantity_out,
                SUM(st.total_cost) AS total_cost,
                st.transaction_date
            FROM supply_transactions st
            LEFT JOIN supplies s ON st.supply_id = s.id
            WHERE 1 = 1
        `;

        let params = [];

        if (startDate && endDate) {
            sql += ` AND st.transaction_date BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        if (transaction_type) {
            sql += ` AND st.transaction_type = ?`;
            params.push(transaction_type);
        }

        sql += ` GROUP BY st.transaction_date, s.name ORDER BY st.transaction_date DESC;`;

        const [reports] = await pool.query(sql, params);

        return res.status(200).json({
            message: 'Stock/Supplies report generated successfully.',
            reports
        });
    } catch (error) {
        console.error(`Error generating Stock/Supplies report: ${error}`);
        return res.status(500).json({ error: `Error generating Stock/Supplies report: ${error}` });
    }
};

exports.getLowStockAlert = async (req, res) => {
    try {
        const { threshold = 5 } = req.query;  

        const sql = `SELECT id, name, unit, current_stock FROM supplies WHERE current_stock < ? ORDER BY current_stock ASC`;
        const [result] = await pool.query(sql, [threshold]);

        return res.status(200).json({ message: 'Low stock alert generated successfully.', lowStockItems: result });
    } catch (error) {
        console.error(`Error fetching low stock alert: ${error}`);
        return res.status(500).json({ error: `Error fetching low stock alert: ${error}` });
    }
};

exports.checkLowStock = async (req, res) => {
    try {
        const threshold = req.query.threshold || 5;  
        const sql = `SELECT * FROM supplies WHERE current_stock <= ?`;
        const [lowStockItems] = await pool.query(sql, [threshold]);

        if (lowStockItems.length > 0) {
            const messages = lowStockItems.map(item => `Low stock alert: ${item.name} - Only ${item.current_stock} left.`);

            for (const message of messages) {
                await pool.query(`INSERT INTO notifications (message, type) VALUES (?, 'low_stock')`, [message]);
            }

            // Send Email Alert
            const mailOptions = {
                from: 'your_email@gmail.com',
                to: 'admin_email@gmail.com',
                subject: '🚨 Low Stock Alert!',
                text: messages.join('\n'),
            };
            await transporter.sendMail(mailOptions);

            return res.status(200).json({ message: 'Low stock alerts sent successfully.', items: lowStockItems });
        } else {
            return res.status(200).json({ message: 'No low stock items found.' });
        }
    } catch (error) {
        console.error(`Error checking low stock: ${error}`);
        return res.status(500).json({ error: `Error checking low stock: ${error}` });
    }
};

exports.getAllSupplies = async (req, res) => {
    try {
        const supplies = await App.getAllSupplies();
        return res.status(200).json({
            message: 'Supplies retrieved successfully.',
            supplies
        });
    } catch (error) {
        console.log(`Error fetching supplies: ${error}`);
        return res.status(500).json({ error: `Error fetching supplies: ${error}` });
    }
};

exports.getSupplyById = async (req, res) => {
    const { id } = req.params;

    try {
        const supply = await App.getSupplyById(id);

        if (!supply) {
            return res.status(404).json({ message: `Supply record with ID ${id} not found.` });
        }

        return res.status(200).json({
            message: 'Supply record details retrieved successfully.',
            supply
        });
    } catch (error) {
        console.log(`Error fetching supply record: ${error}`);
        return res.status(500).json({ error: `Error fetching supply record: ${error}` });
    }
};

exports.updateSupply = async (req, res) => {
    const { id } = req.params;
    const { name, unit, unit_price, quantity, purchase_date, supplier, supplier_id } = req.body;

    try {
        const existingSupply = await App.getSupplyById(id);

        if (!existingSupply) {
            return res.status(404).json({ message: `Supply record with ID ${id} not found.` });
        }

        const updatedData = { name, unit, unit_price, quantity, purchase_date, supplier, supplier_id };
        await App.updateSupply(id, updatedData);

        return res.status(200).json({ message: 'Supply record updated successfully.' });
    } catch (error) {
        console.log(`Error updating supply record: ${error}`);
        return res.status(500).json({ error: `Error updating supply record: ${error}` });
    }
};

exports.deleteSupply = async (req, res) => {
    const { id } = req.params;

    try {
        const existingSupply = await App.getSupplyById(id);

        if (!existingSupply) {
            return res.status(404).json({ message: `Supply record with ID ${id} not found.` });
        }

        await App.deleteSupply(id);
        return res.status(200).json({ message: 'Supply record deleted successfully.' });
    } catch (error) {
        console.log(`Error deleting supply record: ${error}`);
        return res.status(500).json({ error: `Error deleting supply record: ${error}` });
    }
};

exports.getExpensesReport = async (req, res) => {
    try {
        let { start_date, end_date, period, category } = req.query;
        let { startDate, endDate } = getDateRange(start_date, end_date, period);

        const expenses = await App.getExpensesReport(startDate, endDate, category);

        return res.status(200).json({
            message: 'Expenses report generated successfully.',
            expenses
        });
    } catch (error) {
        console.log(`Error generating expenses report: ${error}`);
        return res.status(500).json({ error: `Error generating expenses report: ${error}` });
    }
};

exports.getIncomeReport = async (req, res) => {
    try {
        let { start_date, end_date, period, category } = req.query;
        let { startDate, endDate } = getDateRange(start_date, end_date, period);

        const incomes = await App.getIncomeReport(startDate, endDate, category);

        return res.status(200).json({
            params: { startDate, endDate, category },
            incomes
        });
    } catch (error) {
        console.log(`Error generating income report: ${error}`);
        return res.status(500).json({ message: `Error generating income report: ${error}` });
    }
};

exports.getProfitLossReport = async (req, res) => {
    try {
        let { start_date, end_date, period } = req.query;
        let { startDate, endDate } = getDateRange(start_date, end_date, period);

        // Fetch Income and group by date
        const incomes = await App.getIncomeReport(startDate, endDate, null);
        const incomeByDate = {};
        incomes.forEach(income => {
            const date = income.income_date;
            if (!incomeByDate[date]) {
                incomeByDate[date] = 0;
            }
            incomeByDate[date] += parseFloat(income.total_income || 0);
        });

        // Fetch Expenses and group by date
        const expenses = await App.getExpensesReport(startDate, endDate, null);
        const expenseByDate = {};
        expenses.forEach(expense => {
            const date = expense.expense_date;
            if (!expenseByDate[date]) {
                expenseByDate[date] = 0;
            }
            expenseByDate[date] += parseFloat(expense.total_cost || 0);
        });

        // Combine data into a table format
        const allDates = [...new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)])].sort();
        const reportTable = allDates.map(date => ({
            date,
            revenue: incomeByDate[date] || 0,
            expenses: expenseByDate[date] || 0,
            profit_loss: (incomeByDate[date] || 0) - (expenseByDate[date] || 0)
        }));

        return res.status(200).json({
            message: 'Profit & Loss report generated successfully.',
            reports: reportTable
        });
    } catch (error) {
        console.error(`Error generating Profit & Loss report: ${error}`);
        return res.status(500).json({ error: `Error generating Profit & Loss report: ${error}` });
    }
};

exports.getLowStockReport = async (req, res) => {
    try {
        let sql = `
            SELECT 
                s.id, 
                s.name AS supply_name, 
                s.current_stock, 
                s.min_stock_level, 
                sup.name AS supplier_name
            FROM supplies s
            LEFT JOIN suppliers sup ON s.supplier_id = sup.id
            WHERE s.current_stock < s.min_stock_level
            ORDER BY s.current_stock ASC;
        `;

        const [lowStockItems] = await pool.query(sql);

        return res.status(200).json({
            message: 'Low stock report generated successfully.',
            lowStockItems
        });
    } catch (error) {
        console.error(`Error generating low stock report: ${error}`);
        return res.status(500).json({ error: `Error generating low stock report: ${error}` });
    }
};

exports.milkProductionReport = async (req, res) => {
    try {
        let { start_date, end_date, period, cow_id } = req.query;
        const { startDate, endDate } = getDateRange(start_date, end_date, period);
        let sql = `
            SELECT 
                mp.production_date,
                mp.cow_id,
                c.name AS cow_name,
                SUM(mp.morning_milk) AS total_morning_milk,
                SUM(mp.evening_milk) AS total_evening_milk,
                SUM(mp.total_milk) AS total_milk_produced,
                mp.recorded_by,
                u.name AS recorded_by_name
            FROM milk_production mp
            LEFT JOIN cows c ON mp.cow_id = c.id
            LEFT JOIN users u ON mp.recorded_by = u.id
            WHERE 1=1
        `;

        let params = [];

        if (startDate && endDate) {
            sql += ` AND mp.production_date BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        if (cow_id) {
            sql += ` AND mp.cow_id = ?`;
            params.push(cow_id);
        }

        sql += ` GROUP BY mp.production_date, mp.cow_id, mp.recorded_by ORDER BY mp.production_date DESC;`;

        const [reports] = await pool.query(sql, params);

        return res.status(200).json({
            message: 'Milk production report generated successfully.',
            reports
        });
    } catch (error) {
        console.error(`Error generating milk production report: ${error}`);
        return res.status(500).json({ error: `Error generating milk production report: ${error}` });
    }
};

exports.cowMilkProductionReport = async (req, res) => {
    try {
        const { cow_id, start_date, end_date, period } = req.query;
        const { startDate, endDate } = getDateRange(start_date, end_date, period);

        const milkProduction = await App.cowMilkProductionReport(cow_id, startDate, endDate);

        return res.status(200).json({
            message: 'Milk production report generated successfully.',
            milkProduction
        });
    } catch (error) {
        console.error(`Error generating milk production report: ${error}`);
        return res.status(500).json({ error: `Error generating milk production report: ${error}` });
    }
};

exports.getCowsReport = async (req, res) => {
    try {
        const { breed, age_range } = req.query;
        const cows = await App.getCowsReport(breed, age_range);

        return res.status(200).json({
            message: 'Cows report generated successfully.',
            cows
        });
    } catch (error) {
        console.log(`Error generating cows report: ${error}`);
        return res.status(500).json({ error: `Error generating cows report: ${error}` });
    }
};

exports.getHealthReport = async (req, res) => {
    try { 
        let { start_date, end_date, period, cow_id } = req.query;
        const { startDate, endDate } = getDateRange(start_date, end_date, period);

        let params = [];
        let sql = `
            SELECT 
                h.id, 
                c.name AS cow_name, 
                h.health_issue, 
                h.severity, 
                h.treatment, 
                h.medication, 
                h.dosage,
                h.treatment_date, 
                h.follow_up_date, 
                h.veterinarian, 
                h.cost, 
                h.status, 
                u.name AS recorded_by, 
                h.created_at
            FROM health_records h
            LEFT JOIN cows c ON h.cow_id = c.id
            LEFT JOIN users u ON h.recorded_by = u.id
        `;

        let conditions = [];
        
        if (startDate) {
            conditions.push("h.treatment_date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            conditions.push("h.treatment_date <= ?");
            params.push(endDate);
        }
        if (cow_id) {
            conditions.push("h.cow_id = ?");
            params.push(cow_id);
        }

        if (conditions.length) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY h.treatment_date DESC;";

        const [records] = await pool.query(sql, params);

        return res.status(200).json({
            message: 'Health records report generated successfully.',
            records
        });
    } catch (error) {
        console.error(`Error generating health report: ${error}`);
        return res.status(500).json({ error: 'Error generating health report.' });
    }
};

exports.getVaccinationReport = async (req, res) => {
    try { 
        let { start_date, end_date, period, cow_id } = req.query;
        const { startDate, endDate } = getDateRange(start_date, end_date, period);
        let params = [];
        let sql = `
            SELECT 
                v.id, 
                c.name AS cow_name, 
                v.vaccine_name, 
                v.vaccine_date, 
                v.next_due_date, 
                v.veterinarian, 
                v.cost, 
                u.name AS recorded_by, 
                v.created_at
            FROM vaccination_records v
            LEFT JOIN cows c ON v.cow_id = c.id
            LEFT JOIN users u ON v.recorded_by = u.id
        `;

        let conditions = [];
        
        if (startDate) {
            conditions.push("v.vaccine_date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            conditions.push("v.vaccine_date <= ?");
            params.push(endDate);
        }
        if (cow_id) {
            conditions.push("v.cow_id = ?");
            params.push(cow_id);
        }

        if (conditions.length) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY v.vaccine_date DESC;";

        const [records] = await pool.query(sql, params);

        return res.status(200).json({
            message: 'Vaccination records report generated successfully.',
            records
        });
    } catch (error) {
        console.error(`Error generating vaccination report: ${error}`);
        return res.status(500).json({ error: 'Error generating vaccination report.' });
    }
};


const getDateRange = (start_date, end_date, period) => {
    let startDate, endDate;

    if (start_date && end_date) {
        startDate = start_date;
        endDate = end_date;
    } else {
        switch (period) {
            case 'today':
                startDate = moment().format('YYYY-MM-DD');
                endDate = startDate;
                break;
            case 'yesterday':
                startDate = moment().subtract(1, 'days').format('YYYY-MM-DD');
                endDate = startDate;
                break;
            case 'this_week':
                startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
                endDate = moment().endOf('isoWeek').format('YYYY-MM-DD');
                break;
            case 'last_week':
                startDate = moment().subtract(1, 'weeks').startOf('isoWeek').format('YYYY-MM-DD');
                endDate = moment().subtract(1, 'weeks').endOf('isoWeek').format('YYYY-MM-DD');
                break;
            case 'this_month':
                startDate = moment().startOf('month').format('YYYY-MM-DD');
                endDate = moment().endOf('month').format('YYYY-MM-DD');
                break;
            case 'last_month':
                startDate = moment().subtract(1, 'months').startOf('month').format('YYYY-MM-DD');
                endDate = moment().subtract(1, 'months').endOf('month').format('YYYY-MM-DD');
                break;
            case 'this_year':
                startDate = moment().startOf('year').format('YYYY-MM-DD');
                endDate = moment().endOf('year').format('YYYY-MM-DD');
                break;
            case 'last_3_months':
                startDate = moment().subtract(3, 'months').startOf('month').format('YYYY-MM-DD');
                endDate = moment().endOf('month').format('YYYY-MM-DD');
                break;
            case 'last_6_months':
                startDate = moment().subtract(6, 'months').startOf('month').format('YYYY-MM-DD');
                endDate = moment().endOf('month').format('YYYY-MM-DD');
                break;
            case 'last_year':
                startDate = moment().subtract(1, 'years').startOf('year').format('YYYY-MM-DD');
                endDate = moment().subtract(1, 'years').endOf('year').format('YYYY-MM-DD');
                break;
            case 'last_12_months':
                startDate = moment().subtract(12, 'months').startOf('month').format('YYYY-MM-DD');
                endDate = moment().endOf('month').format('YYYY-MM-DD');
                break;
            default:
                startDate = null;
                endDate = null;
        }
    }

    return { startDate, endDate };
};

exports.getNotifications = async (req, res) => {
    try {
        const sql = `SELECT * FROM notifications ORDER BY created_at DESC`;
        const [result] = await pool.query(sql);
        return res.status(200).json({ notifications: result });
    } catch (error) {
        console.error(`Error fetching notifications: ${error}`);
        return res.status(500).json({ error: `Error fetching notifications: ${error}` });
    }
};

exports.getDashboardMetrics = async (req, res) => {
    try {
        const { period } = req.query;
        const metrics = await App.getDashboardMetrics(period);

        return res.status(200).json({
            message: "Dashboard metrics fetched successfully",
            period: period || "overall",
            data: metrics
        });
    } catch (error) {
        console.error(`Error fetching dashboard metrics: ${error}`);
        return res.status(500).json({ error: error.message });
    }
};


