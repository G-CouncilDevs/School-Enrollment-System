import mongoose from 'mongoose';
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

const {MONGODB_USERNAME, MONGODB_PASSWORD} = process.env
export async function connectToMongoDB() {
  const URI = 
    `mongodb+srv://${encodeURIComponent(MONGODB_USERNAME)}:${encodeURIComponent(MONGODB_PASSWORD)}`+`@cluster0.6nhdxmw.mongodb.net/mydb?retryWrites=true&w=majority`;

  try {
    await mongoose.connect(URI);
    console.log("You successfully connected to MongoDB!");
    return mongoose;
  } catch (err) {
    console.dir(err);
  }
}
// Call this only when your application terminates
export async function disconnectFromMongoDB() {
  await mongoose.connection.close();
}

