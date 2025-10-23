import { getChannel, cfg } from '../rabbit.js';

// pretend inventory DB
const INVENTORY = new Map([
  ['P123', 10],
  ['P678', 5],
  ['P999', 0]
]);

function decreaseStock(items) {
  for (const { productId, qty } of items) {
    const current = INVENTORY.get(productId) ?? 0;
    INVENTORY.set(productId, Math.max(0, current - (qty || 0)));
  }
}

(async function start() {
  const ch = await getChannel();

  const queue = 'inventory_queue';
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, cfg.EXCHANGE, 'order.created');

  console.log('Inventory Consumer listening on', queue);
  ch.consume(queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());
      console.log('↓ Inventory received order', order.id);
      decreaseStock(order.items);
      console.log('   Updated INVENTORY:', Object.fromEntries(INVENTORY));
      ch.ack(msg);

      // optional: publish inventory.updated
      // ch.publish(cfg.EXCHANGE, 'inventory.updated', Buffer.from(JSON.stringify({ orderId: order.id })), { persistent: true });
    } catch (e) {
      console.error('Inventory error:', e);
      // send to DLX or retry strategy – for demo, just NACK requeue=false
      ch.nack(msg, false, false);
    }
  });
})();
