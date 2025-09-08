import React, { createContext, useContext, useState, ReactNode, ComponentType } from 'react';

export interface NavigationScreen {
  id: string;
  title: string;
  component: ComponentType<any>;
  props?: any;
}

interface NavigationContextType {
  stack: NavigationScreen[];
  push: (screen: NavigationScreen) => void;
  pop: () => void;
  replace: (screen: NavigationScreen) => void;
  canGoBack: boolean;
  currentScreen: NavigationScreen | null;
  previousScreen: NavigationScreen | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  initialScreen?: NavigationScreen;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ 
  children, 
  initialScreen 
}) => {
  const [stack, setStack] = useState<NavigationScreen[]>(
    initialScreen ? [initialScreen] : []
  );

  const push = (screen: NavigationScreen) => {
    setStack(prev => [...prev, screen]);
  };

  const pop = () => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  };

  const replace = (screen: NavigationScreen) => {
    setStack(prev => [...prev.slice(0, -1), screen]);
  };

  const canGoBack = stack.length > 1;
  const currentScreen = stack[stack.length - 1] || null;
  const previousScreen = stack.length > 1 ? stack[stack.length - 2] : null;

  return (
    <NavigationContext.Provider
      value={{
        stack,
        push,
        pop,
        replace,
        canGoBack,
        currentScreen,
        previousScreen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};