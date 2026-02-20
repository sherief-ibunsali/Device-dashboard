import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  alias_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  limits: {
    streamer: {
      max_limit: { type: Number, default: 0 }
    },
    live: {
      max_limit: { type: Number, default: 0 }
    },
    playback: {
      max_limit: { type: Number, default: 0 }
    }
  },
  mediaMtxInfo: {
    media_mtx_url: { type: String, trim: true },
    ip_addr: { type: String, trim: true },
    domain: { type: String, trim: true },
    username: { type: String, trim: true },
    password: { type: String, trim: true }
  },
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });


const Node = mongoose.models.Node || mongoose.model('Node', nodeSchema, 'nodes');

export default Node;