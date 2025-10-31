import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: true,
    auto: true,
  },
  token: {
    type: String,
    index: true,
    required: true,
    minLength: 8,
  },
  provisioned: {
    type: Boolean,
    default: false
  },
  admin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = model('User', userSchema);

export default User;