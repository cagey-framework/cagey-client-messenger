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

	async _sendQueue() {
		if (!this._isConnected) {
			return;
		}

		for (const serialized of this._queue) {
			await this._send(serialized);
		}

		this._queue.length = 0;
	}

	prepare(...args) {
		try {
			return this._serialize(...args);
		} catch (error) {
			this.log.error({ error }, '[client-messenger] error serializing message');
		}

		return undefined;
	}

	async sendPrepared(serialized) {
		if (this._isConnected) {
			assert(this._queue.length === 0);

			this.log.debug('[client-messenger] sending message: %s', serialized);

			await this._send(serialized);
		} else {
			this.log.debug('[client-messenger] queueing message: %s', serialized);

			this._queue.push(serialized);
		}
	}

	async trySendPrepared(serialized) {
		if (this._isConnected) {
			assert(this._queue.length === 0);

			this.log.debug('[client-messenger] sending message: %s', serialized);
			await this._send(serialized);
		} else {
			this.log.debug('[client-messenger] dropping message');
		}
	}

	async send(...args) { // eg: eventName, message
		const serialized = this.prepare(...args);

		if (serialized !== undefined) {
			await this.sendPrepared(serialized);
		}
	}

	async trySend(...args) {
		if (this._isConnected) {
			assert(this._queue.length === 0);

			const serialized = this.prepare(...args);

			if (serialized !== undefined) {
				this.log.debug('[client-messenger] sending message: %s', serialized);
				await this._send(serialized);
			}
		} else {
			this.log.debug('[client-messenger] dropping message');
		}
	}

	receiveMessage(serialized) {
		this.log.debug('[client-messenger] received message: %s', serialized);

		let args;

		try {
			args = this._deserialize(serialized);
		} catch (error) {
			this.log.error({ error, serialized }, '[client-messenger] error deserializing message');
			return;
		}

		this.emitAsync(...args);
	}
}


exports.create = function (apis, options) {
	return new ClientMessenger(apis, options);
};
