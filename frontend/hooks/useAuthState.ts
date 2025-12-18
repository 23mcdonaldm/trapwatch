import { useEffect, useState } from 'react';
import { storageService } from '../services/storage';
import { UserState } from '../types';

export const useAuthState = () => {
  const [userState, setUserState] = useState<UserState>(storageService.getUserState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storageService.initAuthListener((newState) => {
      setUserState(newState);
      setIsLoading(false);
    });
  }, []);

  return { userState, isLoading };
};

