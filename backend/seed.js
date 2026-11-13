const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Book = require('./models/Book');
const Quote = require('./models/Quote');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Create a System User
    const systemUser = await User.findOneAndUpdate(
      { email: 'system@nocturne.lib' },
      {
        username: 'NocturneSystem',
        fullName: 'Library System',
        password: 'initial_secret_password_123', // In a real app, this would be hashed
      },
      { upsert: true, new: true },
    );
    console.log('System User verified.');

    // 2. Create a Welcome Book
    await Book.findOneAndUpdate(
      { title: 'Welcome to Nocturne Library', userId: systemUser._id },
      {
        author: 'The Architect',
        genre: 'Guide',
        status: 'completed',
        progress: '1 / 1',
        coverImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
      },
      { upsert: true },
    );
    console.log('Welcome Book created.');

    // 3. Create a Sample Quote
    await Quote.findOneAndUpdate(
      {
        text: 'The night is the hardest time to be alive and 4am knows all my secrets.',
        ownerId: systemUser._id,
      },
      {
        author: 'Poppy Z. Brite',
        bookTitle: 'Exquisite Corpse',
      },
      { upsert: true },
    );
    console.log('Sample Quote created.');

    console.log(
      '\nSUCCESS: Database seeded! You should now see "nocturnelibrary" and its collections in your MongoDB Atlas dashboard.',
    );
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
