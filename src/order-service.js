import express from 'express';
import { nanoid } from 'nanoid';
import { getChannel, cfg } from './rabbit.js';

const app = express();
app.use(express.json());

// pretend DB (in-memory)
const ORDERS = new Map();

/**
 * POST /api/orders
 * body: { userId, items: [{productId, qty}], paymentMethod }
 */
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items = [], paymentMethod = 'card' } = req.body || {};
    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    // 1) Save order (mock DB)
    const orderId = nanoid(10);
    const order = {
      id: orderId,
      userId,
      items,
      paymentMethod,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    ORDERS.set(orderId, order);

    // 2) Publish event
    const ch = await getChannel();
    const routingKey = 'order.created';
    const message = Buffer.from(JSON.stringify(order));
    ch.publish(cfg.EXCHANGE, routingKey, message, {
      persistent: true,            // survive broker restarts (if queue durable)
      contentType: 'application/json',
      headers: { event: 'order.created' }
    });

    // 3) Fast response to frontend
    return res.status(201).json({
      message: 'Order placed successfully',
      orderId,
      status: order.status
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ message: 'Internal error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Order Service running http://localhost:${PORT}`)
);
