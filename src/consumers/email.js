import { getChannel, cfg } from '../rabbit.js';

function mockSendEmail(order) {
  console.log(`[Email] Sent confirmation for Order #${order.id} to user ${order.userId}`);
}

(async function start() {
  const ch = await getChannel();

  const queue = 'email_queue';
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, cfg.EXCHANGE, 'order.created');

  console.log('Email Consumer listening on', queue);
  ch.consume(queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());
      console.log('↓ Email received order', order.id);
      mockSendEmail(order);

      // optional: publish email.sent
      ch.publish(cfg.EXCHANGE, 'email.sent', Buffer.from(JSON.stringify({
        orderId: order.id, userId: order.userId
      })), { persistent: true });

      ch.ack(msg);
    } catch (e) {
      console.error('Email error:', e);
      ch.nack(msg, false, false);
    }
  });
})();
