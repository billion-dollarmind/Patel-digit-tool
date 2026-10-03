const UNLOCK_KEY = 'patel-admin-unlocked';
const ADMIN_PASSWORD = '6139Billion!';

export const isAdminUnlocked = () => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

export const unlockAdmin = (password: string) => {
  if (password !== ADMIN_PASSWORD) return false;
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
};

export const lockAdmin = () => {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
};
