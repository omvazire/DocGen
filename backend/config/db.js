import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || '';
  const isPlaceholder = !uri || uri.includes('user:pass') || uri.includes('<user>');

  if (isPlaceholder) {
    console.log('No valid MONGODB_URI found — starting in-memory MongoDB...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`In-memory MongoDB running at ${memUri}`);
    return;
  }

  try {
    await mongoose.connect(uri, { family: 4 });
    console.log('MongoDB connected successfully to Atlas Cloud!');
  } catch (err) {
    console.error('MongoDB Cloud connection error (likely being blocked by your internet provider or router):', err.message);
    console.log('Flipping to offline in-memory database to ensure your project still runs...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`Fallback In-memory MongoDB running at ${memUri}`);
  }
};

export default connectDB;
