'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const assert = require('assert');


class ClientMessenger extends EventEmitter {
	constructor(options) {
		super();
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

			this._send(serialized);
		} else {
			this._queue.push(serialized);
		}
	}

	trySend(...args) {
		if (this._isConnected) {
			assert(this._queue.length === 0);

			const serialized = this._serialize(...args);

			this._send(serialized);
		}
	}

	receiveMessage(serialized) {
		const args = this._deserialize(serialized);

		this.emit(...args);
	}
}


exports.create = function (options) {
	return new ClientMessenger(options);
};
