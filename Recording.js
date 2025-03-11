const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
});

recordingSchema.virtual('url').get(function() {
  return `/recordings/${this.filename}`;
});

recordingSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Recording', recordingSchema);
