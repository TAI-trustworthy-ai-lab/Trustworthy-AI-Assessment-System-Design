import { login, register, resend } from '../src/services/userService';
import { USER_API_BASE } from '@/config/apiConfig';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

describe('userService - Authentication Tests', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('login', () => {
        const mockLoginPayload = {
            email: 'test@example.com',
            password: 'password123'
        };

        it('should successfully login with valid credentials', async () => {
            const mockResponse = {
                data: {
                    token: 'mock-auth-token-abc123',
                    user: {
                        id: 123,
                        email: 'test@example.com',
                        name: 'Test User',
                        role: 'USER'
                    }
                }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await login(mockLoginPayload);

            // Verify fetch was called with correct parameters
            expect(global.fetch).toHaveBeenCalledWith(
                `${USER_API_BASE}/login`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(mockLoginPayload)
                })
            );

            // Verify response structure
            expect(result).toEqual(mockResponse);
            expect(result.data.token).toBe('mock-auth-token-abc123');
            expect(result.data.user.id).toBe(123);
            expect(result.data.user.role).toBe('USER');
        });

        it('should throw error on failed login with 401 status', async () => {
            const mockError = {
                error: { message: 'Invalid email or password' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => mockError
            });

            await expect(login(mockLoginPayload)).rejects.toThrow();

            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should throw error when email is incorrect (404)', async () => {
            const mockError = {
                error: { message: 'User not found' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => mockError
            });

            await expect(login(mockLoginPayload)).rejects.toThrow();
        });

        it('should throw error on network failure', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(
                new Error('Network error')
            );

            await expect(login(mockLoginPayload)).rejects.toThrow('Network error');
        });

        it('should throw error on server error (500)', async () => {
            const mockError = {
                error: { message: 'Internal server error' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => mockError
            });

            await expect(login(mockLoginPayload)).rejects.toThrow();
        });

        it('should handle missing credentials', async () => {
            const incompletePayload = {
                email: 'test@example.com',
                password: ''
            };

            const mockError = {
                error: { message: 'Password is required' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => mockError
            });

            await expect(login(incompletePayload as any)).rejects.toThrow();
        });
    });

    describe('register', () => {
        const mockRegisterPayload = {
            name: 'New User',
            email: 'newuser@example.com',
            password: 'securePassword123'
        };

        it('should successfully register a new user', async () => {
            const mockResponse = {
                message: 'User registered successfully. Please verify your email.',
                data: {
                    userId: 456
                }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await register(mockRegisterPayload);

            expect(global.fetch).toHaveBeenCalledWith(
                `${USER_API_BASE}/register`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(mockRegisterPayload)
                })
            );

            expect(result).toEqual(mockResponse);
            expect(result.data.userId).toBe(456);
        });

        it('should throw error when email already exists (400)', async () => {
            const mockError = {
                error: { message: 'User with this email already exists' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => mockError
            });

            await expect(register(mockRegisterPayload)).rejects.toThrow();
        });

        it('should throw error on server error during registration', async () => {
            const mockError = {
                error: { message: 'Database connection failed' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => mockError
            });

            await expect(register(mockRegisterPayload)).rejects.toThrow();
        });

        it('should handle missing required fields', async () => {
            const incompletePayload = {
                name: '',
                email: 'test@example.com',
                password: 'pass123'
            };

            const mockError = {
                error: { message: 'Name is required' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => mockError
            });

            await expect(register(incompletePayload as any)).rejects.toThrow();
        });

        it('should validate email format on backend', async () => {
            const invalidEmailPayload = {
                name: 'Test User',
                email: 'invalid-email-format',
                password: 'password123'
            };

            const mockError = {
                error: { message: 'Invalid email format' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => mockError
            });

            await expect(register(invalidEmailPayload)).rejects.toThrow();
        });
    });

    describe('resend', () => {
        const mockResendPayload = {
            email: 'test@example.com'
        };

        it('should successfully resend verification email', async () => {
            const mockResponse = {
                message: 'Verification email sent successfully'
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await resend(mockResendPayload);

            expect(global.fetch).toHaveBeenCalledWith(
                `${USER_API_BASE}/resend-verification`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(mockResendPayload)
                })
            );

            expect(result).toEqual(mockResponse);
        });

        it('should throw error when email not found', async () => {
            const mockError = {
                error: { message: 'Email not found in system' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => mockError
            });

            await expect(resend(mockResendPayload)).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const mockError = {
                error: { message: 'Too many requests. Please try again later.' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 429,
                json: async () => mockError
            });

            await expect(resend(mockResendPayload)).rejects.toThrow();
        });
    });

    describe('apiFetch error handling', () => {
        it('should handle malformed JSON responses', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => {
                    throw new Error('Invalid JSON');
                }
            });

            await expect(login({ email: 'test@test.com', password: 'pass' })).rejects.toThrow();
        });

        it('should include status code in error message', async () => {
            const mockError = {
                error: { message: 'Forbidden' }
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => mockError
            });

            try {
                await login({ email: 'test@test.com', password: 'pass' });
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                const errorObj = JSON.parse((error as Error).message);
                expect(errorObj.status).toBe(403);
            }
        });
    });
});
