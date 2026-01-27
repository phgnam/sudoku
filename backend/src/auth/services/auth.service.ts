import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Generate anonymous token
  async generateAnonymousToken(): Promise<{
    accessToken: string;
    sessionId: string;
  }> {
    const sessionId = uuidv4();

    // Create anonymous user record
    const anonymousUser = this.userRepository.create({
      sessionId,
      easyCompleted: 0,
      normalCompleted: 0,
      hardCompleted: 0,
      stats: {
        totalGames: 0,
        winRate: 0,
        avgTimeEasy: 0,
        avgTimeNormal: 0,
        avgTimeHard: 0,
        totalTimePlayed: 0,
        currentStreak: 0,
      },
    });

    const savedUser = await this.userRepository.save(anonymousUser);

    const payload: JwtPayload = {
      sub: savedUser.id, // Use user.id, not sessionId!
      isAnonymous: true,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('ANONYMOUS_JWT_EXPIRES_IN', '30d'),
    });

    return { accessToken, sessionId };
  }

  // Register new user
  async register(email: string, password: string, username: string) {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      easyCompleted: 0,
      normalCompleted: 0,
      hardCompleted: 0,
      stats: {
        totalGames: 0,
        winRate: 0,
        avgTimeEasy: 0,
        avgTimeNormal: 0,
        avgTimeHard: 0,
        totalTimePlayed: 0,
        currentStreak: 0,
      },
    });

    const savedUser = await this.userRepository.save(user);

    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      isAnonymous: false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        username: savedUser.username,
      },
    };
  }

  // Login
  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isAnonymous: false,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  // Migrate anonymous user to authenticated user
  async migrateAnonymousUser(sessionId: string, userId: string) {
    // Find anonymous user
    const anonymousUser = await this.userRepository.findOne({
      where: { sessionId },
      relations: ['games', 'gameHistory'],
    });

    if (!anonymousUser) {
      return; // No anonymous data to migrate
    }

    // Find target user
    const targetUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new UnauthorizedException('Target user not found');
    }

    // Merge game counts
    targetUser.easyCompleted += anonymousUser.easyCompleted || 0;
    targetUser.normalCompleted += anonymousUser.normalCompleted || 0;
    targetUser.hardCompleted += anonymousUser.hardCompleted || 0;

    await this.userRepository.save(targetUser);

    // Delete anonymous user record (games will be migrated via separate service)
    await this.userRepository.remove(anonymousUser);
  }
}
