const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3000;

// const corsOptions = {
//    origin: ["http://localhost:5173"],
//    credentials: true,
//    optionSuccessStatus: 200,
// };

// middlewares:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j7c4zww.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      //   await client.connect();
      // Send a ping to confirm a successful connection
      const statesCollection = client.db("luxState").collection("states");

      console.log(
         "Pinged your deployment. You successfully connected to MongoDB!"
      );
   } finally {
      // Ensures that the client will close when you finish/error
      //   await client.close();
   }
}
run().catch(console.dir);

// for testing
app.get("/", (req, res) => {
   res.send("luxEstate is Running");
});

// listen
app.listen(port, () => {
   console.log(`luxEstate is running at port: ${port}`);
});