'use client';

import { useEffect, useState } from 'react';
import { authDestinationFromSearch } from './auth-navigation';

export function useAuthDestination(): string {
  const [destination, setDestination] = useState('/dashboard');
  useEffect(() => {
    setDestination(authDestinationFromSearch(window.location.search));
  }, []);
  return destination;
}
