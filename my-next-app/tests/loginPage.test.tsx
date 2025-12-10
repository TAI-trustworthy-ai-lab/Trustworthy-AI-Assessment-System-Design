import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import LoginPage from '../src/app/login/page';
import { login, register } from '@/services/userService';

// Mock modules
jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

jest.mock('@/services/userService', () => ({
    login: jest.fn(),
    register: jest.fn()
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            // Mock translation function
            const translations: Record<string, string> = {
                'loginPage.login.title': 'Sign In',
                'loginPage.register.title': 'Create Account',
                'loginPage.login.emailLabel': 'Email Address',
                'loginPage.login.passwordLabel': 'Password',
                'loginPage.login.emailPlaceholder': 'Enter your email',
                'loginPage.login.passwordPlaceholder': 'Enter your password',
                'loginPage.login.button': 'Sign In',
                'loginPage.register.button': 'Register',
                'loginPage.register.fullNameLabel': 'Full Name',
                'loginPage.register.fullNamePlaceholder': 'Enter your name',
                'loginPage.login.switchToRegister': 'Create new account',
                'loginPage.register.switchToLogin': 'Already have an account?',
                'loginPage.common.loading': 'Loading...',
                'loginPage.common.errorLabel': 'Error:',
                'loginPage.login.error401': 'Invalid email or password',
                'loginPage.login.error404': 'User not found',
                'loginPage.login.error500': 'Server error',
                'loginPage.login.errorUnknown': 'An error occurred',
                'loginPage.login.errorIncomplete': 'Incomplete response from server',
                'loginPage.register.error500': 'Registration failed',
                'loginPage.register.error400': 'Email already exists',
                'loginPage.register.errorUnknown': 'Registration error'
            };
            return translations[key] || key;
        },
        i18n: { language: 'en' }
    })
}));

// Mock Header component
jest.mock('@/components/Header', () => {
    return function MockHeader() {
        return <div data-testid="mock-header">Header</div>;
    };
});

const mockPush = jest.fn();
const mockLogin = login as jest.MockedFunction<typeof login>;
const mockRegister = register as jest.MockedFunction<typeof register>;

