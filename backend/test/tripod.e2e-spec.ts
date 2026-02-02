import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';

const request = supertest.default || supertest;

describe('Tripod Sudoku (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let gameId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Get anonymous auth token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/anonymous')
      .expect(201);

    authToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /games/tripod', () => {
    it('should create a new tripod game with default 7x7 grid', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('gameMode', 'tripod');
      expect(response.body).toHaveProperty('gridSize', 7);
      expect(response.body).toHaveProperty('tripodData');
      expect(response.body.tripodData).toHaveProperty('tripodDots');
      expect(response.body.tripodData).toHaveProperty('horizontalBorders');
      expect(response.body.tripodData).toHaveProperty('verticalBorders');

      gameId = response.body.id;
    });

    it('should create a tripod game with custom grid size', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gridSize: 9,
        })
        .expect(201);

      expect(response.body.gridSize).toBe(9);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/games/tripod')
        .send({})
        .expect(401);
    });
  });

  describe('PATCH /games/:id/borders', () => {
    it('should update all borders for a tripod game', async () => {
      // Create a new game first
      const createResponse = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      const newGameId = createResponse.body.id;
      const gridSize = createResponse.body.gridSize;

      // Update borders - using actual API format
      const horizontal = Array(gridSize + 1)
        .fill(null)
        .map(() => Array(gridSize).fill(false));
      const vertical = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize + 1).fill(false));

      // Set some borders
      horizontal[1][0] = true;
      horizontal[1][1] = true;
      vertical[0][2] = true;

      const response = await request(app.getHttpServer())
        .patch(`/games/${newGameId}/borders`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          borders: {
            horizontal,
            vertical,
          },
        })
        .expect(200);

      expect(response.body.tripodData.horizontalBorders[1][0]).toBe(true);
      expect(response.body.tripodData.horizontalBorders[1][1]).toBe(true);
      expect(response.body.tripodData.verticalBorders[0][2]).toBe(true);
    });
  });

  describe('PATCH /games/:id/border', () => {
    it('should toggle a single border', async () => {
      // Create a new game
      const createResponse = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      const newGameId = createResponse.body.id;

      // Toggle a border on
      const response1 = await request(app.getHttpServer())
        .patch(`/games/${newGameId}/border`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'horizontal',
          row: 1,
          col: 0,
        })
        .expect(200);

      expect(response1.body.tripodData.horizontalBorders[1][0]).toBe(true);

      // Toggle the same border off
      const response2 = await request(app.getHttpServer())
        .patch(`/games/${newGameId}/border`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'horizontal',
          row: 1,
          col: 0,
        })
        .expect(200);

      expect(response2.body.tripodData.horizontalBorders[1][0]).toBe(false);
    });

    it('should reject invalid border positions', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      const newGameId = createResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/games/${newGameId}/border`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'horizontal',
          row: 100, // Out of bounds
          col: 0,
        })
        .expect(400);
    });
  });

  describe('POST /games/:id/validate-tripod', () => {
    it('should validate tripod rules and return errors', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/games/tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      const newGameId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/games/${newGameId}/validate-tripod`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 400 for non-tripod game', async () => {
      // Create a classic game
      const createResponse = await request(app.getHttpServer())
        .post('/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ difficulty: 'easy' })
        .expect(201);

      const classicGameId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/games/${classicGameId}/validate-tripod`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Game not found scenarios', () => {
    it('should return 404 for non-existent game on border update', async () => {
      await request(app.getHttpServer())
        .patch('/games/non-existent-id/borders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          borders: {
            horizontal: [],
            vertical: [],
          },
        })
        .expect(404);
    });

    it('should return 404 for non-existent game on validate', async () => {
      await request(app.getHttpServer())
        .post('/games/non-existent-id/validate-tripod')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent game on toggle border', async () => {
      await request(app.getHttpServer())
        .patch('/games/non-existent-id/border')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'horizontal',
          row: 0,
          col: 0,
        })
        .expect(404);
    });
  });
});