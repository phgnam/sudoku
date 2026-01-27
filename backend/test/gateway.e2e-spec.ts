import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/services/auth.service';

describe('GameGateway (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let token: string;
  let client: Socket;
  let gameId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3002); // Different port for testing

    authService = moduleFixture.get<AuthService>(AuthService);

    // Create test user
    const result = await authService.register({
      username: 'socketuser',
      email: 'socket@example.com',
      password: 'Test123!',
    });
    token = result.accessToken;

    // Create a game
    const gameResult = await authService['gameService'].createGame(
      result.user.id,
      'easy',
    );
    gameId = gameResult.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    client = io('http://localhost:3002', {
      auth: { token },
      transports: ['websocket'],
    });
    client.on('connect', done);
  });

  afterEach(() => {
    if (client.connected) {
      client.disconnect();
    }
  });

  describe('Socket.io Authentication', () => {
    it('should connect with valid token', (done) => {
      expect(client.connected).toBe(true);
      done();
    });

    it('should reject connection without token', (done) => {
      const unauthorizedClient = io('http://localhost:3002', {
        transports: ['websocket'],
      });

      unauthorizedClient.on('connect_error', (err) => {
        expect(err.message).toContain('Unauthorized');
        unauthorizedClient.disconnect();
        done();
      });
    });
  });

  describe('joinGame event', () => {
    it('should join game room', (done) => {
      client.emit('joinGame', { gameId });

      client.on('gameJoined', (data) => {
        expect(data).toHaveProperty('gameId', gameId);
        expect(data).toHaveProperty('currentState');
        done();
      });
    });

    it('should reject joining non-existent game', (done) => {
      client.emit('joinGame', { gameId: 99999 });

      client.on('error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });
    });
  });

  describe('makeMove event', () => {
    beforeEach((done) => {
      client.emit('joinGame', { gameId });
      client.on('gameJoined', () => done());
    });

    it('should broadcast move to all clients', (done) => {
      const client2 = io('http://localhost:3002', {
        auth: { token },
        transports: ['websocket'],
      });

      client2.on('connect', () => {
        client2.emit('joinGame', { gameId });
      });

      client2.on('gameJoined', () => {
        client.emit('makeMove', {
          gameId,
          row: 0,
          col: 2,
          value: 4,
        });
      });

      client2.on('moveMade', (data) => {
        expect(data).toHaveProperty('row', 0);
        expect(data).toHaveProperty('col', 2);
        expect(data).toHaveProperty('value', 4);
        expect(data).toHaveProperty('currentState');
        client2.disconnect();
        done();
      });
    });

    it('should validate moves', (done) => {
      client.emit('makeMove', {
        gameId,
        row: 0,
        col: 0,
        value: 5, // Invalid - cell already filled
      });

      client.on('error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });
    });
  });

  describe('undoMove event', () => {
    beforeEach((done) => {
      client.emit('joinGame', { gameId });
      client.on('gameJoined', () => {
        client.emit('makeMove', {
          gameId,
          row: 0,
          col: 2,
          value: 4,
        });
        client.on('moveMade', () => done());
      });
    });

    it('should undo last move', (done) => {
      client.emit('undoMove', { gameId });

      client.on('moveUndone', (data) => {
        expect(data).toHaveProperty('currentState');
        expect(data).toHaveProperty('moveHistory');
        done();
      });
    });
  });

  describe('requestHint event', () => {
    beforeEach((done) => {
      client.emit('joinGame', { gameId });
      client.on('gameJoined', () => done());
    });

    it('should provide hint', (done) => {
      client.emit('requestHint', { gameId });

      client.on('hintProvided', (data) => {
        expect(data).toHaveProperty('hint');
        expect(data.hint).toHaveProperty('type');
        expect(data.hint).toHaveProperty('data');
        expect(data).toHaveProperty('hintsUsed');
        done();
      });
    });
  });

  describe('leaveGame event', () => {
    beforeEach((done) => {
      client.emit('joinGame', { gameId });
      client.on('gameJoined', () => done());
    });

    it('should leave game room', (done) => {
      client.emit('leaveGame', { gameId });

      client.on('gameLeft', (data) => {
        expect(data).toHaveProperty('gameId', gameId);
        done();
      });
    });
  });

  describe('Real-time sync', () => {
    it('should sync game state across multiple clients', (done) => {
      const client2 = io('http://localhost:3002', {
        auth: { token },
        transports: ['websocket'],
      });

      let moveReceived = false;

      client2.on('connect', () => {
        client2.emit('joinGame', { gameId });
      });

      client.emit('joinGame', { gameId });

      client.on('gameJoined', () => {
        client.emit('makeMove', {
          gameId,
          row: 1,
          col: 1,
          value: 7,
        });
      });

      client2.on('moveMade', (data) => {
        expect(data.row).toBe(1);
        expect(data.col).toBe(1);
        expect(data.value).toBe(7);
        moveReceived = true;
        client2.disconnect();
        if (moveReceived) done();
      });
    });
  });
});
