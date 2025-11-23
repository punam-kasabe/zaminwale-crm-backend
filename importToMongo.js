import { MongoClient } from "mongodb";
import fs from "fs";

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db("zaminwaleCRM");
    const collection = database.collection("customers");

    // Read JSON file
    const data = JSON.parse(fs.readFileSync("./data.json", "utf-8"));

    // Insert multiple records
    const result = await collection.insertMany(data);
    console.log(`✅ ${result.insertedCount} records successfully inserted!`);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();
