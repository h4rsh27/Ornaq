import "dotenv/config";
import mongoose from "mongoose";

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const collections = await mongoose.connection.db.listCollections({ name: "users" }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.collection("users").dropIndex("email_1");
      console.log("Dropped index email_1");
    }
    
    console.log("Please restart the server to let Mongoose recreate the sparse index.");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

fixIndexes();
