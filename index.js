import express from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';
const app = express()
const PORT = 8000

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
const mongoClient = await connectToMongoDB()
const db = mongoClient.db('serveTogether')
const eventCollection = db.collection('event')
const joinedEventCollection = db.collection('joinedEvents')

const varifyToken = async(req, res, next)=>{
    const authHeader = req.headers.authorization
    if(!authHeader){
      return res.status(401).send({msg:'Unauthorized!'})
    }
    const token = authHeader.split(" ")[1]
    if(!token){
      return res.status(401).send({msg:'Unauthorized!'})
    }
    
    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'))
    try{
      const {payload} = await jwtVerify(token, JWKS)
      next()
    }catch{
      return res.status(500).send({msg:'Server Error!'})
    }
}

// http://localhost:8000/create-event
app.post('/create-event',  async(req, res)=>{
    const data = req.body
    const result = await eventCollection.insertOne(data)
    console.log(result)
    res.send(result)
} )

app.get('/upcoming-events', async(req, res)=>{
  const result = await eventCollection.find().toArray()
  res.send(result)
})

app.get('/upcoming-event/:id', async(req, res)=>{
  const {id} = req.params
  const result = await eventCollection.findOne({_id: new ObjectId(id)})
  res.send(result)
})

app.get('/my-events/:email', async (req, res) => {
  const { email } = req.params
  const result = await eventCollection.find({ organizerEmail: email }).toArray()
  res.send(result)
})
app.patch('/update-event/:id', async (req, res) => {
  const result = await eventCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  )

  res.send(result)
})

app.delete('/delete-event/:id', async (req, res) => {
  const { id } = req.params

  const result = await eventCollection.deleteOne({
    _id: new ObjectId(id)
  })

  res.send(result)
})

app.post('/join-event', async (req, res) => {
  const { eventId, userEmail } = req.body
  const alreadyJoined = await joinedEventCollection.findOne({
    eventId,
    userEmail
  })
  if (alreadyJoined) {
    return res.send({ message: 'Already joined' })
  }
  const result = await joinedEventCollection.insertOne({
    eventId,
    userEmail,
    joinedAt: new Date()
  })

  res.send(result)
})
app.get('/joined-events/:email' , varifyToken, async (req, res) => {
  const { email } = req.params

  const joinedEvents = await joinedEventCollection
    .find({ userEmail: email })
    .toArray()

  res.send(joinedEvents)
})

// http://localhost:8000
app.get('/', (req, res)=>{
    res.send({message:'Server is running fine!'})
})

app.listen(PORT,()=>{
    console.log(`Server is running at ${PORT}`)
})