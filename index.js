require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://marathon-system.web.app',
        'https://marathon-system.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {
    // console.log(req.cookies?.token)

    const token = req?.cookies?.token;

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })

}


app.get('/', (req, res) => {
    res.send('Marathon System is running')
})

app.listen(port, () => {
    // console.log(`Marathon is waiting at: ${port}`)
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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // marathon related apis
        const marathonCollection = client.db('marathonSystem').collection('marathons');
        const registrationsCollection = client.db('marathonSystem').collection('registrations');

        // Auth related APIs
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true });
        })

        app.post('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true })
        })

        // marathon related apis
        app.get('/marathons', async (req, res) => {
            const cursor = marathonCollection.find().limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/marathons', async (req, res) => {
            const newMarathon = req.body;
            const result = await marathonCollection.insertOne(newMarathon);
            res.send(result);
        })

        app.get('/marathons/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const marathon = await marathonCollection.findOne(query);
            res.send(marathon);
        })

        app.delete('/marathons/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await marathonCollection.deleteOne(query);
            res.send(result);
        })

        app.put('/marathons/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedMarathon = req.body;

            const marathon = {
                $set: {
                    title: updatedMarathon.title,
                    location: updatedMarathon.location,
                    distance: updatedMarathon.distance,
                    description: updatedMarathon.description
                }
            }

            const result = await marathonCollection.updateOne(filter, marathon, options);
            res.send(result);
        })

        app.get('/myMarathons', verifyToken, async (req, res) => {
            const email = req.query.email;
            const filter = { email };

            if (req.decoded.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            const cursor = marathonCollection.find(filter);
            const result = await cursor.toArray();

            for (const application of result) {
                const query1 = { _id: new ObjectId(application.marathonId) };
                application.marathonDetails = await marathonCollection.findOne(query1);
            }

            res.send(result);
        });



        app.post('/registrations', async (req, res) => {
            const registrationData = req.body;
            const result = await registrationsCollection.insertOne(registrationData);
            res.send(result);
        });

        app.get('/registrations', async (req, res) => {
            const cursor = registrationsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/myApply", verifyToken, async (req, res) => {
            const email = req.query.email;
            const filter = { userEmail: email };

            if (req.decoded.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            const cursor = registrationsCollection.find(filter);
            const result = await cursor.toArray();

            for (const application of result) {
                const query1 = { _id: new ObjectId(application.marathonId) };
                application.marathonDetails = await marathonCollection.findOne(query1);
            }

            res.send(result);
        });


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
