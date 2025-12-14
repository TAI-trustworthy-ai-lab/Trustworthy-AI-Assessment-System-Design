import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../src/hooks/useAuth';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

// Setup localStorage mock
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        _getStore: () => store,
        _setStore: (newStore: Record<string, string>) => {
            store = newStore;
        }
    };
};

describe('useAuth Hook - Authentication Management', () => {
    let localStorageMock: ReturnType<typeof createLocalStorageMock>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Setup router mock
        (useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
            replace: mockReplace
        });

        // Setup localStorage mock
        localStorageMock = createLocalStorageMock();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Authentication Check', () => {
        it('should detect authenticated user with valid token', () => {
            const futureExpiry = Date.now() + 3600000; // 1 hour from now
            localStorageMock.setItem('authToken', 'valid-token-123');
            localStorageMock.setItem('userId', '456');
            localStorageMock.setItem('authExpiry', futureExpiry.toString());

            const { result } = renderHook(() => useAuth());

            expect(result.current.isAuthenticated).toBe(true);
        });

        it('should detect unauthenticated user when token is missing', () => {
            const { result } = renderHook(() => useAuth());

            expect(result.current.isAuthenticated).toBe(false);
        });

        it('should auto-logout when token expires', () => {
            // Set token that expires in 1 second
            const expiringSoon = Date.now() + 1000;
            localStorageMock.setItem('authToken', 'expiring-token');
            localStorageMock.setItem('userId', '123');
            localStorageMock.setItem('authExpiry', expiringSoon.toString());

            const { result } = renderHook(() => useAuth());

            // Fast-forward time past expiration
            act(() => {
                jest.advanceTimersByTime(2000);
            });

            // Verify logout was called
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
            expect(mockReplace).toHaveBeenCalledWith('/');
        });
    });

    describe('Logout Functionality', () => {
        it('should clear all auth data from localStorage on logout', async () => {
            // Setup authenticated state
            localStorageMock.setItem('authToken', 'token-to-remove');
            localStorageMock.setItem('userId', '123');
            localStorageMock.setItem('userRole', 'USER');
            localStorageMock.setItem('QuestionnaireID', '1');
            localStorageMock.setItem('currentProjectId', '5');
            localStorageMock.setItem('responseId', '10');
            localStorageMock.setItem('authExpiry', Date.now().toString());

            // Mock fetch for logout API
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Logged out successfully' })
            });

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.handleLogout();
            });

            // Verify all items were removed
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('authExpiry');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('userId');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('userRole');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('QuestionnaireID');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentProjectId');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('responseId');
        });

        it('should redirect to home page after logout', async () => {
            localStorageMock.setItem('authToken', 'valid-token');

            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Success' })
            });

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.handleLogout();
            });

            expect(mockReplace).toHaveBeenCalledWith('/');
        });

        it('should handle logout API failure gracefully', async () => {
            localStorageMock.setItem('authToken', 'valid-token');

            // Mock API failure
            global.fetch = jest.fn().mockRejectedValueOnce(
                new Error('Network error')
            );

            const { result } = renderHook(() => useAuth());

            // Should still clear local storage even if API fails
            await act(async () => {
                await result.current.handleLogout();
            });

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
            expect(mockReplace).toHaveBeenCalledWith('/');
        });

        it('should not call logout API on automatic logout (token expiry)', async () => {
            const expiredTime = Date.now() - 1000;
            localStorageMock.setItem('authToken', 'expired-token');
            localStorageMock.setItem('authExpiry', expiredTime.toString());

            global.fetch = jest.fn();

            renderHook(() => useAuth());

            // Fast-forward to trigger auto-logout
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            // Verify API was NOT called (automatic logout)
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('Session Time Management', () => {
        it('should calculate correct remaining time', () => {
            const futureTime = Date.now() + 3600000; // 1 hour
            localStorageMock.setItem('authToken', 'valid-token');
            localStorageMock.setItem('authExpiry', futureTime.toString());

            const { result } = renderHook(() => useAuth());

            expect(result.current.timeUntilLogout).toBeTruthy();
            expect(result.current.timeUntilLogout).toMatch(/\d{2}:\d{2}:\d{2}/);
        });

        it('should return null for remaining time when not authenticated', () => {
            const { result } = renderHook(() => useAuth());

            expect(result.current.timeUntilLogout).toBeNull();
        });

        it('should update remaining time every second', () => {
            const futureTime = Date.now() + 10000; // 10 seconds
            localStorageMock.setItem('authToken', 'valid-token');
            localStorageMock.setItem('authExpiry', futureTime.toString());

            const { result } = renderHook(() => useAuth());

            const initialTime = result.current.timeUntilLogout;

            // Advance 1 second
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            const updatedTime = result.current.timeUntilLogout;

            expect(initialTime).not.toBe(updatedTime);
        });

        it('should show 0 remaining time when token is expired', () => {
            const pastTime = Date.now() - 5000;
            localStorageMock.setItem('authToken', 'expired-token');
            localStorageMock.setItem('authExpiry', pastTime.toString());

            const { result } = renderHook(() => useAuth());

            // After auto-logout, time should be null
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            expect(result.current.timeUntilLogout).toBeNull();
        });
    });

    describe('Logout State Management', () => {
        it('should set isLoggingOut flag during logout', async () => {
            localStorageMock.setItem('authToken', 'valid-token');

            global.fetch = jest.fn().mockImplementation(() => 
                new Promise(resolve => 
                    setTimeout(() => resolve({
                        ok: true,
                        json: async () => ({ message: 'Success' })
                    }), 100)
                )
            );

            const { result } = renderHook(() => useAuth());

            expect(result.current.isLoggingOut).toBe(false);

            // Start logout
            act(() => {
                result.current.handleLogout();
            });

            expect(result.current.isLoggingOut).toBe(true);

            // Wait for logout to complete
            await act(async () => {
                jest.advanceTimersByTime(200);
            });
        });

        it('should prevent duplicate logout calls', async () => {
            localStorageMock.setItem('authToken', 'valid-token');

            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ message: 'Success' })
            });

            const { result } = renderHook(() => useAuth());

            // Call logout twice rapidly
            await act(async () => {
                result.current.handleLogout();
                result.current.handleLogout();
            });

            // Should only call API once
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing authExpiry gracefully', () => {
            localStorageMock.setItem('authToken', 'token-without-expiry');
            // No authExpiry set

            const { result } = renderHook(() => useAuth());

            expect(result.current.timeUntilLogout).toBeNull();
        });

        it('should handle invalid authExpiry format', () => {
            localStorageMock.setItem('authToken', 'valid-token');
            localStorageMock.setItem('authExpiry', 'invalid-timestamp');

            const { result } = renderHook(() => useAuth());

            // Should handle gracefully without crashing
            expect(result.current.isAuthenticated).toBe(false); 
            expect(result.current.timeUntilLogout).toBeNull();
        });

        it('should cleanup timers on unmount', () => {
            const futureTime = Date.now() + 3600000;
            localStorageMock.setItem('authToken', 'valid-token');
            localStorageMock.setItem('authExpiry', futureTime.toString());

            const { unmount } = renderHook(() => useAuth());

            unmount();

            // No errors should occur after unmount
            act(() => {
                jest.advanceTimersByTime(5000);
            });
        });
    });
});
