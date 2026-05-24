// api/contact.js - Secure Database Connector Route
const { MongoClient } = require('mongodb');

// Pulls your secret password string safely from Vercel Environment Variables
const uri = process.env.MONGODB_URI; 
let client;
let clientPromise;

if (!uri) {
    throw new Error('Please add your MONGODB_URI to your environment variables.');
}

// Ensure database connection caching to maximize processing latency thresholds
if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

module.exports = async (req, res) => {
    // Enable Cross-Origin Resource Sharing (CORS) for front-end handshakes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            const { name, email, subject, message } = req.body;

            // Basic validation
            if (!name || !email || !message) {
                return res.status(400).json({ error: 'Missing mandatory payload packet elements.' });
            }

            const mongoClient = await clientPromise;
            // Connect to a database named "portfolio" and collection named "messages"
            const db = mongoClient.db('portfolio');
            const collection = db.collection('messages');

            const payloadPacket = {
                name,
                email,
                subject: subject || 'No Subject Vector Provided',
                message,
                timestamp: new Date()
            };

            // Store message data directly into the MongoDB document layer
            await collection.insertOne(payloadPacket);

            return res.status(200).json({ success: true, message: 'Data stream successfully committed to MongoDB cloud.' });
        } catch (error) {
            console.error('Database connection error:', error);
            return res.status(500).json({ error: 'Internal serverless loop routing failure.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not permitted.` });
    }
};