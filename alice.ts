// alice.js
import { io } from 'socket.io-client';

// ✅ Connect as Alice
const socketAlice = io('http://localhost:3001', {
  auth: {
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcHBBOjEiLCJuYW1lIjoiQWxpY2UiLCJpYXQiOjE3NjA5NzYzNjgsImV4cCI6MTc2MTU4MTE2OH0.q6SD9q-4FC0Rr9x7Q0o8m57YBukjlGDegAbeDT_jObk',
  },
});

socketAlice.on('connect', () => {
  console.log('✅ Alice connected');

  // ✅ Join conversation 2
  socketAlice.emit('join', 2);

  // ✅ Send a message after joining
  setTimeout(() => {
    socketAlice.emit('send_message', {
      conversationId: 2,
      content: 'Hey Bob 👋 — this one is via WebSocket!',
    });
  }, 2000);
});

// ✅ Listen for new messages
socketAlice.on('new_message', (msg) => {
  console.log('👩 Alice received:', msg);
});

socketAlice.on('disconnect', () => {
  console.log('❌ Alice disconnected');
});
