// api/contact.js - Contact form router
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

// Pulls your secret password string safely from Vercel Environment Variables
let client;
let clientPromise;

// Ensure database connection caching to maximize processing latency thresholds
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
            const uri = process.env.MONGODB_URI;
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = Number(process.env.SMTP_PORT || 587);
            const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;
            const contactToEmail = process.env.CONTACT_TO_EMAIL || 'mr.princekr.chauhan@gmail.com';
            const contactFromEmail = process.env.CONTACT_FROM_EMAIL || smtpUser;

            if (!smtpHost || !smtpUser || !smtpPass || !contactToEmail || !contactFromEmail) {
                return res.status(500).json({ error: 'SMTP email service is not configured for the contact route.' });
            }

            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { name, email, subject, message } = body || {};

            // Basic validation
            if (!name || !email || !message) {
                return res.status(400).json({ error: 'Missing mandatory payload packet elements.' });
            }

            const payloadPacket = {
                name,
                email,
                subject: subject || 'No Subject Vector Provided',
                message,
                timestamp: new Date()
            };

            if (uri) {
                if (!clientPromise) {
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
                }

                const mongoClient = await clientPromise;
                const db = mongoClient.db('portfolio');
                const collection = db.collection('messages');
                await collection.insertOne(payloadPacket);
            }

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                    user: smtpUser,
                    pass: smtpPass
                }
            });

            await transporter.sendMail({
                from: contactFromEmail,
                to: contactToEmail,
                replyTo: email,
                subject: `Portfolio message: ${payloadPacket.subject}`,
                text: [
                    `Name: ${name}`,
                    `Email: ${email}`,
                    `Subject: ${payloadPacket.subject}`,
                    '',
                    message
                ].join('\n'),
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
                        <h2 style="margin: 0 0 12px;">New portfolio message</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Subject:</strong> ${payloadPacket.subject}</p>
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                `
            });

            return res.status(200).json({ success: true, message: 'Message delivered to your email inbox.' });
        } catch (error) {
            console.error('Database connection error:', error);
            return res.status(500).json({ error: 'Internal serverless loop routing failure.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not permitted.` });
    }
};