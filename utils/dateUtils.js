const moment = require('moment');

const DATE_FORMAT = 'YYYY-MM-DD';

const validateDate = (dateString) => {
    return moment(dateString, DATE_FORMAT, true).isValid();
};

const formatDate = (dateString) => {
    return moment(dateString).format(DATE_FORMAT);
};

module.exports = {
    DATE_FORMAT,
    validateDate,
    formatDate
};
