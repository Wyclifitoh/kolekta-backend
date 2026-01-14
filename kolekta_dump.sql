-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 01, 2025 at 11:36 PM
-- Server version: 10.11.13-MariaDB-cll-lve
-- PHP Version: 8.3.23

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hapmodpr_smartcollect`
--

-- --------------------------------------------------------

--
-- Table structure for table `call_types`
--

CREATE TABLE `call_types` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `call_types`
--

INSERT INTO `call_types` (`id`, `title`) VALUES
(2, 'Dispute'),
(1, 'Promise to Pay'),
(3, 'Reminder');

-- --------------------------------------------------------

--
-- Table structure for table `casefiles`
--

CREATE TABLE `casefiles` (
  `id` int(11) NOT NULL,
  `case_number` varchar(50) NOT NULL,
  `debtor_name` varchar(255) NOT NULL,
  `debtor_id` int(11) DEFAULT NULL,
  `status` enum('Active','Closed','Pending') NOT NULL DEFAULT 'Active',
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `held_by` int(11) DEFAULT NULL,
  `assigned_date` datetime DEFAULT current_timestamp(),
  `due_date` datetime DEFAULT NULL,
  `last_payment_date` datetime DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `case_files`
--

CREATE TABLE `case_files` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `held_by` int(11) DEFAULT NULL,
  `cfid` int(11) NOT NULL,
  `full_names` varchar(255) NOT NULL,
  `debt_category` varchar(100) DEFAULT NULL,
  `debt_type` int(11) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `principal_amount` decimal(15,2) DEFAULT NULL,
  `amount_repaid` decimal(15,2) DEFAULT NULL,
  `arrears` decimal(15,2) DEFAULT NULL,
  `contract_no` varchar(100) DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `product_id` varchar(100) DEFAULT NULL,
  `currency_id` varchar(50) DEFAULT NULL,
  `batch_no` varchar(100) DEFAULT NULL,
  `identification` varchar(100) DEFAULT NULL,
  `phones` text DEFAULT NULL,
  `emails` text DEFAULT NULL,
  `loan_taken_date` date DEFAULT NULL,
  `loan_due_date` date DEFAULT NULL,
  `dpd` int(11) DEFAULT NULL,
  `last_paid_amount` decimal(15,2) DEFAULT NULL,
  `last_paid_date` date DEFAULT NULL,
  `loan_counter` int(11) DEFAULT NULL,
  `risk_category` varchar(100) DEFAULT NULL,
  `branch` varchar(100) DEFAULT NULL,
  `physical_address` text DEFAULT NULL,
  `postal_address` text DEFAULT NULL,
  `employer_and_address` text DEFAULT NULL,
  `nok_full_names` varchar(255) DEFAULT NULL,
  `nok_relationship` varchar(100) DEFAULT NULL,
  `nok_phones` text DEFAULT NULL,
  `nok_address` text DEFAULT NULL,
  `nok_emails` text DEFAULT NULL,
  `gua_full_names` varchar(255) DEFAULT NULL,
  `gua_phones` text DEFAULT NULL,
  `gua_emails` text DEFAULT NULL,
  `gua_address` text DEFAULT NULL,
  `contact_type` varchar(100) DEFAULT NULL,
  `contact_status` varchar(100) DEFAULT NULL,
  `outsource_date` date DEFAULT NULL,
  `days_since_outsource` int(11) DEFAULT NULL,
  `status` enum('active','closed','archived') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `case_files`
--

INSERT INTO `case_files` (`id`, `client_id`, `held_by`, `cfid`, `full_names`, `debt_category`, `debt_type`, `account_number`, `amount`, `principal_amount`, `amount_repaid`, `arrears`, `contract_no`, `customer_id`, `product_id`, `currency_id`, `batch_no`, `identification`, `phones`, `emails`, `loan_taken_date`, `loan_due_date`, `dpd`, `last_paid_amount`, `last_paid_date`, `loan_counter`, `risk_category`, `branch`, `physical_address`, `postal_address`, `employer_and_address`, `nok_full_names`, `nok_relationship`, `nok_phones`, `nok_address`, `nok_emails`, `gua_full_names`, `gua_phones`, `gua_emails`, `gua_address`, `contact_type`, `contact_status`, `outsource_date`, `days_since_outsource`, `status`, `created_at`, `updated_at`) VALUES
(2, 1, NULL, 1050, 'Denis', '1', 1, NULL, 250000.00, 2333.00, 300000.00, 32423485994.00, NULL, '45456', '1', '1', '6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-30', NULL, 'active', '2025-04-30 06:17:57', '2025-04-30 11:27:03'),
(3, 1, NULL, 1601, 'Matha', '3', 3, NULL, 250000.00, 2333.00, 300000.00, 32423485994.00, NULL, '45456', '1', '2', '6', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-30', NULL, 'active', '2025-04-30 06:30:40', '2025-04-30 11:27:08'),
(80, 1, NULL, 1606, 'preston', '1', 2, NULL, 25000.00, 24433.00, 330000.00, 32423485994.00, NULL, '456456', '1', '1', '01', '234576789', '795904813', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-30', NULL, 'active', '2025-04-30 11:29:36', '2025-04-30 11:30:51'),
(87, 1, NULL, 1607, 'Cynthia', '1', 3, '123456', 500000.00, 400000.00, 10000.00, 12000.00, NULL, '234567', '1', '2', '02', '123345', '759698756', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-30', NULL, 'active', '2025-04-30 11:38:40', '2025-04-30 11:38:40'),
(88, 1, NULL, 1608, 'Cynthia', '1', 3, '123456', 500000.00, 400000.00, 10000.00, 12000.00, NULL, '234567', '1', '2', '02', '123345', '759698756', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-04-30', NULL, 'active', '2025-04-30 11:38:41', '2025-04-30 11:38:41');

-- --------------------------------------------------------

--
-- Table structure for table `case_notes`
--

CREATE TABLE `case_notes` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `note_text` text NOT NULL,
  `note_date` datetime DEFAULT NULL,
  `note_type` enum('update','sms','progress','ptp') NOT NULL DEFAULT 'update',
  `next_action` varchar(100) DEFAULT NULL,
  `next_action_date` datetime DEFAULT NULL,
  `call_type_id` int(11) DEFAULT NULL,
  `contact_type_id` int(11) DEFAULT NULL,
  `contact_status_id` int(11) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `case_notes`
--

INSERT INTO `case_notes` (`id`, `cfid`, `note_text`, `note_date`, `note_type`, `next_action`, `next_action_date`, `call_type_id`, `contact_type_id`, `contact_status_id`, `created_by`, `created_at`) VALUES
(1, 1608, 'this is a test', NULL, 'update', NULL, '0000-00-00 00:00:00', NULL, NULL, NULL, NULL, '2025-07-15 18:32:41');

-- --------------------------------------------------------

--
-- Table structure for table `case_payments`
--

CREATE TABLE `case_payments` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `payment_date` date DEFAULT NULL,
  `amount` decimal(12,2) DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `received_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `case_progress`