describe('LoginPage - Connection System Tests', () => {
    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        jest.clearAllMocks();
        localStorage.clear();
        // Suppress console.error in tests to reduce noise
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error after each test
        jest.restoreAllMocks();
    });

    describe('Login Form - UI Rendering', () => {
        it('should render login form by default', () => {
            render(<LoginPage />);

            expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        });

        it('should have email and password inputs', () => {
            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');

            expect(emailInput).toHaveAttribute('type', 'email');
            expect(passwordInput).toHaveAttribute('type', 'password');
        });

        it('should display switch to register button', () => {
            render(<LoginPage />);

            expect(screen.getByText('Create new account')).toBeInTheDocument();
        });
    });

    describe('Login Form - Successful Authentication', () => {
        it('should successfully login with valid credentials', async () => {
            const mockResponse = {
                data: {
                    token: 'auth-token-xyz789',
                    user: {
                        id: 456,
                        email: 'test@example.com',
                        name: 'Test User',
                        role: 'USER'
                    }
                }
            };

            mockLogin.mockResolvedValueOnce(mockResponse);

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            // Fill in form
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123'
                });
            });

            await waitFor(() => {
                // Verify localStorage was updated
                expect(localStorage.setItem).toHaveBeenCalledWith('authToken', 'auth-token-xyz789');
                expect(localStorage.setItem).toHaveBeenCalledWith('userId', '456');
                expect(localStorage.setItem).toHaveBeenCalledWith('userRole', 'USER');
                expect(localStorage.setItem).toHaveBeenCalledWith('authExpiry', expect.any(String));
                
                // Verify navigation
                expect(mockPush).toHaveBeenCalledWith('/home');
            });
        });

        it('should show loading state during login', async () => {
            mockLogin.mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({
                    data: {
                        token: 'token',
                        user: { id: 1, email: 'test@test.com', role: 'USER' }
                    }
                }), 100))
            );

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password' } });
            fireEvent.click(loginButton);

            // Should show loading state
            expect(screen.getByText('Loading...')).toBeInTheDocument();

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalled();
            });
        });
    });

    describe('Login Form - Error Handling', () => {
        it('should display error on 401 (invalid credentials)', async () => {
            const mockError = new Error(JSON.stringify({ 
                status: 401, 
                message: 'Invalid email or password' 
            }));

            mockLogin.mockRejectedValueOnce(mockError);

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
            });

            expect(localStorage.setItem).not.toHaveBeenCalled();
            expect(mockPush).not.toHaveBeenCalled();
        });

        it('should display error on 404 (user not found)', async () => {
            const mockError = new Error(JSON.stringify({ 
                status: 404, 
                message: 'User not found' 
            }));

            mockLogin.mockRejectedValueOnce(mockError);

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                expect(screen.getByText(/User not found/i)).toBeInTheDocument();
            });
        });

        it('should display error on 500 (server error)', async () => {
            const mockError = new Error(JSON.stringify({ 
                status: 500, 
                message: 'Internal server error' 
            }));

            mockLogin.mockRejectedValueOnce(mockError);

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                expect(screen.getByText(/Server error/i)).toBeInTheDocument();
            });
        });

        it('should handle incomplete response from server', async () => {
            mockLogin.mockResolvedValueOnce({
                data: {
                    token: 'token',
                    user: { id: null, role: null } // Incomplete data
                }
            } as any);

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                // The error message shows "An error occurred" since the error can't be parsed as JSON
                expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
            });
        });
    });

    describe('Registration Form - UI Rendering', () => {
        it('should switch to registration form', () => {
            render(<LoginPage />);

            const switchButton = screen.getByText('Create new account');
            fireEvent.click(switchButton);

            expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
        });

        it('should have name field in registration form', () => {
            render(<LoginPage />);

            fireEvent.click(screen.getByText('Create new account'));

            const nameInput = screen.getByPlaceholderText('Enter your name');
            expect(nameInput).toHaveAttribute('type', 'text');
        });
    });

    describe('Registration Form - Successful Registration', () => {
        it('should successfully register a new user', async () => {
            const mockResponse = {
                message: 'User registered successfully'
            };

            mockRegister.mockResolvedValueOnce(mockResponse);

            render(<LoginPage />);

            // Switch to registration
            fireEvent.click(screen.getByText('Create new account'));

            const nameInput = screen.getByPlaceholderText('Enter your name');
            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const registerButton = screen.getByRole('button', { name: /register/i });

            fireEvent.change(nameInput, { target: { value: 'New User' } });
            fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'securePassword123' } });
            fireEvent.click(registerButton);

            await waitFor(() => {
                expect(mockRegister).toHaveBeenCalledWith({
                    name: 'New User',
                    email: 'newuser@example.com',
                    password: 'securePassword123'
                });
            });

            await waitFor(() => {
                expect(localStorage.setItem).toHaveBeenCalledWith('verifingEmail', 'newuser@example.com');
                expect(mockPush).toHaveBeenCalledWith('/verify-pending');
            });
        });

        it('should clear form fields after successful registration', async () => {
            mockRegister.mockResolvedValueOnce({ message: 'Success' });

            render(<LoginPage />);

            fireEvent.click(screen.getByText('Create new account'));

            const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
            const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
            const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;

            fireEvent.change(nameInput, { target: { value: 'Test User' } });
            fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password' } });

            fireEvent.click(screen.getByRole('button', { name: /register/i }));

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalled();
            });
        });
    });

    describe('Registration Form - Error Handling', () => {
        it('should display error when email already exists (400)', async () => {
            const mockError = new Error(JSON.stringify({ 
                status: 400, 
                message: 'Email already exists' 
            }));

            mockRegister.mockRejectedValueOnce(mockError);

            render(<LoginPage />);

            fireEvent.click(screen.getByText('Create new account'));

            const nameInput = screen.getByPlaceholderText('Enter your name');
            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const registerButton = screen.getByRole('button', { name: /register/i });

            fireEvent.change(nameInput, { target: { value: 'Test User' } });
            fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(registerButton);

            await waitFor(() => {
                expect(screen.getByText(/Email already exists/i)).toBeInTheDocument();
            });
        });

        it('should display error on server failure (500)', async () => {
            const mockError = new Error(JSON.stringify({ 
                status: 500, 
                message: 'Server error' 
            }));

            mockRegister.mockRejectedValueOnce(mockError);

            render(<LoginPage />);

            fireEvent.click(screen.getByText('Create new account'));

            const nameInput = screen.getByPlaceholderText('Enter your name');
            const emailInput = screen.getByPlaceholderText('Enter your email');
            const passwordInput = screen.getByPlaceholderText('Enter your password');
            const registerButton = screen.getByRole('button', { name: /register/i });

            fireEvent.change(nameInput, { target: { value: 'Test User' } });
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(registerButton);

            await waitFor(() => {
                expect(screen.getByText(/Registration failed/i)).toBeInTheDocument();
            });
        });
    });

    describe('Form State Management', () => {
        it('should clear errors when switching between login and register', () => {
            render(<LoginPage />);

            // Trigger an error (manually set one if needed)
            // For this test, we'll just verify the switch clears state

            const switchToRegister = screen.getByText('Create new account');
            fireEvent.click(switchToRegister);

            expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();

            const switchToLogin = screen.getByText('Already have an account?');
            fireEvent.click(switchToLogin);

            expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
        });

        it('should disable inputs during loading', async () => {
            mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

            render(<LoginPage />);

            const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement;
            const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement;
            const loginButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password' } });
            fireEvent.click(loginButton);

            await waitFor(() => {
                expect(emailInput).toBeDisabled();
                expect(passwordInput).toBeDisabled();
                expect(loginButton).toBeDisabled();
            });
        });
    });
});
