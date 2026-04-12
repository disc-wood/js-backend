import express from 'express';
import postgresProvider from '../providers/postgresProvider.js';


const router = express.Router();

router.get('/getAll', async (req, res) => { // provider functions can't be used directly as route handlers because they don't have the req, res signature.
    try {
    const data = await postgresProvider.getAll(); // we need to call the provider.
    res.json(data); // store the result of call into a variable and then send it as json response.
    } 
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.get('/getAverageAge', async (req, res) => {
    try {
        const data = await postgresProvider.getAverageAge(); // we need to call the provider.
        res.json(data); // store the result of call into a variable and then send it as json response.
    } 
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

router.post('/upsertUser', async (req, res) => {
    try {
        const { firstname, lastname, email, age } = req.body;
        const data = await postgresProvider.upsertUser({ firstname, lastname, email, age });
        res.json(data);
    }
    catch (error) { 
        res.status(500).json({ error: 'Failed to fetch data' });
    }
}); // send data in the request body, pull the data out of req.body then give to provider.

router.post('/createStudent', async (req, res) => {
   try { 
        const { firstname, lastname, email, age } = req.body;
        const data = await postgresProvider.createStudent({ firstname, lastname, email, age });
        res.json(data);
   }
   catch (error) { 
        res.status(500).json({ error: 'Failed to fetch data'})
   } 
});

export default router;