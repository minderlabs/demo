//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import socketio from 'socket.io';
import moment from 'moment';

import { IdGenerator } from 'minder-core';

/**
 * Admin endpoints.
 * TODO(burdon): Injector from nx-util?
 */
export const adminRouter = (clientManager, options) => {
  const router = express.Router();

  router.get('/admin', function(req, res) {
    res.render('admin', {
      clients: clientManager.clients
    });
  });

  return router;
};

/**
 * Client endpoints.
 */
export const clientRouter = (clientManager, options) => {
  const router = express.Router();

  // Registers the client.
  router.post('/client/register', function(req, res) {
    console.log('### REGISTER: %s', JSON.stringify(req.body));
    let { clientId, socketId } = req.body;
    clientManager.register(clientId, socketId);
    res.send({});
  });

  // Invalidate client.
  router.post('/client/invalidate', function(req, res) {
    let { clientId } = req.body;
    clientManager.invalidate(clientId);
    res.send({});
  });

  return router;
};

/**
 * Manages client connections.
 *
 * Web:
 * 1). Client rendered (new clientId in config).
 * 2). Client connected to socket (gets socketId).
 * 3). Client registers (binds clientId to socketId).
 *
 * TODO(burdon): Native GCM sequence? (Get clientId and socketId in registration).
 */
export class ClientManager {

  // TODO(burdon): Injection?
  static idGenerator = new IdGenerator();

  constructor(socketManager) {
    console.assert(socketManager);
    this._socketManager = socketManager;

    // Listen for disconnected clients.
    this._socketManager.onDisconnect((socketId) => {
      let client = _.find(this._clients, client => client.socketId === socketId);
      if (!client) {
        console.warn('Invalid client: %s', socketId);
      } else {
        client.socketId = null;
      }
    });

    // Map of clients indexed by ID.
    this._clients = new Map();
  }

  /**
   * Called by page loader.
   */
  create(userId) {
    console.assert(userId);

    let client = {
      id: ClientManager.idGenerator.createId(),
      userId: userId,
      socketId: null,
      registered: null
    };

    this._clients.set(client.id, client);
    console.log('CLIENT.CREATE[%s]', client.id);

    return client;
  }

  /**
   * Called by client on start-up.
   * NOTE: mobile devices requet ID here.
   */
  register(clientId, socketId) {
    console.assert(clientId && socketId);

    let client = this._clients.get(clientId);
    if (!client) {
      console.warn('Invalid client: %s', clientId);
    } else {
      console.log('CLIENT.REGISTER[%s] :%s', clientId, socketId);
      client.socketId = socketId;
      client.registered = moment();
    }
  }

  invalidate(clientId) {
    let client = this._clients.get(clientId);
    if (!client) {
      console.warn('Invalid client: %s', clientId);
    } else {
      let socket = this._socketManager.getSocket(client.socketId);
      if (!socket) {
        console.warn('Client not connected: %s', clientId);
      } else {
        console.log('Invalidating client: %s', clientId);
        socket.emit('invalidate', {
          ts: moment().valueOf()
        });
      }
    }
  }

  // Admin.
  get clients() {
    return Array.from(this._clients.values());
  }
}

/**
 * Manages socket connections.
 */
export class SocketManager {

  // TODO(burdon): Replace with Firebase (now GCM); rather than pusher.io
  // https://firebase.google.com/docs/cloud-messaging

  // TODO(burdon): Use JWT to secure connection?
  // https://auth0.com/blog/auth-with-socket-io
  // https://jwt.io

  constructor(server) {
    this._onDisconnect = null;

    // Map of sockets by session ID.
    this._sockets = new Map();

    //
    // Socket.io
    // http://socket.io/get-started/chat
    // https://www.npmjs.com/package/socket.io-client
    //

    this._io = socketio(server);

    this._io.on('connection', (socket) => {
      console.log('SOCKET.CONNECT[%s]', socket.id);
      this._sockets.set(socket.id, socket);

      socket.on('disconnect', () => {
        console.log('SOCKET.DISCONNECT[%s]', socket.id);
        this._sockets.delete(socket.id);
        this._onDisconnect(socket.id);
      });
    });
  }

  onDisconnect(callback) {
    this._onDisconnect = callback;
  }

  /**
   * Get active socket for client.
   * @param socketId
   * @returns {Socket}
   */
  getSocket(socketId) {
    return this._sockets.get(socketId);
  }
}
