import { getChannel, cfg } from '../rabbit.js';

function mockCapturePayment(order) {
  // simulate external gateway latency/success
  const ok = true;
  return { ok, txnId: 'TXN-' + order.id };
}

(async function start() {
  const ch = await getChannel();

  const queue = 'payment_queue';
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, cfg.EXCHANGE, 'order.created');

  console.log('Payment Consumer listening on', queue);
  ch.consume(queue, async (msg) => {
    try {
      const order = JSON.parse(msg.content.toString());
      console.log('↓ Payment received order', order.id);
      const result = mockCapturePayment(order);
      console.log('   Payment result:', result);

      // optional: publish payment.success / payment.failed
      const key = result.ok ? 'payment.success' : 'payment.failed';
      ch.publish(cfg.EXCHANGE, key, Buffer.from(JSON.stringify({
        orderId: order.id, ...result
      })), { persistent: true });

      ch.ack(msg);
    } catch (e) {
      console.error('Payment error:', e);
      ch.nack(msg, false, false);
    }
  });
})();
