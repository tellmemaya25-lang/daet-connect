'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      
      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        alert('Logout failed. Please try again.');
        setIsLoggingOut(false);
      }
    } catch (error) {
      alert('Logout error. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
