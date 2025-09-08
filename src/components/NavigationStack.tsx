import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '../contexts/NavigationContext';
import { ScreenLayer } from './ScreenLayer';

export const NavigationStack: React.FC = () => {
  const { stack } = useNavigation();

  return (
    <View style={styles.container}>
      {stack.map((screen, index) => (
        <ScreenLayer
          key={`${screen.id}-${index}`}
          screen={screen}
          index={index}
          isTop={index === stack.length - 1}
          totalScreens={stack.length}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});