import express from 'express';
import cors from 'cors';
import { itemRoutes } from './routes/itemRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.use('/api/items', itemRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
