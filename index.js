const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;



app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.21hcnfr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Custom Middlwares 
const verifyToken = async(req, res, next) => {
    const token = req?.cookies?.token;

    if(!token){
        return res.status(401).send({ message : 'UnAuthorized Access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({ message: 'UnAuthorized Access' } )
        }
        req.user = decoded;
        next()
    })
}

async function run() {
    try {
        // await client.connect();
        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingsCollection = client.db('carDoctor').collection('bookings');

        // Auth Related Apis 
        app.post('/jwt', async(req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr'})
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
            .send({ success: true });
        })
        
        app.post('/logout', async(req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0}).send({ success: true })
        })

        // Service Related Apis 
        app.get('/services', async(req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await serviceCollection.findOne(query);
            res.send(result);
        })

        // Bookings Related Apis 
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        app.get('/bookings', verifyToken, async(req, res) => {
            if (req.query.email !== req.user.email){
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            let query = {};
            if(req.query?.email){
                query ={ email: req.query.email }
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.patch('/bookings/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id)}
            const updateBooking = req.body;
            const updateDoc = {
                $set: {
                    status : updateBooking.status
                }
            }
            const result = await bookingsCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        })

        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Abc Service is running');
})

app.listen(port, () => {
    console.log('Abc Services running on Port', port);
})