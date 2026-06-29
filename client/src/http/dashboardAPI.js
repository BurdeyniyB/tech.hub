import { $authHost } from "./index";

export const getDashboardStats = async (period = "30d") => {
  const { data } = await $authHost.get(`/api/dashboard/stats?period=${period}`);
  return data;
};

export const adminAiChat = async (message, history, stats) => {
  const { data } = await $authHost.post("/api/ai/admin-chat", { message, history, stats });
  return data;
};