--

CREATE TABLE `case_progress` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `report` text NOT NULL,
  `date_updated` datetime DEFAULT NULL,
  `contact_status_id` int(11) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `case_sms`
--

CREATE TABLE `case_sms` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `message` text NOT NULL,
  `date_sent` datetime DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sent_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `abbreviation` varchar(20) DEFAULT NULL,
  `client_type_id` int(11) NOT NULL,
  `team_leader_id` int(11) DEFAULT NULL,
  `paybill` varchar(20) DEFAULT NULL,
  `general_target_percent` decimal(5,2) DEFAULT NULL,
  `contact_person_name` varchar(100) DEFAULT NULL,
  `branch_or_department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `name`, `abbreviation`, `client_type_id`, `team_leader_id`, `paybill`, `general_target_percent`, `contact_person_name`, `branch_or_department`, `designation`, `phone`, `email`, `status`, `created_at`, `updated_at`) VALUES
(1, 'KCB BANK', 'KCB ', 1, 1, '247247', 12.00, 'Preston Wagabi', 'DFSD', 'DFSD', '0795904813', 'prestonwagabi@gmail.com', 'active', '2025-04-29 18:12:59', '2025-04-29 18:12:59'),
(2, 'ABSA', 'ABSA', 2, 2, '50500', 999.99, '', '', '', '', '', 'active', '2025-04-30 11:26:05', '2025-04-30 11:26:05'),
(3, 'Simu Loans', 'SML', 3, 1, '4106947', 75.00, 'Richard Wilson Olakhi', 'DFSD', 'DFSD', '0721365067', 'olakhrichard@gmail.com', 'active', '2025-06-23 05:10:34', '2025-06-23 05:10:34');

-- --------------------------------------------------------

--
-- Table structure for table `client_contacts`
--

CREATE TABLE `client_contacts` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `branch_department` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_products`
--

