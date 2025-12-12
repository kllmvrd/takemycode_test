import { Router, Request, Response } from 'express';
import { dataStoreService, SseEvent } from '../services/DataStore.service';

export const itemRoutes = Router();

itemRoutes.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = (event: SseEvent) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    dataStoreService.on('update', sendUpdate);

    req.on('close', () => {
        dataStoreService.off('update', sendUpdate);
        res.end();
    });
});

itemRoutes.get('/available', (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
        const filter = req.query.filter as string | undefined;

        const result = dataStoreService.getAvailableItems({ page, limit, filter });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

itemRoutes.get('/selected', (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
        const filter = req.query.filter as string | undefined;

        const result = dataStoreService.getSelectedItems({ page, limit, filter });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

itemRoutes.post('/queue', (req, res) => {
    try {
        const { id } = req.body;
        if (typeof id !== 'number') {
            return res.status(400).json({ message: 'Invalid ID provided' });
        }
        const status = dataStoreService.queueNewItem(id);
        if(status) {
            return res.status(202).json({ message: 'Item queued for addition' });
        } 
        return res.status(400).json({message: 'Already Exist'})
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

itemRoutes.post('/select', (req, res) => {
    try {
        const { id } = req.body;
        if (typeof id !== 'number') {
            return res.status(400).json({ message: 'Invalid ID provided' });
        }
        dataStoreService.selectItem(id);
        res.status(202).json({ message: 'Select action queued' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

itemRoutes.post('/deselect', (req, res) => {
    try {
        const { id } = req.body;
        if (typeof id !== 'number') {
            return res.status(400).json({ message: 'Invalid ID provided' });
        }
        dataStoreService.deselectItem(id);
        res.status(202).json({ message: 'Deselect action queued' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

itemRoutes.post('/move', (req, res) => {
    try {
        const { draggedItemId, targetItemId } = req.body;
        if (typeof draggedItemId !== 'number') {
            return res.status(400).json({ message: 'Invalid draggedItemId provided' });
        }
        dataStoreService.moveSelectedItem(draggedItemId, targetItemId);
        res.status(202).json({ message: 'Move action queued' });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
