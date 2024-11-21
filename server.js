const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = 3000;

// MongoDB-forbindelse
const mongoUrl = 'mongodb://127.0.0.1:27017/sessionDemo'; // Erstat med din MongoDB URL
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Forbundet til MongoDB'))
    .catch((err) => console.error('Fejl ved tilslutning til MongoDB:', err));

// Bruger-schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Simpel tekst, hash hvis nødvendigt
});
const User = mongoose.model('User', userSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'dinHemmeligeNøgle',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl }),
        cookie: { maxAge: 1000 * 60 * 60 }, // 1 time
    })
);

// Registrering af nye brugere
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = new User({ username, password });
        await newUser.save();
        res.send('Bruger registreret. Du kan nu logge ind.');
    } catch (err) {
        res.status(500).send('Fejl ved registrering: ' + err.message);
    }
});

// Login handler
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            req.session.username = username; // Gem brugernavn i sessionen
            res.redirect('/');
        } else {
            res.status(401).send('Ugyldigt brugernavn eller kodeord.');
        }
    } catch (err) {
        res.status(500).send('Fejl ved login: ' + err.message);
    }
});

// Logout handler
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Kunne ikke logge ud.');
        }
        res.redirect('/');
    });
});

// Hent aktive brugere fra sessioner
app.get('/active-users', async (req, res) => {
    const sessions = await mongoose.connection.db.collection('sessions').find().toArray();
    const activeUsers = sessions
        .map((session) => {
            try {
                return JSON.parse(session.session).username;
            } catch {
                return null;
            }
        })
        .filter(Boolean);
    res.json(activeUsers);
});

// Server statiske filer
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
    console.log(`Server kører på http://localhost:${PORT}`);
});
