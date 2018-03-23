'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const assert = require('assert');


class ClientMessenger extends EventEmitter {
	constructor({ log }, options) {
		super();

		assert(options);
		assert(typeof options.serialize === 'function', 'Expected options.serialize function');
		assert(typeof options.deserialize === 'function', 'Expected options.deserialize function');

		assert(
			!options.send || typeof options.send === 'function',  // options.send is optional
			'Expected options.send to be a function'
		);

		assert(
			!options.disconnect || typeof options.disconnect === 'function',  // options.disconnect is optional
			'Expected options.disconnect to be a function'
		);

		this.log = log;

		this._addressDescription = null;
		this._isConnected = false;
		this._serialize = options.serialize;
		this._deserialize = options.deserialize;
		this._send = options.send;
		this._disconnect = options.disconnect;
		this._queue = [];
	}

	setSendHandler(fn) {
		this._send = fn;
	}

	setDisconnectHandler(fn) {
		this._disconnect = fn;
	}

	setAddressDescription(str) {
		this._addressDescription = str;
	}

	getAddressDescription() {
		return this._addressDescription;
	}

	connected(addressDescription) {
		this._isConnected = true;

		if (addressDescription) {
			this._addressDescription = addressDescription;
		}

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
			this.log.error({
				error,
				address: this._addressDescription
			}, '[client-messenger] error serializing message');
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

	async receiveMessage(serialized) {
		this.log.debug('[client-messenger] received message: %s', serialized);

		let args;

		try {
			args = this._deserialize(serialized);
		} catch (error) {
			this.log.error({
				error,
				serialized,
				address: this._addressDescription
			}, '[client-messenger] error deserializing message');
			return;
		}

		// deliver the message
		await this.emitAsync(...args);

		// allow cleanup, pool-management, etc
		await this.emitAsync('delivered', args);
	}
}


exports.create = function (apis, options) {
	return new ClientMessenger(apis, options);
};
