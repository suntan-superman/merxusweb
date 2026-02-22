import apiClient from "./client";

export const createProvisionalTenant = async (payload) => {
  const response = await apiClient.post("/instagram-onboarding/create-provisional-tenant", payload);
  return response.data;
};

export const sendVerificationLink = async (payload) => {
  const response = await apiClient.post("/instagram-onboarding/send-verification-link", payload);
  return response.data;
};

export const getVerificationStatus = async (tenantId) => {
  const response = await apiClient.get("/instagram-onboarding/verification-status", {
    params: { tenantId },
  });
  return response.data;
};
