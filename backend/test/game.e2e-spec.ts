import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/services/auth.service';

describe('GameController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let token: string;
  let gameId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    // Create test user and get token
    const result = await authService.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
    });
    token = result.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/games (POST)', () => {
    it('should create a new game', () => {
      return request(app.getHttpServer())
        .post('/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ difficulty: 'easy' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('difficulty', 'easy');
          expect(res.body).toHaveProperty('currentState');
          expect(res.body).toHaveProperty('puzzle');
          expect(res.body.status).toBe('active');
          gameId = res.body.id;
        });
    });

    it('should reject invalid difficulty', () => {
      return request(app.getHttpServer())
        .post('/games')
        .set('Authorization', `Bearer ${token}`)
        .send({ difficulty: 'invalid' })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/games')
        .send({ difficulty: 'easy' })
        .expect(401);
    });
  });

  describe('/games/:id (GET)', () => {
    it('should get game by id', () => {
      return request(app.getHttpServer())
        .get(`/games/${gameId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(gameId);
          expect(res.body).toHaveProperty('currentState');
          expect(res.body).toHaveProperty('moveHistory');
        });
    });

    it('should return 404 for non-existent game', () => {
      return request(app.getHttpServer())
        .get('/games/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('/games/:id/move (PATCH)', () => {
    it('should make a valid move', () => {
      return request(app.getHttpServer())
        .patch(`/games/${gameId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ row: 0, col: 2, value: 4 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('currentState');
          expect(res.body).toHaveProperty('isValid', true);
        });
    });

    it('should reject invalid move', () => {
      return request(app.getHttpServer())
        .patch(`/games/${gameId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ row: 0, col: 0, value: 5 }) // Cell already filled
        .expect(400);
    });

    it('should increment mistakes on wrong move', () => {
      return request(app.getHttpServer())
        .patch(`/games/${gameId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ row: 0, col: 3, value: 9 }) // Wrong value
        .expect(200)
        .expect((res) => {
          expect(res.body.mistakes).toBeGreaterThan(0);
        });
    });
  });

  describe('/games/:id/hint (POST)', () => {
    it('should provide a hint', () => {
      return request(app.getHttpServer())
        .post(`/games/${gameId}/hint`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('type');
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('hintsUsed');
        });
    });

    it('should limit hints to maximum', async () => {
      // Use all hints
      await request(app.getHttpServer())
        .post(`/games/${gameId}/hint`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/games/${gameId}/hint`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Fourth hint should fail
      return request(app.getHttpServer())
        .post(`/games/${gameId}/hint`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('/games/:id/undo (POST)', () => {
    it('should undo last move', () => {
      return request(app.getHttpServer())
        .post(`/games/${gameId}/undo`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('currentState');
          expect(res.body).toHaveProperty('moveHistory');
        });
    });

    it('should fail when no moves to undo', async () => {
      // Undo all moves first
      await request(app.getHttpServer())
        .post(`/games/${gameId}/undo`)
        .set('Authorization', `Bearer ${token}`);

      // Try to undo when empty
      return request(app.getHttpServer())
        .post(`/games/${gameId}/undo`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('/games/:id/time (PATCH)', () => {
    it('should update game time', () => {
      return request(app.getHttpServer())
        .patch(`/games/${gameId}/time`)
        .set('Authorization', `Bearer ${token}`)
        .send({ timeElapsed: 120 })
        .expect(200)
        .expect((res) => {
          expect(res.body.timeElapsed).toBe(120);
        });
    });
  });
});
