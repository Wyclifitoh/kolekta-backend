const Client = require('../models/Client'); 
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const validator = require('validator');
const generateUid = require('../utils/utils');



exports.createClient = async (req, res) => {
    const {
        name,
        abbreviation,
        client_type_id,
        team_leader_id,
        paybill,
        general_target_percent,
        contact_person_name,
        branch_or_department,
        designation,
        phone,
        email 
    } = req.body;

    if (!name || !client_type_id) {
        return res.status(400).json({ message: 'Client name and client type are required' });
    }

    try {
        await Client.createClient({
            name,
            abbreviation,
            client_type_id,
            team_leader_id,
            paybill,
            general_target_percent,
            contact_person_name,
            branch_or_department,
            designation,
            phone,
            email
        });

        res.status(201).json({ message: 'Client created successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Error creating client`, error: error.message });
    }
};

exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.findAllClients();
        res.status(200).json({ clients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Error fetching clients: ${error.message}` });
    }
};


exports.createClientType = async (req, res) => {
    const { type, description } = req.body;

    if (!type) {
        return res.status(400).json({ message: 'Client type is required' });
    }

    try {
        
        // Create client type
        await Client.createClientType({
            type: type,
            description: description    
        });

        res.status(201).json({ message: 'Client type created successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Error creating client type`, error: error.message });
    }
};

exports.getAllClientTypes = async (req, res) => {
    try {
        const types = await Client.findAllClientTypes();
        res.status(200).json({types: types});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Error fetching staff: ${error.message}` });
    }
};

 
exports.createClientProduct = async (req, res) => {''
    const { client_id, title, description, general_target, paybill } = req.body;
  
    if (!client_id || !title) {
      return res.status(400).json({ message: 'Client and title are required' });
    }
  
    try {
      await Client.createClientProduct({
        client_id,
        title,
        description,
        general_target,
        paybill 
      });
  
      res.status(201).json({ message: 'Client product created successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating client product', error: error.message });
    }
  };
  
  exports.getAllClientProducts = async (req, res) => {
    try {
      const products = await Client.findAllClientProducts();
      res.status(200).json({ products });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
  };
  
  exports.getClientProductsByClientId = async (req, res) => {
    const { client_id } = req.params;
  
    try {
      const products = await Client.findClientProductsByClientId(client_id);
      res.status(200).json({ products });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching products by client', error: error.message });
    }
  };
  
  exports.updateClientProduct = async (req, res) => {
    const { id } = req.params;
    const { title, description, general_target, paybill, status } = req.body;
  
    try {
      await Client.updateClientProduct(id, {
        title,
        description,
        general_target,
        paybill,
        status
      });
  
      res.status(200).json({ message: 'Client product updated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating product', error: error.message });
    }
  };
  
  exports.deleteClientProduct = async (req, res) => {
    const { id } = req.params;
  
    try {
      await Client.deleteClientProduct(id);
      res.status(200).json({ message: 'Client product deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
  };

  exports.getDashboardStats = async (req, res) => {
    try {
      const [totalFiles] = await pool.query(`
        SELECT COUNT(*) AS total_case_files 
        FROM case_files 
        WHERE status = 'active'
      `);
  
      const [totalClients] = await pool.query(`
        SELECT COUNT(*) AS total_clients 
        FROM clients 
        WHERE status = 'active'
      `);
  
      const [outsourcedThisMonth] = await pool.query(`
        SELECT COUNT(*) AS cases_outsourced_this_month 
        FROM case_files 
        WHERE status = 'active'
          AND MONTH(outsource_date) = MONTH(CURRENT_DATE())
          AND YEAR(outsource_date) = YEAR(CURRENT_DATE())
      `);
  
      const [totalDebt] = await pool.query(`
        SELECT COALESCE(SUM(arrears), 0) AS total_debt 
        FROM case_files 
        WHERE status = 'active'
      `);
  
      const [overdueCases] = await pool.query(`
        SELECT COUNT(*) AS overdue_cases 
        FROM case_files 
        WHERE status = 'active'
          AND outsource_date IS NOT NULL 
          AND DATEDIFF(CURRENT_DATE(), outsource_date) > 90
      `);
  
      const [heldByStaff] = await pool.query(`
        SELECT COUNT(*) AS held_by_staff 
        FROM case_files 
        WHERE status = 'active'
          AND held_by IS NOT NULL
      `);
  
      res.json({
        total_case_files: totalFiles[0].total_case_files,
        total_clients: totalClients[0].total_clients,
        cases_outsourced_this_month: outsourcedThisMonth[0].cases_outsourced_this_month,
        total_debt: totalDebt[0].total_debt,
        overdue_cases: overdueCases[0].overdue_cases,
        held_by_staff: heldByStaff[0].held_by_staff,
      });
    } catch (error) {
      console.error('Dashboard Error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
  };
  