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
    const cartCollection = database.collection("cart");

    // brand details collection
    // get brandImage & name on homepage
    app.get("/brand", async (req, res) => {
      const cursor = allBrandCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // carDetails collection by brandName
    // get brandProducts(Cars) by brandName
    app.get("/brand/:brandName", async (req, res) => {
      const brandName = req.params.brandName;
      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );
      if (collectionName) {
        const brandNameCollection = collectionName.name;
        const cursor = database.collection(brandNameCollection).find();
        const result = await cursor.toArray();
        res.send(result);
      } else {
        res.send({ message: "No such Brand Found!" });
      }
    });

    // get car details by brandName & id
    app.get("/brand/:brandName/:id", async (req, res) => {
      const brandName = req.params.brandName;
      const id = req.params.id;

      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );

      // when collection found
      if (collectionName) {
        const brandNameCollection = collectionName.name;

        // make a query using id
        const query = { _id: new ObjectId(id) };

        // search to find the data in the collection
        // get the result
        const result = await database
          .collection(brandNameCollection)
          .findOne(query);
        res.send(result);
      } else {
        res.send({ message: "Brand or Car ID is incorrect" });
      }
    });

    // add new car to the db specified on brandName from addCar page
    app.post("/brand/:brandName", async (req, res) => {
      const brandName = req.params.brandName;
      const newCar = req.body;
      // console.log(brandName, newCar);

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

    // update car details from UpdateCarPage
    app.put("/brand/:brandName/:id", async (req, res) => {
      const id = req.params.id;
      const brandName = req.params.brandName;
      const details = req.body;

      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );

      // collection found
      if (collectionName) {
        const brandNameCollection = collectionName.name;
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedDetails = {
          $set: {
            name: details.name,
            brandName: details.brandName,
            type: details.type,
            price: details.price,
            image: details.image,
            rating: details.rating,
            description: details.description,
          },
        };
        const result = await database
          .collection(brandNameCollection)
          .updateOne(filter, updatedDetails, options);
        res.send(result);
      }
      // collection not found
      else {
        res.send("No such brand");
      }
    });

    // delete carDetails from carCollection using brandName & id
    app.delete("/brand/:brandName/:id", async (req, res) => {
      const id = req.params.id;
      const brandName = req.params.brandName;
      // find the collection based on brandName
      const collections = await database.listCollections().toArray();
      const collectionName = collections.find(
        (collection) => collection.name === brandName
      );
      // collection found
      if (collectionName) {
        const brandNameCollection = collectionName.name;
        const query = { _id: new ObjectId(id) };
        const result = await database
          .collection(brandNameCollection)
          .deleteOne(query);
        res.send(result);
      } else {
        res.send("Error occurred");
      }
    });

    // cart items collection
    // get cart items on My Cart page
    app.get("/cart", async (req, res) => {
      const cursor = cartCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // add items to cart collection from CarDetailsInfoPage using userEmail as unique identifier
    app.post("/cart/:userEmail", async (req, res) => {
      const userEmail = req.params.userEmail;
      const cartItem = req.body;

      // Add the userEmail to the cartItem document
      cartItem.userEmail = userEmail;

      const found = await cartCollection.findOne({
        name: cartItem.name,
        userEmail: userEmail,
      });
      if (found) {
        res.send("Already exists in DB");
      } else {
        // Manually generate a customId
        cartItem.prevId = cartItem._id;
        // Remove _id property if it's present in the request body
        delete cartItem._id;
        const result = await cartCollection.insertOne(cartItem);
        res.send(result);
      }
    });

    // delete items from cart collection from MyCartPage
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      // as the id is in string type so can't directly query
      // first we have to find the specified item
      const query = await cartCollection.find().toArray();
      const found = query.find((search) => search._id === id);
      const result = await cartCollection.deleteOne(found);
      res.send(result);
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
