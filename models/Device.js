import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  playbackConfig: {
    node_alias_name: {
      type: String,
      trim: true
    },
    containerStatus: {
      type: String
    },
    containerName: {
      type: String
    },
    error: {
      type: String
    }
  },
  liveStreamConfig: {
    node_alias_name: {
      type: String,
      trim: true
    }
  },
  analyticsConfig: {
    node_alias_name: {
      type: String,
      trim: true
    },
    containerStatus: {
      type: String
    },
    containerName: {
      type: String
    },
    error: {
      type: String
    }
  },
  deviceInfo: {
    id: { type: String, trim: true, index: true },
    name: { type: String, trim: true },
    alias: { type: String, trim: true },
    rtspUrl: { type: String, trim: true },
    deviceType: { type: String, trim: true },
    playback: { type: mongoose.Schema.Types.Mixed },
    appTypes: { type: mongoose.Schema.Types.Mixed }
  },
  siteId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  }
}, { timestamps: true });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema, 'devices');

export default Device;