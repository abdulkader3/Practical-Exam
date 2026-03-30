import dotenv from "dotenv";
import "./config/env-validator.js";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config("./.env");



connectDB()
  .then(() => {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, ()=>{console.log(`app running on port http://localhost:${PORT} `)});
  })

  .catch((error) => {
    logger.error("Mongodb connection error", error);
  });
