// bob.js
import { io } from 'socket.io-client';

const socketBob = io('http://localhost:3001', {
  auth: {
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcHBBOmJvYiIsIm5hbWUiOiJCb2IiLCJpYXQiOjE3NjA5NjMxNzUsImV4cCI6MTc2MTU2Nzk3NX0.13HVvt0dxd98q7v8O5rWco7Kyyus0Z49gaqXuZWu9io',
  }, // replace with Bob’s actual JWT
});

socketBob.on('connect', () => {
  console.log('✅ Bob connected');
  socketBob.emit('join', 2); // join conversation #2
});

socketBob.on('new_message', (msg) => {
  console.log('📩 Bob received:', msg);
});
