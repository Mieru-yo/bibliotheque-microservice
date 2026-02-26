const AuthService = require('../src/service/authService');
const userRepository = require('../src/repository/userRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/repository/userRepository');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

describe('AuthService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register a new user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 'uuid-1', username: 'testuser', email: 'test@test.com', role: 'user',
      });

      const result = await AuthService.register({
        username: 'testuser', email: 'test@test.com', password: 'password123',
      });
      expect(result.username).toBe('testuser');
      expect(userRepository.create).toHaveBeenCalled();
    });

    it('should throw 409 when email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'uuid-1' });

      await expect(
        AuthService.register({ username: 'test', email: 'test@test.com', password: 'pass' })
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('login', () => {
    it('should return token on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      userRepository.findByEmail.mockResolvedValue({
        id: 'uuid-1', username: 'testuser', email: 'test@test.com', password_hash: hash, role: 'user',
      });

      const result = await AuthService.login({ email: 'test@test.com', password: 'password123' });
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw 401 on wrong password', async () => {
      const hash = await bcrypt.hash('password123', 10);
      userRepository.findByEmail.mockResolvedValue({
        id: 'uuid-1', password_hash: hash, role: 'user',
      });

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'wrong' })
      ).rejects.toMatchObject({ status: 401 });
    });

    it('should throw 401 when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'no@user.com', password: 'pass' })
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('generateToken / validateToken', () => {
    it('should generate and validate a token', () => {
      const token = AuthService.generateToken({ id: 'uuid-1', role: 'user' });
      const decoded = AuthService.validateToken(token);
      expect(decoded.id).toBe('uuid-1');
      expect(decoded.role).toBe('user');
    });
  });
});
