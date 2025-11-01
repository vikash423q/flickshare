import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const roomSchema = new Schema({
  roomId: {
    type: String,
    index: true,
    required: true,
    minLength: 6,
  },
  members: {
    type: [mongoose.Schema.Types.ObjectId],
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Room = model('Room', roomSchema);

export default Room;