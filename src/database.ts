// @ts-ignore
import mongoose from "mongoose";

export const db = mongoose.connection;

export async function openDb() {
    await mongoose.connect(process.env["MONGO_URI"], {
        dbName: `crypto-bot-${process.env["NODE_ENV"]}`
    });
    db.once("open", () => {
        console.log("Connected to MongoDb");
    });
}
