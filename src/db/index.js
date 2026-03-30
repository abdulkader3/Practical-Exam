import { setServers } from "node:dns/promises";
import mongoose from "mongoose";
import DB_NAME from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstace = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,);
      console.log(`App connented mongoDB 🌸 ${connectionInstace.connection.host}`)
  } catch (error) {
    console.log("src > db > index.js : " , error)
    process.exit(1);
  }
};


export default connectDB;