CREATE TABLE `client_products` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `general_target` decimal(5,2) DEFAULT NULL,
  `paybill` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_products`
--

INSERT INTO `client_products` (`id`, `client_id`, `title`, `description`, `general_target`, `paybill`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 'MMM', 'asds', 32.00, '4106947', 'active', '2025-04-29 18:26:56', '2025-04-29 18:26:56');

-- --------------------------------------------------------

--
-- Table structure for table `client_types`
--

CREATE TABLE `client_types` (
  `id` int(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `client_types`
--

INSERT INTO `client_types` (`id`, `type`, `description`, `created_at`) VALUES
(1, 'Test', 'Test', '2025-04-29 12:38:59'),
(2, 'Cooporate', 'Cooporate Client', '2025-04-30 09:18:55'),
(3, 'Comercial Banks', 'Kenyan Banks', '2025-04-30 11:27:45');

-- --------------------------------------------------------

--
-- Table structure for table `contact_statuses`
--

CREATE TABLE `contact_statuses` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `contact_statuses`
--

INSERT INTO `contact_statuses` (`id`, `title`) VALUES
(3, 'Dispute'),
(1, 'Hang Up'),
(4, 'No Answer'),
(2, 'Promise To Pay');

-- --------------------------------------------------------

--
-- Table structure for table `contact_types`
--

CREATE TABLE `contact_types` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `contact_types`
--

INSERT INTO `contact_types` (`id`, `title`) VALUES
(1, 'Right Party Contact'),
(2, 'Third Party Contact');

-- --------------------------------------------------------

--
-- Table structure for table `currencies`
--

CREATE TABLE `currencies` (
  `id` int(11) NOT NULL,
  `code` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL,
  `symbol` varchar(5) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `currencies`
--

INSERT INTO `currencies` (`id`, `code`, `name`, `symbol`, `status`, `created_at`) VALUES
(1, 'KES', 'Kenya Shillings', 'KSh', 'active', '2025-04-30 04:56:18'),
(2, 'UGX', 'Uganda Shillings', 'USh', 'active', '2025-04-30 04:56:18'),
(3, 'TZS', 'Tanzania Shillings', 'TSh', 'active', '2025-04-30 04:56:18');

-- --------------------------------------------------------

--
-- Table structure for table `debtors`
--

CREATE TABLE `debtors` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `national_id` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `employer` varchar(255) DEFAULT NULL,
  `employer_address` text DEFAULT NULL,
  `next_of_kin_name` varchar(255) DEFAULT NULL,
  `next_of_kin_phone` varchar(20) DEFAULT NULL,
  `next_of_kin_relationship` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `debt_categories`
--

CREATE TABLE `debt_categories` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debt_categories`
--

INSERT INTO `debt_categories` (`id`, `title`, `description`, `status`, `created_at`) VALUES
(1, 'Loan', NULL, 'active', '2025-04-30 04:56:18'),
(2, 'Card', NULL, 'active', '2025-04-30 04:56:18'),
(3, 'Mobile Loan', NULL, 'active', '2025-04-30 04:56:18');

-- --------------------------------------------------------

--
-- Table structure for table `debt_types`
--

CREATE TABLE `debt_types` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `debt_types`
--

INSERT INTO `debt_types` (`id`, `title`, `description`, `status`, `created_at`) VALUES
(1, 'Pre-Charge Off', NULL, 'active', '2025-04-30 04:56:18'),
(2, 'Charge Off', NULL, 'active', '2025-04-30 04:56:18'),
(3, 'Write Off', NULL, 'active', '2025-04-30 04:56:18');

-- --------------------------------------------------------

--
-- Table structure for table `phone_contacts`
--

CREATE TABLE `phone_contacts` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `promise_to_pay`
--

