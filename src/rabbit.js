import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';
const EXCHANGE = process.env.EXCHANGE || 'order.events';

// single connection reused by all publishers/consumers in a process
let _conn, _ch;

export async function getChannel() {
  if (_ch) return _ch;
  _conn = await amqp.connect(AMQP_URL);
  _ch = await _conn.createChannel();

  // topic exchange allows selective routing (order.created, order.cancelled, etc.)
  await _ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  return _ch;
}

export const cfg = { EXCHANGE };
