import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CallHQModal from './CallHQModal';
import ThemeToggleButton from './common/ThemeToggleButton';
import SignOutButton from './common/SignOutButton';

const NavBar = () => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">Merxus AI</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <ThemeToggleButton compact />
            {!user && (
              <>
                <Link to="/features" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Features
                </Link>
                <Link to="/pricing" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Pricing
                </Link>
              </>
            )}
            {user ? (
              <>
                <Link to="/restaurant" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Dashboard
                </Link>
                <SignOutButton
                  navigateTo="/"
                  className="btn-secondary"
                >
                  Sign Out
                </SignOutButton>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link to="/onboarding" className="btn-primary">
                  Get Started
                </Link>
              </>
            )}
            {/* HQ Phone Button */}
            <CallHQModal />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggleButton compact />
            <CallHQModal />
            <button
              className="text-gray-700 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            {!user && (
              <>
                <Link
                  to="/features"
                  className="block text-gray-700 hover:text-primary-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  to="/pricing"
                  className="block text-gray-700 hover:text-primary-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
              </>
            )}
            {user ? (
              <>
                <Link
                  to="/restaurant"
                  className="block text-gray-700 hover:text-primary-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <SignOutButton
                  navigateTo="/"
                  onSignedOut={() => setIsMenuOpen(false)}
                  className="btn-secondary w-full"
                >
                  Sign Out
                </SignOutButton>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block text-gray-700 hover:text-primary-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/onboarding"
                  className="btn-primary block text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;

