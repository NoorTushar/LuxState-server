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

      // ======= Start: States related APIs =======

      // get all the states, also based on queries
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

         console.log(query);
         try {
            const result = await statesCollection.find(query).toArray();
            res.send(result);
         } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred while fetching estates");
         }
      });

      // get recent properties
      app.get("/recent", async (req, res) => {
         const result = await statesCollection
            .find({
               "location.country": "Bangladesh",
               "location.division": "Dhaka",
            })
            .limit(4)
            .toArray();
         res.send(result);
      });

      // get all the rent commercial properties
      app.get("/rent-comm", async (req, res) => {
         const result = await statesCollection
            .find({ category: "commercial", status: "rent" })
            .toArray();
         res.send(result);
      });

      // get all the rent residential properties
      app.get("/rent-res", async (req, res) => {
         const result = await statesCollection
            .find({ category: "residential", status: "rent" })
            .toArray();
         res.send(result);
      });

      // get all the buy commercial properties
      app.get("/buy-comm", async (req, res) => {
         const result = await statesCollection
            .find({ category: "commercial", status: "buy" })
            .toArray();
         res.send(result);
      });

      // get all the buy commercial properties
      app.get("/buy-res", async (req, res) => {
         const result = await statesCollection
            .find({ category: "residential", status: "buy" })
            .toArray();
         res.send(result);
      });

      // ======= End: States related APIs =======

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

      // get all unique countries only, different logic
      app.get("/uniqueCountries", async (req, res) => {
         // here we will get all the estates data with only country fields
         const countries = await statesCollection
            .find({}, { projection: { "location.country": 1, _id: 0 } })
            .toArray();

         // create an array which will have unique country names
         const uniqueCountries = [];

         // now map the mongoDb data and for each item check if
         // the country name is already present in the unique country array.
         // if not then push.
         countries.forEach((country) => {
            if (!uniqueCountries.includes(country.location.country)) {
               uniqueCountries.push(country.location.country);
            }
         });

         // return the unique countries as response
         res.send(uniqueCountries);
      });

      // get unique divisions based on a country selected
      app.get("/uniqueDivisions", async (req, res) => {
         const selectedCountry = req.query.country;
         const data = await statesCollection
            .find({}, { projection: { location: 1, _id: 0 } })
            .toArray();

         const uniqueDivisions = [];

         data.forEach((eachData) => {
            if (eachData.location.country === selectedCountry) {
               if (!uniqueDivisions.includes(eachData.location.division)) {
                  uniqueDivisions.push(eachData.location.division);
               }
            }
         });

         res.send(uniqueDivisions);
      });

      // get unique areas based on a country selected
      app.get("/uniqueAreas", async (req, res) => {
         const selectedCountry = req.query.country;
         const data = await statesCollection
            .find({}, { projection: { location: 1, _id: 0 } })
            .toArray();

         const uniqueAreas = [];

         data.forEach((eachData) => {
            const area = eachData.location.area;
            const country = eachData.location.country;

            if (selectedCountry) {
               // When a country is selected
               if (country === selectedCountry) {
                  // Check if the area matches the selected country
                  if (area && !uniqueAreas.includes(area)) {
                     // Add area to uniqueAreas if it is not already included
                     uniqueAreas.push(area);
                  }
               }
            } else {
               // When no country is selected
               if (area && !uniqueAreas.includes(area)) {
                  // Add area to uniqueAreas if it is not already included
                  uniqueAreas.push(area);
               }
            }
         });

         res.send(uniqueAreas);
      });

      // search api for the search page
      // Backend endpoint to handle search queries
      app.get("/search", async (req, res) => {
         const { options, type, country, area } = req.query;

         // Build the query dynamically based on the provided parameters
         const query = {};
         if (options) query.status = options;
         if (type) query.category = type;
         if (country) query["location.country"] = country;
         if (area) query["location.area"] = area;

         console.log(query);
         try {
            const results = await statesCollection.find(query).toArray();
            res.send(results);
         } catch (error) {
            res.status(500).send({
               error: "An error occurred while fetching data",
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
