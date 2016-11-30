//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import socketio from 'socket.io';
import moment from 'moment';

import { IdGenerator } from 'minder-core';

import { getUserInfoFromHeader } from './auth';

/**
 * Admin endpoints.
 * TODO(burdon): Injector from nx-util?
 */
export const adminRouter = (clientManager, options) => {
  let router = express.Router();

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
  let router = express.Router();

  // Registers the client.
  router.post('/client/register', async function(req, res) {
    let { clientId, socketId } = req.body;

    let userInfo = await getUserInfoFromHeader(req);
    if (userInfo) {
      clientManager.register(userInfo.userId, clientId, socketId);
    } else {
      res.status(401);
    }

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
 * 1). Client created (clientId set in config during app serving).
 * 2). Socked connected (gets socketId)
 * 3). Client registered (binds clientId to socketId).
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
    console.log('CLIENT.CREATED[%s:%s]', client.id, userId);

    return client;
  }

  /**
   * Called by client on start-up.
   * NOTE: mobile devices requet ID here.
   */
  register(userId, clientId, socketId) {
    console.assert(userId, clientId && socketId);

    let client = this._clients.get(clientId);
    if (!client) {
      console.warn('Invalid client: %s', clientId);
    } else {
      if (userId != client.userId) {
        console.error('Invalid user: %s', userId);
      } else {
        console.log('CLIENT.REGISTERED[%s:%s]', clientId, userId);
        client.socketId = socketId;
        client.registered = moment();
      }
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
        console.warn('Invalidating client: %s', clientId);
        socket.emit('invalidate', {
          ts: moment().valueOf()
        });
      }
    }
  }

  // TODO(burdon): Replace this and above with queryId, etc.
  invalidateOthers(clientId) {
    this._clients.forEach((client) => {
      if (client.id != clientId) {
        this.invalidate(client.id);
      }
    });
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
      console.log('SOCKET.CONNECTED[%s]', socket.id);
      this._sockets.set(socket.id, socket);

      socket.on('disconnect', () => {
        console.log('SOCKET.DISCONNECTED[%s]', socket.id);
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
