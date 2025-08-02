const express = require('express'); 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const appRoutes = require('./routes/appRoutes');
const dotenv = require('dotenv'); 
const cors = require('cors');

const TWO_HOURS = 1000 * 60 * 60 * 2;

const { PORT = 4000, 
} = process.env;

// Load environment variables
dotenv.config();

const app = express();

// Middleware for parsing JSON requests
app.use(express.json());

app.use(cors({
  origin: [
    'https://smartcollect.hapmodproperties.co.ke', 
    'http://192.168.100.202:5500',   
    'http://localhost:5173'         
  ], 
  methods: 'GET,POST,PUT,DELETE',  
  credentials: true,   
}));


// Routes
app.use('/api/auth', authRoutes); 
app.use('/api/users', userRoutes); 
app.use('/api/client', clientRoutes); 
app.use('/api', appRoutes); 



app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
