const mongoose = require('mongoose');
const Schema = mongoose.Schema

const orderSchema = new mongoose.Schema({
    Business_date_id: {
        type: Number,
        required: [true, 'Business Id is required']
    },
    table_num: {
        type: String
    },
    pos_profile: {
        type: String
    },
    high_priority: {
        type: Boolean,
        default: false
    },
    coming_order_ip: {
        type: String
    },
    company: {
        type: String
    },
    due_date: {
        type: Date,
    },
    total_quantity: {
        type: Number
    },
    total_billing_amount: {
        type: Number
    },
    base_net_total: {
        type: Number
    },
    total: {
        type: Number
    },
    net_total: {
        type: Number
    },
    sale_invoice_status: {
        type: String
    },
    sale_invoice_type: {
        type: String
    },
    sale_invoice_json_string: {
        type: String
    },
    order_priority: {
        type: Boolean
    },
    customer_name: {
        type: String
    },
    order_creation_time: {
        type: Date,
    },
    order_modified_time: {
        type: Date
    },
    data_sync: {
        type: Boolean,
        default: false
    },
    sale_invoice_status: {
        type: String
    },
    cancel_reason: {
        type: String
    },
    taxes: {
        type: String
    },
    sale_invoice_data: {
        type: String
    },
    sale_type: {
        type: Boolean, //false = Sale Invoice true Sale Orders
        default: false
    },
    is_paid: {
        type: Boolean,
        default: false
    },
    sale_invoice_name: {
        type: String
    },
    sale_order_name: {
        type: String
    },
    sale_invoice_json_string: {
        type: String
    }
});

module.exports = mongoose.model('orders', orderSchema);