CREATE TABLE `promise_to_pay` (
  `id` int(11) NOT NULL,
  `cfid` int(11) NOT NULL,
  `ptp_date` date DEFAULT NULL,
  `ptp_amount` decimal(12,2) DEFAULT NULL,
  `ptp_by` varchar(100) DEFAULT NULL,
  `ptp_type` varchar(50) DEFAULT NULL,
  `ptp_status` varchar(50) DEFAULT NULL,
  `affirm_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_token`
--

CREATE TABLE `refresh_token` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `refresh_token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refresh_token`
--

INSERT INTO `refresh_token` (`id`, `user_id`, `refresh_token`, `created_at`) VALUES
(1, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzUyNjA3Mzg4LCJleHAiOjE3NTUxOTkzODh9.8nOC6KnvtQ5_Ups8LqxKSjDx2ZLXKPY_-px9KNj0j8c', '2025-01-27 13:24:30');

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email_address` varchar(100) NOT NULL,
  `phone_number` varchar(100) NOT NULL,
  `dialing_id` varchar(100) NOT NULL,
  `role` enum('admin','team_leader','account_manager','staff') NOT NULL,
  `permission` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `password` varchar(100) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `staff_id`, `first_name`, `last_name`, `email_address`, `phone_number`, `dialing_id`, `role`, `permission`, `is_active`, `password`, `created_date`, `updated_date`) VALUES
(1, 1000, 'Wycliff', 'Vuzigu', 'wikiteqsolutions@gmail.com', '0703958613', '456456', 'admin', '[\"read\",\"write\",\"delete\",\"update\"]', 1, '$2a$10$122FdKupWL3JO1/PFFl.y.0Mf26THXdC6FDIR.W/ys19856T8/XKq', '2025-04-28 23:26:09', '2025-04-28 23:26:09'),
(2, 1001, 'Preston', 'Wagabi', 'prestonwagabi@lehigh.co.ke', '0795904813', '', 'team_leader', '[\"read\",\"write\",\"delete\",\"update\"]', 1, '$2a$10$ei5rRNPFoD1M5EXys5IaPevTSm5HOSK8sQ.DYosoCqOG7Ne4rx2X2', '2025-04-30 11:24:56', '2025-04-30 11:24:56'),
(3, 1002, 'Preston', 'Wagabi', 'prestonwagabi@gmail.com', '0795904813', 'D0015', 'account_manager', '[\"read\",\"write\"]', 1, '$2a$10$Qc8OlaWQ3ySroh5xbGw0EuFJyyKWv.7D8cvGl1frZ0qxH/hk9Obne', '2025-06-22 20:07:36', '2025-06-22 20:07:36'),
(4, 1003, 'Preston', 'Wagabi', 'prestonwagasdbi@gmail.com', '0795904813', 'D0015', 'account_manager', '[\"read\",\"write\"]', 1, '$2a$10$Y6qrJsnqzSXsOzs4nj.JIO5RTRabVxj/QTSjReOFr6RKKPAPWHZve', '2025-06-22 20:08:02', '2025-06-22 20:08:02'),
(5, 1004, 'Richard', 'Olakhi', 'olakhrichard@gmail.com', '0721365067', 'D0015', 'account_manager', '[\"read\",\"write\"]', 1, '$2a$10$BIJMUIpz9aEoYf30XafLiegagZMvwStdPkUo8i2D8Jbh0s4X9jPTK', '2025-06-22 20:14:23', '2025-06-22 20:14:23'),
(6, 1005, 'Preston', 'Wagabi', 'info@lehigh.co.ke', '0795904813', 'D0015', 'account_manager', '[\"read\",\"write\"]', 1, '$2a$10$Lsg0mYrX1mBJclh5KslqiOVFZ8twg1cHyQNJtfuVOMXNiMdrmYwRa', '2025-06-23 04:29:25', '2025-06-23 04:29:25');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','manager','employee') DEFAULT 'employee',
  `status` enum('active','inactive','removed') NOT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `contact_info`, `created_at`, `updated_at`) VALUES
(1, 'Wycliff Vuzigu', 'admin@gmail.com', '$2b$10$v357TIHkCgBiJYUusXJsxe58IOUNOVyI8pjj315dwPKk.xaFeXPWq', 'admin', 'active', '0721000001', '2025-01-27 13:11:56', '2025-01-27 13:22:12');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `call_types`
--
ALTER TABLE `call_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`);

--
-- Indexes for table `casefiles`
--
ALTER TABLE `casefiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `case_number` (`case_number`),
  ADD KEY `debtor_id` (`debtor_id`),
  ADD KEY `held_by` (`held_by`);

--
-- Indexes for table `case_files`
--
ALTER TABLE `case_files`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cfid` (`cfid`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `case_notes`
--
ALTER TABLE `case_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`),
  ADD KEY `call_type_id` (`call_type_id`),
  ADD KEY `contact_type_id` (`contact_type_id`),
  ADD KEY `contact_status_id` (`contact_status_id`);

--
-- Indexes for table `case_payments`
--
ALTER TABLE `case_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`);

--
-- Indexes for table `case_progress`
--
ALTER TABLE `case_progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`),
  ADD KEY `contact_status_id` (`contact_status_id`);

--
-- Indexes for table `case_sms`
--
ALTER TABLE `case_sms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `client_contacts`
--
ALTER TABLE `client_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `client_products`
--
ALTER TABLE `client_products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `client_types`
--
ALTER TABLE `client_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contact_statuses`
--
ALTER TABLE `contact_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`);

--
-- Indexes for table `contact_types`
--
ALTER TABLE `contact_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`);

