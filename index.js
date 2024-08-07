const express = require("express");
const app = express();
const nodemailer = require("nodemailer");
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
      const statesCollection = client.db("luxState").collection("estates");
      const usersCollection = client.db("luxState").collection("users");
      const servicesCollection = client.db("luxState").collection("services");

      // estates related APIs

      app.get("/estates", async (req, res) => {
         const country = req.query.country;
         const size = req.query.size;
         const status = req.query.status;
         const division = req.query.division;
         console.log(division);
         // Build the query object dynamically
         let query = {};
         if (country) {
            query["location.country"] = country;
         }
         if (division) {
            query["location.division"] = division;
         }
         if (size) {
            query["area"] = { $lte: parseInt(size) };
         }
         if (status) {
            query["status"] = status;
         }

         try {
            const result = await statesCollection.find(query).toArray();
            res.send(result);
         } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred while fetching estates");
         }
      });

      // get all unique countries
      app.get("/countries", async (req, res) => {
         // this will get all the unique countries and divisions
         try {
            const results = await statesCollection
               .aggregate([
                  {
                     $group: {
                        _id: null,
                        uniqueCountries: { $addToSet: "$location.country" },
                        uniqueDivisions: { $addToSet: "$location.division" },
                     },
                  },
                  {
                     $project: {
                        _id: 0,
                        uniqueCountries: 1,
                        uniqueDivisions: 1,
                     },
                  },
               ])
               .toArray();

            if (results.length > 0) {
               res.send({
                  countries: results[0].uniqueCountries,
                  divisions: results[0].uniqueDivisions,
               });
            } else {
               res.send({ countries: [], divisions: [] });
            }
         } catch (error) {
            console.error("Error fetching countries:", error);
            res.status(500).send({
               error: "An error occurred while fetching countries.",
            });
         }
      });

      // ======= Start: Featured APIs =======

      app.get("/featured", async (req, res) => {
         const query = { featured: true };
         try {
            const result = await statesCollection.find(query).toArray();
            res.send(result);
         } catch (error) {
            console.error(error);
            res.status(500).send(
               "An error occurred while fetching featured estates"
            );
         }
      });

      // ======= End: Featured APIs =======

      // ======= Start: Users related APIs =======

      // get all the users
      app.get("/users", async (req, res) => {
         const result = await usersCollection.find().toArray();
         res.send(result);
      });

      // create a new user and store in our database
      app.post("/users", async (req, res) => {
         const user = req.body;

         const result = await usersCollection.insertOne(user);
         res.send(result);
      });

      // ======= End: Users related APIs =======

      // ======= Start: Services related APIs =======

      // get all the services
      app.get("/services", async (req, res) => {
         const result = await servicesCollection.find().toArray();
         res.send(result);
      });

      // ======= End: Services related APIs =======

      // Route to handle form submissions
      app.post("/contact", async (req, res) => {
         const { firstName, lastName, address, email, comment, phone } =
            req.body;
         console.log(req.body);
         const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
               user: process.env.EMAIL_USER, // Sender email address
               pass: process.env.EMAIL_PASS, // Sender email password
            },
         });

         const mailOptions = {
            from: process.env.EMAIL_USER, // Sender email address
            to: "blspacer@gmail.com", // Recipient email address
            subject: "Message from Website",
            text: `You have received a new message from ${firstName} ${lastName} (${email}).\n\nAddress: ${address}\n\nComment: ${comment} \n\nContact Number: ${phone}`,
         };

         try {
            await transporter.sendMail(mailOptions);
            res.status(200).send("Message sent successfully");
         } catch (error) {
            console.error("Error sending email:", error);
            res.status(500).send("Error sending message");
         }
      });

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
