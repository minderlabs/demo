//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import socketio from 'socket.io';
import moment from 'moment';

/**
 * Client endpoints.
 */
export const clientRouter = (socketManager, options) => {
  const router = express.Router();

  // Show connected clients.
  router.get('/clients', function(req, res) {
    res.render('clients', {
      sockets: socketManager.clientManager.sockets
    });
  });

  // Invalidate client.
  router.post('/client/invalidate', function(req, res) {
    let socket = socketManager.clientManager.getSocket(req.body.socketId);
    if (socket) {
      console.log('INVALIDATE: %s', socket);
      socket.emit('invalidate', {
        ts: moment().valueOf()
      });
    }

    res.redirect('/clients');
  });

  return router;
};

/**
 * Manages socket connections.
 */
export class SocketManager {

  constructor(server) {
    this._io = socketio(server);

    this._clientManager = new ClientManager();

    /**
     * Listen for connections.
     */
    this._io.on('connection', (socket) => {
      console.log('CLIENT.CONNECTED[%s]', socket.id);
      this._clientManager.connect(socket);

      socket.on('disconnect', () => {
        console.log('CLIENT.DISCONNECTED[%s]', socket.id);
        this._clientManager.disconnect(socket.id);
      });
    });
  }

  get clientManager() {
    return this._clientManager;
  }
}

/**
 * Manages client connections.
 */
class ClientManager {

  // TODO(burdon): Record connection time.

  constructor() {
    this._sockets = new Map();
  }

  get sockets() {
    return Array.from(this._sockets.values());
  }

  getSocket(socketId) {
    return this._sockets.get(socketId);
  }

  connect(socket) {
    this._sockets.set(socket.id, socket);
  }

  disconnect(socketId) {
    this._sockets.delete(socketId);
  }
}
