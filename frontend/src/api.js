import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/items';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAvailableItems = async (page = 1, limit = 20, filter = '') => {
  const response = await apiClient.get('/available', {
    params: { page, limit, filter },
  });
  return response.data;
};

export const getSelectedItems = async (page = 1, limit = 20, filter = '') => {
  const response = await apiClient.get('/selected', {
    params: { page, limit, filter },
  });
  return response.data;
};

export const queueNewItem = async (id) => {
  const response = await apiClient.post('/queue', { id });
  return response.data;
};

export const selectItem = async (id) => {
  const response = await apiClient.post('/select', { id });
  return response.data;
};

export const deselectItem = async (id) => {
  const response = await apiClient.post('/deselect', { id });
  return response.data;
};

export const moveItem = async (draggedItemId, targetItemId) => {
  const response = await apiClient.post('/move', { draggedItemId, targetItemId });
  return response.data;
};

export const subscribeToEvents = (onUpdate) => {
  const eventSource = new EventSource(`${API_BASE_URL}/events`);

  eventSource.onmessage = (event) => {
    try {
      const eventData = JSON.parse(event.data);
      onUpdate(eventData);
    } catch (error) {
      console.error('Failed to parse event data:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('EventSource failed:', error);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
};
