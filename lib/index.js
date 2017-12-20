'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const assert = require('assert');


class ClientMessenger extends EventEmitter {
	constructor({ log }, options) {
		super();

		this.log = log;

		this._addressDescription = null;
		this._isConnected = false;
		this._serialize = options.serialize;
		this._deserialize = options.deserialize;
		this._send = null;
		this._disconnect = null;
		this._queue = [];
	}

	setAddressDescription(str) {
		this._addressDescription = str;
	}

	getAddressDescription() {
		return this._addressDescription;
	}

	setMessageSender(fn) {
		this._send = fn;
	}

	setDisconnect(fn) {
		this._disconnect = fn;
	}

	connected(addressDescription) {
		this._isConnected = true;
		this._addressDescription = addressDescription;
		this._sendQueue();
	}

	disconnected() {
		this._isConnected = false;
		this._addressDescription = null;
	}

	disconnect() {
		this._disconnect();
	}

	_sendQueue() {
		if (!this._isConnected) {
			return;
		}

		for (const [type, message] of this._queue) {
			this._send(type, message);
		}

		this._queue.length = 0;
	}

	send(...args) { // eg: eventName, message
		const serialized = this._serialize(...args);

		if (this._isConnected) {
			assert(this._queue.length === 0);

			this.log.debug('[client-messenger] sending message: %s', serialized);

			this._send(serialized);
		} else {
			this.log.debug('[client-messenger] queueing message: %s', serialized);

			this._queue.push(serialized);
		}
	}

	trySend(...args) {
		if (this._isConnected) {
			assert(this._queue.length === 0);

			const serialized = this._serialize(...args);

			this.log.debug('[client-messenger] sending message: %s', serialized);

			this._send(serialized);
		} else {
			this.log.debug('[client-messenger] dropping message');
		}
	}

	receiveMessage(serialized) {
		this.log.debug('[client-messenger] received message: %s', serialized);

		const args = this._deserialize(serialized);

		this.emit(...args);
	}
}


exports.create = function (apis, options) {
	return new ClientMessenger(apis, options);
};
