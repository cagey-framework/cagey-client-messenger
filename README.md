# Client/server messaging for the Cagey game framework

[![Greenkeeper badge](https://badges.greenkeeper.io/cagey-framework/cagey-client-messenger.svg)](https://greenkeeper.io/)

The purpose of the client messenger is to integrate with WebSocket, TCP, or similar APIs in order to establish a
message-passing communication style between client and server. Once integrated into your project, you should easily
be able to switch between APIs, without having to change how your project interfaces with cagey-client-messenger.

Its API is written in a way to allow various optimization patterns, such as early serialization for broadcasting, and
object pools to reduce GC overhead.

## Installation

This installs cagey-client-messenger into your project:

```sh
npm install cagey-client-messenger --save
```

## API

### Client Messenger

**factory**

Instantiating a `ClientMessenger` requires you to have prepared a `cagey-logger` object. Passing it (or a child
logger) on to the factory will allow it to log debug information for when you need it. A single ClientMessenger instance
represents communication between a *single* client and the server-process this is running in.

```js
const apis = {
    log: cageyLogger
};

const options = {
    // ...
};

const clientMessenger = require('cagey-client-messenger').create(apis, options);
```

Creates and returns an instance of the `ClientMessenger` class and passes its options on to the constructor.
See the `ClientMessenger` constructor below for valid options.

**ClientMessenger(options)** (constructor)

- `options.serialize` (Function) Needs to serialize all given arguments into a single value.
- `options.deserialize` (Function) Needs to deserialize a value into an array of arguments.
- `options.send` (Function, optional) Needs to take a serialized message and send it to the client.
- `options.disconnect` (Function, optional) Needs to disconnect from the client.

The serialize/deserialize pair of functions will be used when sending and receiving data between client and server.
If they throw an error, it will be logged and further ignored. If `serialize` returns `undefined` for a given input,
that input will be silently ignored.

**setSendHandler(Function handler)**

Unless you already provided `options.send` in the constructor, you must call this function once. This function receives
a serialized message, which it should send to the client.

**setDisconnectHandler(Function handler)**

Unless you already provided `options.disconnect` in the constructor, you must call this function once. This function
must disconnect from the client.

**setAddressDescription(string addressDescription)**

Call this to describe the address of this connection. You would typically call this when a connection is established.
Whenever you want to log something happening to the connection, you can call `getAddressDescription` (see below) to give
the log entry some more context. Also, when an error occurs and is not thrown inside the ClientMessenger, it will log
the error with the current address-description.

**getAddressDescription() -> string**

Returns the current address description. This can be useful when logging connection related information.

**connected([string addressDescription])**

This tells the ClientMessenger that a connection has been established. If any messages have been queued up by trying to
send to the client while the connection was not established, they will now be sent.

If an address-description is passed, it will be registered. See `setAddressDescription` for more information.

**disconnected()**

This tells the ClientMessenger that the connection has been lost. Any messages that you attempt to send to the client
will be queued up so that they can be sent when the connection comes back.

**disconnect()**

This tells the ClientMessenger to disconnect from the client, and invokes the handler you set up when you called
`setDisconnectHandler` or via `options.disconnect` in the constructor.

**receiveMessage(any serialized)**

When you receive a message from your WebSocket (or other protocol), call this function to pass the serialized message.
It will be sent to your registered deserialize-function, which must return an array. The ClientMessenger will then
emit the arguments, meaning that the first array-element is the event name and the remaining elements are the arguments
passed to your event handler.

Example:

If your deserialize function returns `['message', { hello: 'world' }]`, the ClientMessenger will emit the event
`"message"` and pass the object `{ hello: 'world' }` as the only argument.

**async send(any ...args)**

You may pass any amount of arguments to this function to have it serialized and sent.

Whether you want to use a single argument as message source, or multiple (so you can for example combine an emittable
event-name with message-data as a 2nd argument), is completely up to you.

If the client is currently not connected, the message will be queued. Once the client reconnects, the message will
automatically be sent.

If serialization throws, the error will be logged.

**async trySend(any ...args)**

You may pass any amount of arguments to this function to have it serialized and sent.

Whether you want to use a single argument as message source, or multiple (so you can for example combine an emittable
event-name with message-data as a 2nd argument), is completely up to you.

If the client is currently not connected, the message will be dropped.

If serialization throws, the error will be logged.

**prepare(any ...args) -> any**

You may pass any amount of arguments to this function to have it serialized and returned. Preparing a message is useful
when you want to send the same message to more than one client-messenger. You can serialize once, and then distribute at
a lower performance cost using `sendPrepared`.

Whether you want to use a single argument as message source, or multiple (so you can for example combine an emittable
event-name with message-data as a 2nd argument), is completely up to you.

If serialization throws, the error will be logged and `prepare` will return `undefined`.

**async sendPrepared(any serializedMessage)**

This will send the serialized message to the client. If the client is currently not connected, the message will be
queued. Once the client reconnects, the message will automatically be sent.

**async trySendPrepared(any serializedMessage)**

This will send the serialized message to the client. If the client is currently not connected, the message will be
dropped.


## License

MIT

## Credit

Cagey is developed and maintained by [Wizcorp](https://wizcorp.jp/).
