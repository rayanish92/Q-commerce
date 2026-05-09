const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.express.Router(); // Small typo fix: const router = express.Router(); Let me correct it in the block below.
