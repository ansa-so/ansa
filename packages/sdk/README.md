# @ansa-so/sdk

The official JavaScript/TypeScript SDK for [Ansa](https://ansa.so) - AI agents that actually do things.

## Features

- 🤖 **Chat API** - Send messages and get responses from AI agents
- 🌊 **Streaming** - Real-time streaming responses with callbacks
- 🔌 **Widget Embed** - Easily embed the chat widget on any website
- 🎛️ **Widget Control** - Programmatically control the widget (open, close, forms, etc.)
- 📝 **TypeScript** - Full type definitions included
- ⚡ **Command Queuing** - Commands are queued until widget is ready

## Installation

```bash
npm install @ansa-so/sdk
# or
pnpm add @ansa-so/sdk
# or
yarn add @ansa-so/sdk
```

## Quick Start

```typescript
import { createClient } from '@ansa-so/sdk';

const ansa = createClient({
  apiKey: 'your-api-key', // Get from dashboard
});

// Send a message
const response = await ansa.chat('agent-id', 'What are your business hours?');
console.log(response.message);
```

## Streaming

```typescript
await ansa.chatStream('agent-id', 'Tell me about your products', {
  onToken: (token) => process.stdout.write(token),
  onComplete: () => console.log('\n--- Done ---'),
  onError: (error) => console.error(error),
});
```

## Widget Embed

For simple website integration, use the embed helper:

```typescript
import { embedWidget } from '@ansa-so/sdk';

embedWidget({
  agentId: 'your-agent-id',
});
```

Or use the script tag directly:

```html
<script>
  window.__ansa_config = {
    agentId: 'your-agent-id',
  };
</script>
<script src="https://cdn.ansa.so/embed.js"></script>
```

## Widget Control

Control the widget programmatically after embedding:

### `openWidget(initMessage?)`

Open the widget chat. Optionally show initial greeting message(s) from the assistant.

```typescript
import { openWidget } from '@ansa-so/sdk';

// Just open
openWidget();

// Open with a single greeting message
openWidget('Hello! How can I help you today?');

// Open with multiple greeting messages
openWidget(['Welcome!', 'I can help you with orders, returns, and more.']);
```

### `closeWidget()`

Close the widget chat.

```typescript
import { closeWidget } from '@ansa-so/sdk';

closeWidget();
```

### `toggleWidget()`

Toggle the widget open/closed.

```typescript
import { toggleWidget } from '@ansa-so/sdk';

toggleWidget();
```

### `isWidgetOpen()`

Check if the widget is currently open.

```typescript
import { isWidgetOpen } from '@ansa-so/sdk';

if (isWidgetOpen()) {
  console.log('Widget is open');
}
```

### `isWidgetReady()`

Check if the widget has finished loading.

```typescript
import { isWidgetReady } from '@ansa-so/sdk';

if (isWidgetReady()) {
  console.log('Widget is ready');
}
```

### `showBubbles(messages, duration?)`

Show bubble message(s) near the widget button. Multiple messages are displayed with staggered timing.

```typescript
import { showBubbles } from '@ansa-so/sdk';

// Single bubble
showBubbles('Need help?');

// Multiple bubbles (displayed 1 second apart)
showBubbles(['Any questions?', "I'm here to help!"]);

// Auto-hide after 10 seconds
showBubbles('Limited time offer!', 10);
```

### `hideBubbles()`

Hide any visible bubble messages.

```typescript
import { hideBubbles } from '@ansa-so/sdk';

hideBubbles();
```

### `showForm(form, options?)`

Show a form in the widget. Can be a server-side form (by name) or a client-side form (with schema).

```typescript
import { showForm } from '@ansa-so/sdk';

// Server-side form (fetched from your dashboard)
showForm('contact_form');

// Client-side form with callback
showForm({
  title: 'Get a Quote',
  fields: [
    { name: 'email', label: 'Email', type: 'email', validation: { required: { value: true, message: 'Required' } } },
    { name: 'budget', label: 'Budget', type: 'select', options: [
      { label: '$1,000 - $5,000', value: '1000-5000' },
      { label: '$5,000 - $10,000', value: '5000-10000' },
      { label: '$10,000+', value: '10000+' },
    ]},
    { name: 'message', label: 'Message', type: 'textarea' },
  ],
  submitButtonText: 'Request Quote',
}, {
  onSubmit: (data) => {
    console.log('Form submitted:', data);
    fetch('/api/quotes', { method: 'POST', body: JSON.stringify(data) });
  },
  onCancel: () => {
    console.log('Form cancelled');
  },
});

// Send form data to the agent as a chat message
showForm({
  title: 'Contact Us',
  fields: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'question', label: 'Question', type: 'textarea' },
  ],
}, {
  sendToAgent: true, // Form data becomes a chat message
});

// Both: callback AND send to agent
showForm({ ... }, {
  onSubmit: (data) => analytics.track('form_submit', data),
  sendToAgent: true,
});
```

### `triggerEvent(eventName, data?)`

Trigger a custom event. Useful for custom_event triggers configured in your dashboard.

```typescript
import { triggerEvent } from '@ansa-so/sdk';

// Trigger when user adds item to cart
triggerEvent('add_to_cart', { productId: '123', price: 29.99 });

// Trigger on checkout
triggerEvent('checkout_started');
```

### `identify(identity)`

Identify the current user. User data will be available in forms and conversations.

```typescript
import { identify } from '@ansa-so/sdk';

identify({
  userId: 'user_123',
  userMetadata: {
    email: 'john@example.com',
    name: 'John Doe',
    plan: 'premium',
  },
});
```

### `clearIdentity()`

Clear the current user identity.

```typescript
import { clearIdentity } from '@ansa-so/sdk';

clearIdentity();
```

### `getVisitorId()`

Get the anonymous visitor ID for the current session.

```typescript
import { getVisitorId } from '@ansa-so/sdk';

const visitorId = getVisitorId();
if (visitorId) {
  console.log('Visitor ID:', visitorId);
}
```

## Command Queuing

All widget control functions automatically queue commands if called before the widget is ready. You don't need to wait for the widget to load:

```typescript
import { embedWidget, openWidget, showBubbles } from '@ansa-so/sdk';

// These commands are queued and will execute once widget is ready
embedWidget({ agentId: 'your-agent-id' });
showBubbles(['Welcome!', 'How can I help you today?']);
openWidget();
```

## API Reference

### `createClient(config)`

Create a new Ansa client.

```typescript
const ansa = createClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.ansa.so', // Optional
  timeout: 30000, // Optional, in ms
});
```

### `ansa.chat(agentId, message, options?)`

Send a message and get a response.

```typescript
const response = await ansa.chat('agent-id', 'Hello!', {
  conversationId: 'existing-conversation-id', // Optional
  metadata: { userId: '123' }, // Optional
});
```

### `ansa.chatStream(agentId, message, callbacks, options?)`

Stream a response with callbacks.

```typescript
await ansa.chatStream('agent-id', 'Hello!', {
  onToken: (token) => { /* each token as it arrives */ },
  onMessage: (message) => { /* full message when complete */ },
  onToolCall: (toolCall) => { /* when a tool is called */ },
  onError: (error) => { /* on error */ },
  onComplete: () => { /* when streaming is done */ },
});
```

### `ansa.getAgents()`

Get all your agents.

```typescript
const agents = await ansa.getAgents();
```

### `ansa.getAgent(agentId)`

Get a specific agent.

```typescript
const agent = await ansa.getAgent('agent-id');
```

### `ansa.getConversations(agentId)`

Get all conversations for an agent.

```typescript
const conversations = await ansa.getConversations('agent-id');
```

### `ansa.getConversation(conversationId)`

Get a conversation with messages.

```typescript
const conversation = await ansa.getConversation('conversation-id');
```

## TypeScript

This package is written in TypeScript and includes full type definitions.

```typescript
import type {
  Agent,
  Conversation,
  Message,
  ChatResponse,
  ChatOptions,
  AnsaConfig,
  StreamCallbacks,
  ToolCall,
  WidgetConfig,
  FormSchema,
  FormField,
  ShowFormOptions,
} from '@ansa-so/sdk';
```

## Error Handling

The SDK throws `AnsaError` for API errors:

```typescript
import { createClient, AnsaError } from '@ansa-so/sdk';

const ansa = createClient({ apiKey: 'your-api-key' });

try {
  await ansa.chat('agent-id', 'Hello!');
} catch (error) {
  if (error instanceof AnsaError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Code:', error.code);
  }
}
```

## License

MIT
