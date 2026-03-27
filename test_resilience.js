// test_resilience.js

const API_URL = 'http://localhost:3004/api/chat';
const DOC_ID = 2; // Adjust to your actual document ID

async function testResilience() {
    console.log('🚀 Starting Resilience Test...');
    console.log('--- Phase 1: Verification of /api/health ---');
    try {
        const health = await fetch('http://localhost:3004/api/health');
        console.log('✅ Health:', await health.json());
    } catch (e) {
        console.error('❌ Health failed. Is server running on 3004?');
        return;
    }

    console.log('\n--- Phase 2: Testing Chat with Backoff/Fallback Simulation ---');
    console.log('Sending chat request...');
    
    // Note: To truly test 429, you might need to spam the API 
    // or temporarily mock the Gemini call to throw a 429 in chat.js
    
    const start = Date.now();
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: "What is this document about?",
            documentId: DOC_ID,
            userId: 'test-user-resilience'
        })
    });

    const end = Date.now();
    console.log(`⏱️ Response received in ${end - start}ms`);
    
    if (response.ok) {
        console.log('✅ Response OK (Regular AI or Fallback Snippet)');
        const text = await response.text();
        console.log('Content Preview:', text.substring(0, 200).replace(/\n/g, ' '));
        if (text.includes('System Note')) {
            console.log('🎯 SUCCESS: Snippet Fallback triggered and reported.');
        } else {
            console.log('🌟 SUCCESS: Regular AI response received.');
        }
    } else {
        console.log(`❌ Response Error: ${response.status}`);
        console.log(await response.json());
    }
}

testResilience();
