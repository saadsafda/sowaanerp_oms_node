const mongoose = require('mongoose');
const Schema = mongoose.Schema

const tableSchema = new mongoose.Schema({
    erp_id: {
        type: 'String',
        required: [true, 'ERP ID required']
    },
    table_num: {
        type: 'String',
        required: [true,'Table Number required']
    },
    occupied: {
        type: 'Number',
        default: 0
    }

});

module.exports = mongoose.model('tables', tableSchema);