const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z9xqo9p.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const menuCollection = client.db('FinalRestaurant').collection('menu');
    const userCollection = client.db('FinalRestaurant').collection('users');
    const reviewsCollection = client.db('FinalRestaurant').collection('reviews');
    const cartCollection = client.db('FinalRestaurant').collection('cart');
    const parcelCollection = client.db('FinalRestaurant').collection('parcel');
    const userReviewCollection = client.db('FinalRestaurant').collection('userReviews');


    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users related api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // app.get('/users/admin/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }

    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   let admin = false;
    //   if (user) {
    //     admin = user?.role === 'admin';
    //   }
    //   res.send({ admin });
    // })

    //   app.get('/users/deliverMen/:email', verifyToken, async (req, res) => {
    //     const email = req.params.email;
    //     if (email !== req.decoded.email) {
    //         return res.status(403).send({ message: 'Forbidden access' });
    //     }

    //     const query = { email: email };
    //     const user = await userCollection.findOne(query);
    //     let deliverMen = false;
    //     if (user) {
    //         deliverMen = user?.role === 'deliverMen';
    //     }
    //     res.send({ deliverMen });
    // });

    // delete
    app.get('/users/roles/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      let isDeliverMen = false;
      let isUser = false;

      if (user) {
        isAdmin = user?.role === 'admin';
        isDeliverMen = user?.role === 'deliverMen';
        isUser = user?.role === 'user';
      }

      res.send({ isAdmin, isDeliverMen, isUser });
    });

    // delete
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.put('/user/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedUser = req.body;
      const food = {
        $set: {
          name: updatedUser.name,
          email: updatedUser.email,
          photo: updatedUser.photo
        }
      }
      const result = await foodCollection.updateOne(filter, food, options)
      res.send(result);

    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.patch('/users/deliveryMen/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'deliverMen'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // parcel related apis
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    // Parcels
    //   app.get('/parcels', async(req,res) => {
    //     const cursor = parcelCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    // })

    app.get('/parcels', async (req, res) => {
      const { startDate, endDate } = req.query;

      let query = {};

      if (startDate && endDate) {
        query = {
          requestedDate: {
            $gte: new Date(startDate + "T00:00:00.000Z"), // Filter greater than or equal to startDate
            $lte: new Date(endDate + "T23:59:59.999Z"),   // Filter less than or equal to endDate
          },
        };
      }

      const cursor = parcelCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/parcel-by-email', async (req, res) => {
      const email = req.query.email;
      const query = { email };
      try {
        const parcelItems = await parcelCollection.find(query).toArray();
        res.json(parcelItems);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching cart items.' });
      }
    });

    // app.get('/parcel-by-delivery-men', async (req, res) => {
    //   const email = req.query.email; 
    //   const query = { selectedDeliveryMen: email, status: 'onTheWay' }; // Filter by selectedDeliveryMen and status
    //   try {
    //     const parcelItems = await parcelCollection.find(query).toArray();
    //     res.json(parcelItems);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'An error occurred while fetching parcel items.' });
    //   }
    // });

    app.get('/parcel-by-delivery-men', async (req, res) => {
      const email = req.query.email;
      try {
        const parcelItems = await parcelCollection.find({
          selectedDeliveryMen: email,
          status: { $in: ['onTheWay', 'delivered'] } // Fetch items with 'onTheWay' or 'delivered' statuses
        }).toArray();
        res.json(parcelItems);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching parcel items.' });
      }
    });


    //   app.get('/parcels', async(req,res) => {
    //     const cursor = parcelCollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);
    // })

    app.post('/parcels', async (req, res) => {
      const parcelItem = req.body;
      const result = await parcelCollection.insertOne(parcelItem);
      res.send(result);
    });

    // On the way Status
    app.put('/parcels/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedParcel = req.body;
      const parcel = {
        $set: {
          approximateDeliveryDate: updatedParcel.approximateDeliveryDate,
          selectedDeliveryMen: updatedParcel.selectedDeliveryMen,
          status: updatedParcel.status,
        }
      }
      const result = await parcelCollection.updateOne(filter, parcel, options)
      res.send(result);

    })
    // Delivered Status
    app.put('/parcels/delivered/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedParcel = req.body;
      const parcel = {
        $set: {
          deliveryDate: updatedParcel.deliveryDate,
          selectedDeliveryMen: updatedParcel.selectedDeliveryMen,
          status: updatedParcel.status,
        }
      }
      const result = await parcelCollection.updateOne(filter, parcel, options)
      res.send(result);

    })
    app.get('/parcel/:id', async(req,res)=> {
          const id = req.params.id;
          const query = {_id: new ObjectId(id)}
          const result = await parcelCollection.findOne(query);
          res.send(result);
      })
      app.put('/parcel/:id', async(req,res) => {
        const id = req.params.id;
          const filter = {_id: new ObjectId(id)}
          const options = {upsert:true};
          const updatedParcel = req.body;
          const parcel = {
              $set:{
                userName: updatedParcel.name,
                email: updatedParcel.email,
                number: updatedParcel.number,
                type: updatedParcel.type,
                weight:updatedParcel.weight,
                receiversName:updatedParcel.receiversName,
                receiversNumber:updatedParcel.receiversNumber,
                requestedDate: updatedParcel.requestedDate,
                deliveryAddress: updatedParcel.deliveryAddress,
                latitude: updatedParcel.latitude,
                longitude: updatedParcel.longitude,
                price: updatedParcel.price
              }
          }
          const result = await parcelCollection.updateOne(filter,parcel,options)
          res.send(result);
  
      })

    // app.delete('/carts/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await cartCollection.deleteOne(query);
    //   res.send(result);
    // })

    app.get('/review-by-delivery-men', async (req, res) => {
      const email = req.query.email;
      const query = { selectedDeliveryMen: email }; // Filter by selectedDeliveryMen and status
      try {
        const reviewItems = await userReviewCollection.find(query).toArray();
        res.json(reviewItems);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching parcel items.' });
      }
    });

    app.post('/userReviews', async (req, res) => {
      const reviewItem = req.body;
      const result = await userReviewCollection.insertOne(reviewItem);
      res.send(result);
    });

    app.get('/userReviews', async (req, res) => {
      const { parcelId, selectedDeliveryMen, email } = req.query;

      try {
        // Your MongoDB query to find the matching review
        // const existingReview = await userReviewCollection.findOne({ ... });

        // Simulating the existence check based on the query parameters
        // Replace this with your actual MongoDB query
        const existingReview = { /* Your query to find the review */ };

        if (existingReview) {
          // If a review exists, send a response indicating the review exists
          res.json({ exists: true });
        } else {
          // If no review exists, send a response indicating the review does not exist
          res.json({ exists: false });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while checking for the review.' });
      }
    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Project is Running')
})

app.listen(port, () => {
  console.log(`PH Courier Project is Running on port ${port}`);
})
