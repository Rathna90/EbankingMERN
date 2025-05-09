const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer-out', 'transfer-in'], required: true },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String },
  payeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payee' },
  relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  createdAt: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: props => `${props.value} is not a valid date!`
    }
  }
});module.exports = mongoose.model('Transaction', transactionSchema);