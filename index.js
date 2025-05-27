require("dotenv").config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Marathon System is running')
})

app.listen(port, () => {
    console.log(`Marathon is waiting at: ${port}`)
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.daisl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // marathon related apis
        const marathonCollection = client.db('marathonSystem').collection('marathons');

        app.get('/marathons', async (req, res) => {
            const cursor = marathonCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/marathons', async (req, res) => {
            const newMarathon = req.body;
            const result = await marathonCollection.insertOne(newMarathon);
            res.send(result);
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
