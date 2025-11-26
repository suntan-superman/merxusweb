import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    restaurantName: '',
    address: '',
    phoneNumber: '',
    websiteUrl: '',
    cuisineType: '',
    description: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save to Firebase
    console.log('Form submitted:', formData);
    navigate('/dashboard');
  };

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-br from-primary-50 to-white min-h-screen">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Get Started with Merxus
          </h1>
          <p className="text-xl text-gray-700">
            Fill out your restaurant information to begin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Name *
            </label>
            <input
              type="text"
              id="restaurantName"
              name="restaurantName"
              required
              value={formData.restaurantName}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your restaurant name"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <input
              type="text"
              id="address"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your restaurant address"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Primary Line) *
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              className="input-field"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              id="websiteUrl"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleChange}
              className="input-field"
              placeholder="https://yourrestaurant.com"
            />
          </div>

          <div>
            <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 mb-2">
              Type of Cuisine *
            </label>
            <input
              type="text"
              id="cuisineType"
              name="cuisineType"
              required
              value={formData.cuisineType}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Italian, Mexican, American"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Description (1-2 sentences) *
            </label>
            <textarea
              id="description"
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="input-field"
              placeholder="A brief description of your restaurant for greeting personalization"
            />
          </div>

          <div className="pt-4">
            <button type="submit" className="btn-primary w-full text-lg py-3">
              Continue Setup
            </button>
            <p className="text-center text-sm text-gray-600 mt-4">
              By continuing, you agree to our 14-day free trial. Cancel anytime.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;

