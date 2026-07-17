import mongoose from 'mongoose';

const wordSchema = new mongoose.Schema({
  word: { type: String, unique: true, required: true },
  category: { type: String, required: true }
});

const Word = mongoose.model('Word', wordSchema);

// Default categorized words to seed the database
const DEFAULT_WORDS = {
  Animals: [
    'dog', 'cat', 'elephant', 'tiger', 'lion', 'giraffe', 'zebra', 'monkey',
    'panda', 'penguin', 'dolphin', 'whale', 'shark', 'octopus', 'rabbit',
    'hamster', 'squirrel', 'koala', 'kangaroo', 'crocodile', 'dinosaur',
    'turtle', 'frog', 'butterfly', 'bee', 'owl', 'eagle', 'parrot', 'snake', 'fox'
  ],
  Food: [
    'apple', 'banana', 'pizza', 'burger', 'sushi', 'pasta', 'taco', 'salad',
    'cake', 'cookie', 'ice cream', 'donut', 'chocolate', 'cheese', 'bread',
    'potato', 'tomato', 'orange', 'strawberry', 'watermelon', 'grape', 'pineapple',
    'pancake', 'waffle', 'popcorn', 'sandwich', 'hotdog', 'soup', 'carrot', 'onion'
  ],
  Objects: [
    'table', 'chair', 'laptop', 'phone', 'book', 'pen', 'pencil', 'cup',
    'glass', 'clock', 'key', 'wallet', 'bag', 'umbrella', 'guitar', 'piano',
    'camera', 'shoe', 'shirt', 'hat', 'mirror', 'candle', 'pillow', 'blanket',
    'lamp', 'hammer', 'scissors', 'brush', 'soap', 'toothbrush'
  ],
  Places: [
    'house', 'school', 'hospital', 'park', 'beach', 'forest', 'desert', 'mountain',
    'river', 'ocean', 'castle', 'library', 'museum', 'airport', 'station',
    'bridge', 'tower', 'farm', 'garden', 'city', 'church', 'island', 'jungle',
    'playground', 'supermarket', 'bakery', 'restaurant', 'office', 'hotel', 'theater'
  ],
  Actions: [
    'running', 'jumping', 'swimming', 'flying', 'reading', 'writing', 'painting',
    'drawing', 'sleeping', 'eating', 'drinking', 'singing', 'dancing', 'cooking',
    'driving', 'climbing', 'laughing', 'crying', 'playing', 'cleaning', 'walking',
    'thinking', 'fishing', 'shopping', 'washing', 'sweeping', 'digging', 'yawning'
  ]
};

export const initDb = async () => {
  try {
    const count = await Word.countDocuments();
    if (count === 0) {
      console.log('Seeding default word database...');
      const wordsToInsert = [];
      
      for (const [category, words] of Object.entries(DEFAULT_WORDS)) {
        for (const word of words) {
          wordsToInsert.push({ word: word.toLowerCase().trim(), category });
        }
      }
      
      await Word.insertMany(wordsToInsert);
      console.log('Database seeded successfully!');
    }
  } catch (err) {
    console.error('Error initializing word database:', err);
    throw err;
  }
};

export const getWordsByCategory = async (category, limit = 100) => {
  try {
    const matchStage = (category && category !== 'Mixed') 
      ? { $match: { category } } 
      : { $match: {} };

    const rows = await Word.aggregate([
      matchStage,
      { $sample: { size: limit } }
    ]);
    
    return rows.map(row => row.word);
  } catch (err) {
    console.error('Error fetching words by category:', err);
    throw err;
  }
};

export default Word;
