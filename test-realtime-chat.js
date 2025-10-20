const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const { default: fetch } = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3001';
const WS_URL = 'http://localhost:3001';
const JWT_SECRET = 'your_shared_secret_here';

// Generate JWT tokens for Alice and Bob
const aliceToken = jwt.sign({ sub: 'appA:alice', name: 'Alice' }, JWT_SECRET, { expiresIn: '7d' });
const bobToken = jwt.sign({ sub: 'appA:bob', name: 'Bob' }, JWT_SECRET, { expiresIn: '7d' });

console.log('🚀 Starting Real-Time Chat Test');
console.log('================================');

// Step 1: Create conversation via HTTP API
async function createConversation() {
  console.log('\n📝 Step 1: Creating conversation between Alice and Bob...');

  try {
    const response = await fetch(`${BASE_URL}/conversations/private/appA:alice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bobToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ Conversation created:', data);
    return data.id;
  } catch (error) {
    console.error('❌ Failed to create conversation:', error.message);
    return null;
  }
}

// Step 2: Connect Alice via WebSocket
function connectAlice(conversationId) {
  console.log('\n🔌 Step 2: Connecting Alice via WebSocket...');

  const aliceSocket = io(WS_URL, {
    auth: { token: aliceToken },
    transports: ['websocket', 'polling'],
  });

  aliceSocket.on('connect', () => {
    console.log('🟢 Alice connected successfully');
  });

  aliceSocket.on('new_message', (message) => {
    console.log('📨 Alice received message:', message);
  });

  aliceSocket.on('user_typing', (data) => {
    console.log('⌨️  Alice sees typing indicator:', data);
  });

  aliceSocket.on('disconnect', () => {
    console.log('🔴 Alice disconnected');
  });

  return aliceSocket;
}

// Step 3: Connect Bob via WebSocket
function connectBob(conversationId) {
  console.log('\n🔌 Step 3: Connecting Bob via WebSocket...');

  const bobSocket = io(WS_URL, {
    auth: { token: bobToken },
    transports: ['websocket', 'polling'],
  });

  bobSocket.on('connect', () => {
    console.log('🟢 Bob connected successfully');
  });

  bobSocket.on('new_message', (message) => {
    console.log('📨 Bob received message:', message);
  });

  bobSocket.on('user_typing', (data) => {
    console.log('⌨️  Bob sees typing indicator:', data);
  });

  bobSocket.on('disconnect', () => {
    console.log('🔴 Bob disconnected');
  });

  return bobSocket;
}

// Step 4: Test real-time messaging
async function testRealTimeMessaging(aliceSocket, bobSocket, conversationId) {
  console.log('\n💬 Step 4: Testing real-time messaging...');

  // Bob sends first message
  setTimeout(() => {
    console.log('📤 Bob sending message...');
    bobSocket.emit('send_message', {
      conversationId,
      content: 'Hey Alice! 👋 This is Bob via WebSocket!'
    });
  }, 1000);

  // Alice starts typing
  setTimeout(() => {
    console.log('⌨️  Alice starts typing...');
    aliceSocket.emit('typing_start', conversationId);
  }, 2000);

  // Alice sends response
  setTimeout(() => {
    console.log('📤 Alice sending response...');
    aliceSocket.emit('send_message', {
      conversationId,
      content: 'Hi Bob! 👋 Nice to chat via WebSocket!'
    });
  }, 3000);

  // Alice stops typing
  setTimeout(() => {
    console.log('⌨️  Alice stops typing...');
    aliceSocket.emit('typing_stop', conversationId);
  }, 3500);

  // Bob sends another message
  setTimeout(() => {
    console.log('📤 Bob sending another message...');
    bobSocket.emit('send_message', {
      conversationId,
      content: 'WebSocket messaging is working perfectly! 🚀'
    });
  }, 4000);
}

// Step 5: Test HTTP API messaging
async function testHTTPMessaging(conversationId) {
  console.log('\n🌐 Step 5: Testing HTTP API messaging...');

  try {
    const response = await fetch(`${BASE_URL}/messages/${conversationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aliceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'This message was sent via HTTP API! 📡'
      }),
    });

    const data = await response.json();
    console.log('✅ HTTP message sent:', data);
  } catch (error) {
    console.error('❌ HTTP message failed:', error.message);
  }
}

// Main test function
async function runTest() {
  try {
    // Step 1: Create conversation
    const conversationId = await createConversation();
    if (!conversationId) {
      console.error('❌ Cannot proceed without conversation ID');
      return;
    }

    // Step 2-3: Connect both users
    const aliceSocket = connectAlice(conversationId);
    const bobSocket = connectBob(conversationId);

    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Test real-time messaging
    testRealTimeMessaging(aliceSocket, bobSocket, conversationId);

    // Step 5: Test HTTP API
    setTimeout(() => {
      testHTTPMessaging(conversationId);
    }, 5000);

    // Cleanup after test
    setTimeout(() => {
      console.log('\n🧹 Cleaning up connections...');
      aliceSocket.disconnect();
      bobSocket.disconnect();
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }, 8000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the test
runTest();