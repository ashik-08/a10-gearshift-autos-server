const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5001;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ya8cack.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    // Connect to the "gearShift-autos" database and access its "brand" collection
    const database = client.db("gearShift-autos");
    const allBrandCollection = database.collection("brand");

    // brand details collection
    // get brandImage & name on homepage
    app.get("/brand", async (req, res) => {
      const cursor = allBrandCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get brandProducts by brandName
    app.get("/brand/:brandName", async (req, res) => {
      const brandName = req.params.brandName;
      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );
      const brandNameCollection = collectionName.name;
      const cursor = database.collection(brandNameCollection).find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // add new car to the db specified on brandName from addCar page
    app.post("/brand/:brandName", async (req, res) => {
      const brandName = req.params.brandName;
      const newCar = req.body;
      console.log(brandName, newCar);

      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );
      // collection found
      if (collectionName) {
        const brandNameCollection = collectionName.name;
        // query to find all data in the collection
        const query = await database
          .collection(brandNameCollection)
          .find()
          .toArray();
        // check if there is already an item with that carName
        const found = query.find(
          (search) => search.name === newCar.name && search.type === newCar.type
        );
        console.log(found.name);
        if (found) {
          res.send("Already exists in DB");
        }
        // insert a new car into the collection
        else {
          const result = await database
            .collection(brandNameCollection)
            .insertOne(newCar);
          res.send(result);
        }
      }
      // collection not found
      else {
        res.send(`No such brand ${brandName}`);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("GearShift server is running!");
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
