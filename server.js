const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const path = require('path');
const twilio = require('twilio');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 4000;

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // replace with your MySQL username
    password: 'system', // replace with your MySQL password
    database: 'sos_app',
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACd8a3e45c62e2025c36f11302f1bc5dfa';
const authToken = process.env.TWILIO_AUTH_TOKEN || '8ac08672ded7dabfd7f57155671aa580';
const twilioClient = twilio(accountSid, authToken);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes

app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { name, mobile_number, email, emergency_contact_number, profile_photo, aadhaar_card, password } = req.body;
    connection.query(
        'INSERT INTO users (name, mobile_number, email, emergency_contact_number, profile_photo, aadhaar_card, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, mobile_number, email, emergency_contact_number, profile_photo, aadhaar_card, password],
        (error) => {
            if (error) {
                console.error('Error inserting data:', error);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.redirect('/main');
        }
    );
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    connection.query(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        [email, password],
        (error, results) => {
            if (error) {
                console.error('Error during login:', error);
                res.status(500).send('Internal Server Error');
                return;
            }
            if (results.length > 0) {
                res.cookie('session', 'mdsmbVHJ465^%$'); // Use a real token in production
                res.redirect('/main');
            } else {
                res.status(401).send('Invalid credentials');
            }
        }
    );
});

app.get('/main', (req, res) => {
    res.render('main');
});

app.post('/submit', (req, res) => {
    const { name, mobile, emergency_contact, latitude, longitude } = req.body;

    // Store location data in the database
    connection.query(
        'INSERT INTO user_locations (name, mobile_number, emergency_contact_number, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
        [name, mobile, emergency_contact, latitude, longitude],
        (error) => {
            if (error) {
                console.error('Error inserting location data:', error);
                res.status(500).send('Internal Server Error');
                return;
            }

            // Send an SMS notification using Twilio
            const message = `Emergency alert! User ${name} is in danger. Location: http://maps.google.com/?q=${latitude},${longitude}`;
            twilioClient.messages.create({
                body: message,
                from: '+916283583232', // Replace with your Twilio phone number
                to: emergency_contact // Use the phone number provided by the user
            })
                .then(() => {
                    res.send('Location data submitted and SMS sent successfully.');
                })
                .catch((error) => {
                    console.error('Error sending SMS:', error);
                    res.status(500).send('Error sending SMS');
                });
        }
    );
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