--
-- Indexes for table `currencies`
--
ALTER TABLE `currencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `debtors`
--
ALTER TABLE `debtors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `national_id` (`national_id`);

--
-- Indexes for table `debt_categories`
--
ALTER TABLE `debt_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`);

--
-- Indexes for table `debt_types`
--
ALTER TABLE `debt_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `title` (`title`);

--
-- Indexes for table `phone_contacts`
--
ALTER TABLE `phone_contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`);

--
-- Indexes for table `promise_to_pay`
--
ALTER TABLE `promise_to_pay`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cfid` (`cfid`);

--
-- Indexes for table `refresh_token`
--
ALTER TABLE `refresh_token`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `call_types`
--
ALTER TABLE `call_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `casefiles`
--
ALTER TABLE `casefiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `case_files`
--
ALTER TABLE `case_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- AUTO_INCREMENT for table `case_notes`
--
ALTER TABLE `case_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `case_payments`
--
ALTER TABLE `case_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `case_progress`
--
ALTER TABLE `case_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `case_sms`
--
ALTER TABLE `case_sms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `client_contacts`
--
ALTER TABLE `client_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `client_products`
--
ALTER TABLE `client_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `client_types`
--
ALTER TABLE `client_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `contact_statuses`
--
ALTER TABLE `contact_statuses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `contact_types`
--
ALTER TABLE `contact_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `currencies`
--
ALTER TABLE `currencies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `debtors`
--
ALTER TABLE `debtors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `debt_categories`
--
ALTER TABLE `debt_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `debt_types`
--
ALTER TABLE `debt_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `phone_contacts`
--
ALTER TABLE `phone_contacts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `promise_to_pay`
--
ALTER TABLE `promise_to_pay`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `refresh_token`
--
ALTER TABLE `refresh_token`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `casefiles`
--
ALTER TABLE `casefiles`
  ADD CONSTRAINT `casefiles_ibfk_1` FOREIGN KEY (`debtor_id`) REFERENCES `debtors` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `casefiles_ibfk_2` FOREIGN KEY (`held_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `case_notes`
--
ALTER TABLE `case_notes`
  ADD CONSTRAINT `case_notes_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_notes_ibfk_2` FOREIGN KEY (`call_type_id`) REFERENCES `call_types` (`id`),
  ADD CONSTRAINT `case_notes_ibfk_3` FOREIGN KEY (`contact_type_id`) REFERENCES `contact_types` (`id`),
  ADD CONSTRAINT `case_notes_ibfk_4` FOREIGN KEY (`contact_status_id`) REFERENCES `contact_statuses` (`id`);

--
-- Constraints for table `case_payments`
--
ALTER TABLE `case_payments`
  ADD CONSTRAINT `case_payments_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE;

--
-- Constraints for table `case_progress`
--
ALTER TABLE `case_progress`
  ADD CONSTRAINT `case_progress_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE,
  ADD CONSTRAINT `case_progress_ibfk_2` FOREIGN KEY (`contact_status_id`) REFERENCES `contact_statuses` (`id`);

--
-- Constraints for table `case_sms`
--
ALTER TABLE `case_sms`
  ADD CONSTRAINT `case_sms_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE;

--
-- Constraints for table `client_contacts`
--
ALTER TABLE `client_contacts`
  ADD CONSTRAINT `client_contacts_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `client_products`
--
ALTER TABLE `client_products`
  ADD CONSTRAINT `client_products_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `phone_contacts`
--
ALTER TABLE `phone_contacts`
  ADD CONSTRAINT `phone_contacts_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE;

--
-- Constraints for table `promise_to_pay`
--
ALTER TABLE `promise_to_pay`
  ADD CONSTRAINT `promise_to_pay_ibfk_1` FOREIGN KEY (`cfid`) REFERENCES `case_files` (`cfid`) ON DELETE CASCADE;

--
-- Constraints for table `refresh_token`
--
ALTER TABLE `refresh_token`
  ADD CONSTRAINT `refresh_token_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
