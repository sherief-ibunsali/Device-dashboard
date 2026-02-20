import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    device_id: {
        type: String,
        required: true,
        index: true
    },
    node_alias_name: {
        type: String,
        required: false,
        index: true
    },
    type: {
        type: String,
        enum: ['live', 'playback', 'analytics', 'streamer'],
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        default: Date.now,
        index: true
    },
    errorMessage: {
        type: String,
        required: false
    }
});


const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema, 'activity_logs');

export default Activity;