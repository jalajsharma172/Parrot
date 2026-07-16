import express from 'express';

const router = express.Router();

// /api/ HTTP Requests


router.get('/rooms/:id', (req, res) => {
    const roomId = req.params.id.toUpperCase();
    res.json({ exists: true });
});

router.get('/categories', (req, res) => {
    res.json(['Mixed', 'Animals', 'Food', 'Objects', 'Places', 'Actions']);
});

export default router;
