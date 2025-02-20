import mongoose from 'mongoose';

// Department Schema
const departmentSchema = new mongoose.Schema({
    address: { type: String, required: true },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
});

// Message Schema
const messageSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    text: { type: String, required: true },
    image: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }
});

// Create models
export const Department = mongoose.model('Department', departmentSchema);
export const Message = mongoose.model('Message', messageSchema);