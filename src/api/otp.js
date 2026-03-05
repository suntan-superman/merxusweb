import apiClient from './client';

export async function sendVerificationEmail({ email }) {
  const response = await apiClient.post('/auth/send-verification-email', { email });
  return response.data;
}

export async function verifyOtp({ email, otpCode }) {
  const response = await apiClient.post('/auth/verify-otp', { email, otpCode });
  return response.data;
}

export async function resendOtp({ email }) {
  const response = await apiClient.post('/auth/resend-otp', { email });
  return response.data;
}
